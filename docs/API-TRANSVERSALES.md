# Contrato de la API · Módulos transversales

Superficie HTTP de los tres módulos transversales: autenticación (AUT), gestión
de usuarios (GURP) y auditoría (AUD). Es el contrato al que se atienen la API,
la app móvil y el panel de administración; si cambia algo acá, cambia en los
tres a la vez.

Prefijo: `/api/v1`. Todos los schemas citados viven en `@foodhub/shared`.

---

## Cómo se autentica cada request

El login y el registro de credenciales los resuelve **Supabase Auth**. La API
solo verifica el JWT contra el JWKS público de Supabase y carga el perfil desde
`usuario` (`auth.middleware.ts`). El encabezado es siempre:

```
Authorization: Bearer <access_token de Supabase>
```

El estado de la cuenta se revisa **en cada request**, no solo al iniciar
sesión: un JWT emitido antes de una suspensión sigue siendo criptográficamente
válido hasta que expire.

| Situación                          | Respuesta                                                  |
| ---------------------------------- | ---------------------------------------------------------- |
| sin token en ruta protegida        | `401 SIN_TOKEN`                                            |
| firma inválida o expirado          | `401 TOKEN_INVALIDO`                                       |
| token válido sin fila en `usuario` | `401 PERFIL_INEXISTENTE`                                   |
| `estado_cuenta = SUSPENDIDA`       | `403 CUENTA_SUSPENDIDA` · `MENSAJES_AUTH.cuentaSuspendida` |
| `estado_cuenta = ELIMINADA`        | `403 CUENTA_ELIMINADA` · `MENSAJES_AUTH.cuentaEliminada`   |
| rol insuficiente                   | `403 ROL_INSUFICIENTE` + fila en `evento_seguridad`        |

## Forma de las respuestas

Éxito: el recurso pelado, o `{ datos, total, pagina, porPagina }` si es una
lista paginada.

Error: siempre `{ error: { codigo, mensaje, campos? } }`, con `campos` solo en
los errores de validación de zod. El `mensaje` es el texto que se le muestra al
usuario; nunca lleva detalle técnico.

---

## Autenticación · `/auth`

### `POST /auth/registro/cliente` — US-AUT-01 · PAN-AUT-01

Público. Body: `registroClienteSchema`.

La API crea la cuenta en GoTrue **y** la fila en `usuario` en una sola
operación, usando la service role key. Se hace así, y no con un `signUp` desde
el cliente, para que no pueda quedar una cuenta de autenticación sin perfil, y
para que el alta quede auditada del lado del servidor.

| Resultado            | Respuesta                                                       |
| -------------------- | --------------------------------------------------------------- |
| creado               | `201` con `perfilUsuarioSchema`                                 |
| correo ya registrado | `409 CORREO_DUPLICADO` · `MENSAJES_AUTH.correoDuplicadoCliente` |

Después del `201`, el cliente hace `signInWithPassword` con las mismas
credenciales: el criterio de aceptación exige que el registro **inicie sesión
automáticamente** y lleve al feed.

### `POST /auth/registro/cocinero` — US-AUT-02 · PAN-AUT-02

Público. Body: `registroCocineroSchema`. Además del perfil, inserta la fila en
`cocinero` y el punto en `usuario.ubicacion`.

> Al persistir la ubicación, PostGIS ordena el punto como **(x = lng, y = lat)**.
> Invertirlos ubica al cocinero en otro continente sin que falle ninguna
> validación.

| Resultado            | Respuesta                                                        |
| -------------------- | ---------------------------------------------------------------- |
| creado               | `201` con `perfilUsuarioSchema`                                  |
| correo ya registrado | `409 CORREO_DUPLICADO` · `MENSAJES_AUTH.correoDuplicadoCocinero` |

El mensaje de correo duplicado es **distinto** al de US-AUT-01. Así está en el
documento; no unificarlos.

### `POST /auth/recuperacion` — US-AUT-04 · PAN-AUT-04

Público, con rate limit propio más estricto que el global. Body:
`solicitarRecuperacionSchema`.

| Resultado           | Respuesta                                                                                       |
| ------------------- | ----------------------------------------------------------------------------------------------- |
| el correo existe    | `200 { mensaje: MENSAJES_AUTH.enlaceRecuperacionEnviado }` y se dispara `resetPasswordForEmail` |
| el correo no existe | `404 CORREO_NO_REGISTRADO` · `MENSAJES_AUTH.correoNoRegistrado`                                 |

> **Decisión consciente del equipo.** Este endpoint revela si un correo tiene
> cuenta, lo que habilita enumerar usuarios registrados. Se implementa así
> porque es el criterio de aceptación textual de US-AUT-04. La mitigación es el
> rate limit y el registro de cada consulta.

### Login y cierre de sesión — US-AUT-03 y US-AUT-05

**No tienen endpoint.** El cliente llama a `signInWithPassword` y `signOut` del
SDK de Supabase. La API solo participa después, verificando el token. Si el
login falla, el cliente lo reporta a `/seguridad/login-fallido`.

---

## Usuarios · `/usuarios`

### Perfil propio — PAN-GURP-01

Todos requieren sesión. Operan **siempre** sobre `req.usuario.id`: no reciben
un id por parámetro, así que no existe la posibilidad de tocar el perfil ajeno
cambiando un número en la URL.

