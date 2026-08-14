# Capítulo 03 · Módulos transversales

Alcance 2.2.2.2.1 · Historias en 2.2.1.3.1, 2.2.1.3.12 y 2.2.1.3.13.

---

## AUT · Autenticación y control de acceso

### Cómo funciona (decisión de la Etapa 6)

La autenticación la resuelve **Supabase Auth (GoTrue)**. La API **solo verifica**
el JWT; no lo emite ni lo guarda.

```
1. La app o el panel se autentican DIRECTO contra Supabase con el SDK
2. Supabase devuelve un JWT firmado con su clave privada
3. El cliente lo manda en  Authorization: Bearer <token>
4. La API verifica la firma contra el JWKS público de Supabase
   y carga el perfil desde la tabla `usuario`
```

Implementación: `apps/api/src/middleware/auth.middleware.ts`.

### Historias y criterios que se verifican palabra por palabra

**US-AUT-01 · Registro de cliente** — PAN-AUT-01

Campos: nombre*, apellido*, correo*, contraseña*, confirmar contraseña*, foto de
perfil (JPG/PNG/WEBP, máx. 5 MB, opcional), checkbox de términos*.

| Situación             | Comportamiento exigido                                         |
| --------------------- | -------------------------------------------------------------- |
| correo ya registrado  | `Este correo ya esta registrado` y no permite continuar        |
| contraseñas distintas | `Las contraseñas no coinciden.` y botón deshabilitado          |
| términos sin aceptar  | botón "Registrarme" deshabilitado                              |
| todo correcto         | crea la cuenta, **inicia sesión automáticamente** y va al feed |

**US-AUT-02 · Registro de cocinero** — PAN-AUT-02

Agrega **ubicación** (obligatoria, detectada por GPS y ajustable sobre el mapa) y
**descripción del perfil** (opcional, máx. 500 caracteres, visible en el perfil
público). Al completar, va a "Mis publicaciones" (PAN-PUB-01).

La ubicación es obligatoria solo para el cocinero: es lo que lo posiciona en el
feed por cercanía (US-EXP-01), en el mapa (US-EXP-02) y en el filtro por
distancia (US-EXP-03). Lo garantiza el CHECK `usuario_cocinero_con_ubicacion`.

Nota: el mensaje de correo duplicado es distinto al de US-AUT-01:
`Ya existe una cuenta registrada con este correo electrónico.`

**US-AUT-03 · Inicio de sesión** — PAN-AUT-03

| Situación              | Comportamiento exigido                                                                 |
| ---------------------- | -------------------------------------------------------------------------------------- |
| credenciales inválidas | `Correo electrónico o contraseña ingresados son incorrectos.` **sin decir cuál falló** |
| login correcto         | genera token, mantiene la sesión y va a la pantalla del rol                            |
| cuenta suspendida      | `Tu cuenta se encuentra suspendida. Contactá al soporte.`                              |
| sesión expirada        | vuelve a pedir credenciales antes de una pantalla protegida                            |

> El estado de la cuenta se verifica **en cada request**, no solo al iniciar
> sesión: si un administrador suspende a alguien, su JWT sigue siendo
> criptográficamente válido hasta que expire.

**US-AUT-04 · Recuperación de contraseña** — PAN-AUT-04

Enlace por correo. Mensajes exigidos:
`Te enviamos un enlace para restablecer tu contraseña.` ·
`No existe una cuenta asociada a ese correo electrónico.` ·
`Las contraseñas no coinciden.`

**US-AUT-05 · Cierre de sesión** — elimina los tokens del dispositivo.

Los schemas de validación están en `packages/shared/src/schemas/auth.schema.ts`
y los usan **los dos extremos**: la API y los formularios.

---

## GURP · Gestión de usuarios, roles y permisos

Diez historias en dos grupos:

| Perfil propio (usuario final) | Panel de administración          |
| ----------------------------- | -------------------------------- |
| US-GURP-01 ver perfil         | US-GURP-05 listar y buscar       |
| US-GURP-02 editar perfil      | US-GURP-06 crear usuario         |
| US-GURP-03 cambiar contraseña | US-GURP-07 editar usuario y rol  |
| US-GURP-04 eliminar cuenta    | US-GURP-08 suspender/rehabilitar |
|                               | US-GURP-09 eliminar usuario      |
|                               | US-GURP-10 permisos por rol      |

Pantallas: PAN-GURP-01 (Mi perfil), PAN-ADM-01 (Gestión de usuarios).

**Cuenta eliminada ≠ fila borrada.** `estado_cuenta = 'ELIMINADA'`. Los pedidos,
reseñas y conversaciones históricas siguen existiendo; la conversación pasa a
`bloqueada_por_baja`.

---

## Seguridad

No tiene historias propias: es una condición transversal, verificable en cada
implementación.

| Requisito                     | Dónde está implementado                                      |
| ----------------------------- | ------------------------------------------------------------ |
| Validación de datos           | schemas de zod en `@foodhub/shared`, aplicados en la API     |
| Control de acceso por rol     | `requiereRol()` en `rbac.middleware.ts`                      |
| Contraseñas cifradas          | Supabase Auth (bcrypt)                                       |
| HTTPS                         | terminación TLS en Railway y Supabase                        |
| Errores sin detalle técnico   | `manejadorErrores` en `error.middleware.ts`                  |
| Credenciales fuera del código | variables de entorno validadas al arrancar (`config/env.ts`) |
| Rate limiting                 | `express-rate-limit` en `app.ts`                             |
| Encabezados de seguridad      | `helmet` en `app.ts`                                         |

**Regla:** toda validación que exista en el formulario tiene que existir también
en el servidor. El cliente valida para dar buena experiencia; el servidor valida
porque es lo único que no se puede saltear.

---

## AUD · Auditoría y trazabilidad

Dos tablas con responsabilidades separadas:

| Tabla                | Qué registra                             | Historia  |
| -------------------- | ---------------------------------------- | --------- |
| `evento_seguridad`   | login fallido, acceso denegado por rol   | US-AUD-01 |
| `registro_auditoria` | altas, bajas y modificaciones de negocio | US-AUD-02 |

Mantenerlas separadas evita una tabla con la mitad de las columnas siempre nulas
y permite políticas de retención distintas.

### US-AUD-01 · Registro de intentos no autorizados

Dos criterios, dos orígenes de escritura:

1. **Login fallido** → Auth Hook de Supabase (el login no pasa por la API).
2. **Acceso sin permisos** → middleware `requiereRol` de la API, que registra
   usuario, fecha, hora y **recurso solicitado**.

El registro del intento denegado se hace en un único punto y no en cada handler:
si dependiera de que cada endpoint se acuerde, la auditoría tendría huecos.

Es "fire and forget": si la escritura de auditoría falla, se loguea el problema
pero **no** se altera la respuesta. Un fallo del registro no puede convertir un
403 en un 500, ni mucho menos dejar pasar el acceso.

### US-AUD-02 · Visualizar registros de auditoría — PAN-AUD-01

- Orden por fecha descendente por defecto.
- Colores por operación: Alta verde, Baja roja, Modificación azul o amarilla.
- Filtros en tiempo real: rango de fechas, tipo de operación, IP, ID de usuario.
- Paginación de 20 o 50 por página, manteniendo los filtros.
- Estado vacío: `No se encontraron registros de auditoría con los filtros
seleccionados.` + botón para limpiar filtros.
- Clic en una fila → modal con el detalle completo y los datos adicionales
  estructurados.