| Método   | Ruta                    | US         | Body                         | Notas                                                                            |
| -------- | ----------------------- | ---------- | ---------------------------- | -------------------------------------------------------------------------------- |
| `GET`    | `/usuarios/yo`          | US-GURP-01 | —                            | `perfilUsuarioSchema`. Si es cocinero incluye `descripcionPublica` y `ubicacion` |
| `PATCH`  | `/usuarios/yo`          | US-GURP-02 | `editarPerfilSchema`         | Edición parcial. `descripcionPublica` y `ubicacion` solo para cocinero           |
| `POST`   | `/usuarios/yo/password` | US-GURP-03 | `cambiarPasswordSchema`      | Reautentica con la contraseña actual antes de cambiarla                          |
| `DELETE` | `/usuarios/yo`          | US-GURP-04 | `eliminarCuentaPropiaSchema` | Baja **lógica**: `estado_cuenta = ELIMINADA` y revocación de sesiones            |

`POST /usuarios/yo/password` responde `400 PASSWORD_ACTUAL_INCORRECTA` con
`MENSAJES_USUARIO.contrasenaActualIncorrecta` si la reautenticación falla.

La baja nunca borra la fila: los pedidos, reseñas y conversaciones históricas
tienen que seguir siendo legibles.

### Panel de administración — PAN-ADM-01

Todos exigen rol `ADMINISTRADOR` (`soloAdministrador`).

| Método   | Ruta                       | US         | Body / query                                          |
| -------- | -------------------------- | ---------- | ----------------------------------------------------- |
| `GET`    | `/usuarios`                | US-GURP-05 | query `filtrosUsuarioSchema` → `paginaUsuariosSchema` |
| `GET`    | `/usuarios/:id`            | US-GURP-05 | — → `perfilUsuarioSchema`                             |
| `POST`   | `/usuarios`                | US-GURP-06 | `crearUsuarioPanelSchema`                             |
| `PATCH`  | `/usuarios/:id`            | US-GURP-07 | `editarUsuarioPanelSchema`                            |
| `POST`   | `/usuarios/:id/suspension` | US-GURP-08 | `suspenderUsuarioSchema`                              |
| `DELETE` | `/usuarios/:id/suspension` | US-GURP-08 | — (rehabilita)                                        |
| `DELETE` | `/usuarios/:id`            | US-GURP-09 | `eliminarUsuarioPanelSchema`                          |

**El alta es por invitación.** `POST /usuarios` usa `inviteUserByEmail`: la
cuenta se crea sin contraseña y el usuario define la suya desde el enlace que
recibe por correo. El administrador nunca conoce una credencial ajena. Los
roles admitidos son `CLIENTE` y `ADMINISTRADOR`; el cocinero se registra desde
la app porque necesita la ubicación que detecta el GPS.

**Salvaguarda del último administrador.** `PATCH /usuarios/:id` y
`DELETE /usuarios/:id` verifican, dentro de la misma transacción que escribe,
que quede al menos un `ADMINISTRADOR` con `estado_cuenta = ACTIVA`. Si no,
`409 ULTIMO_ADMINISTRADOR` con `MENSAJES_USUARIO.ultimoAdministrador`.
Comprobarlo fuera de la transacción deja una ventana en la que dos
administradores se dan de baja mutuamente al mismo tiempo.

---

## Auditoría · `/auditoria`

Todo el módulo exige rol `ADMINISTRADOR`.

| Método | Ruta                            | US        | Query                                                          |
| ------ | ------------------------------- | --------- | -------------------------------------------------------------- |
| `GET`  | `/auditoria`                    | US-AUD-02 | `filtrosAuditoriaSchema` → `paginaAuditoriaSchema`             |
| `GET`  | `/auditoria/exportar`           | US-AUD-02 | mismos filtros → `text/csv`                                    |
| `GET`  | `/auditoria/seguridad`          | US-AUD-01 | `filtrosEventoSeguridadSchema` → `paginaEventoSeguridadSchema` |
| `GET`  | `/auditoria/seguridad/exportar` | US-AUD-01 | mismos filtros → `text/csv`                                    |

Orden por `fecha_hora` descendente siempre. Página de 20 o 50, nada más.

### `POST /seguridad/login-fallido` — US-AUD-01

Público, con rate limit estricto. Body: `reportarLoginFallidoSchema`.
Responde `204` siempre, incluso si la escritura falla: es un reporte, no una
operación de la que dependa el usuario.

Solo acepta el correo intentado. **La IP y la fecha las pone el servidor**: si
el cliente pudiera informarlas, el registro dejaría de ser evidencia.

### El servicio de auditoría — RF097

`auditoria.service.ts` expone `registrarOperacion()` y lo invocan los servicios
que hacen altas, bajas y modificaciones. Es deliberadamente **fire and forget**:
si la escritura de auditoría falla se loguea el problema, pero no se altera la
respuesta al usuario. Un fallo del registro no puede convertir un `200` en un
`500`.

Operaciones auditadas en este alcance:

| Operación      | `tipo_objeto` | Origen                                                       |
| -------------- | ------------- | ------------------------------------------------------------ |
| `ALTA`         | `usuario`     | registro de cliente y cocinero, alta desde el panel          |
| `MODIFICACION` | `usuario`     | edición de perfil, cambio de rol, suspensión, rehabilitación |
| `BAJA`         | `usuario`     | baja de la cuenta propia y baja desde el panel               |

El cambio de contraseña se audita como `MODIFICACION` **sin** guardar ningún
valor de la credencial en `datos_adicionales`, ni el viejo ni el nuevo.
