# Correos de autenticación

Los correos de Supabase Auth se configuran **en el dashboard del proyecto**, no
en el código: Supabase no expone las plantillas por API ni por migración. El HTML
se mantiene versionado en `Proyecto Final/Resources/assets/` y de ahí se copia y
pega al dashboard a mano.

Este documento explica qué hay que aplicar y por qué, para que el contenido sea
revisable y para que los dos ambientes (`foodhub-dev` y `foodhub-prod`) no se
desalineen sin que nadie lo note. **Todo lo de acá va en los dos.**

---

## Por qué el correo tiene que decir desde dónde abrir el enlace

El enlace de recuperación de un CLIENTE o un COCINERO apunta a
`foodhub://nueva-password`, un deep link al esquema de la aplicación
(`URL_RECUPERACION_PASSWORD`). Esto no es una decisión revisable: el alcance del
proyecto define la app móvil como la única interfaz de esos dos roles, y el panel
web como _"destinado exclusivamente a las tareas de administración"_. El
formulario de contraseña nueva vive dentro de la app porque es el único lugar
donde ese usuario puede estar.

La consecuencia es que **abierto en una computadora, el enlace no hace nada**.
El navegador de escritorio no tiene ningún programa registrado para el esquema
`foodhub://`, así que recibe la redirección de GoTrue y se queda quieto. No es un
defecto del código: es el comportamiento esperado de un deep link fuera de su
plataforma.

Como el correo llega a una casilla que la gente abre indistintamente en el
teléfono y en la computadora, el texto tiene que aclararlo. Es la corrección más
barata y la única que no amplía el alcance.

**Y hay un costo real en no aclararlo:** el token del enlace es de un solo uso y
se consume en el paso del `/auth/v1/verify`, _antes_ de intentar abrir la app.
Alguien que prueba desde la computadora quema el enlace, y cuando después lo
abre desde el teléfono se encuentra con "este enlace ya no es válido" sin haber
hecho nada mal.

---

## Las dos plantillas y dónde viven

Supabase tiene una plantilla **por tipo de correo**, no por rol. Este flujo usa
dos, y las dos están versionadas como archivo en
`Proyecto Final/Resources/assets/`:

| Plantilla de Supabase | Archivo                                 | La dispara                            |
| --------------------- | --------------------------------------- | ------------------------------------- |
| **Reset Password**    | `foodhub-recuperar-password-email.html` | `POST /auth/recuperacion` (US-AUT-04) |
| **Invite user**       | `foodhub-invitacion-email.html`         | alta desde el panel (US-GURP-06)      |

Cada una tiene su asunto en el `.txt` de al lado. Se pegan enteras en
_Authentication → Emails → Templates_, en **los dos proyectos**.

Dentro de cada plantilla sí conviven los roles: la de recuperación la reciben
por igual el cliente, el cocinero y el administrador, y la de invitación el
cliente y el administrador. Como el destino del enlace cambia según el rol y la
plantilla no puede saber cuál lo está leyendo, **el texto cubre los dos casos**
en lugar de suponer uno. Ese es el bloque gris debajo del botón:

```
Abrí este correo desde tu teléfono, con FoodHub instalado: el botón abre la
aplicación. Desde una computadora no va a funcionar.

Si administrás la plataforma, el enlace te lleva al panel web y podés abrirlo
desde la computadora.
```

Los colores salen de la guía visual (`--color-text-secondary: #57514c`,
`--color-primary: #ec6829`, `--color-background: #fafaf7`). En un correo van
escritos literalmente porque ningún cliente de correo resuelve variables CSS.

> El isotipo se sirve desde el bucket público `assets` del proyecto de Supabase.
> Un correo no puede llevar imágenes embebidas del repositorio: si esa URL
> cambia o el bucket deja de ser público, el correo llega sin logo.

---

## Desactivar el rastreo de clics

**Importante y fácil de pasar por alto.** Si el proveedor de correo envuelve los
enlaces para contar clics —se reconoce porque el `href` deja de apuntar a
`supabase.co` y pasa por un dominio del proveedor—, cualquier visita automática a
ese enlace consume el token antes de que el usuario toque nada. Los escáneres de
seguridad de correo, los antivirus y algunos clientes corporativos hacen
exactamente eso.

El síntoma es un enlace que llega vencido sin que nadie lo haya usado.

Hay que **desactivar el click tracking (y el open tracking) para los correos
transaccionales de autenticación** en el panel del proveedor SMTP configurado en
_Authentication → Emails → SMTP Settings_.

---

## Lista blanca de Redirect URLs

GoTrue descarta **en silencio** cualquier `redirectTo` que no esté declarado en
_Authentication → URL Configuration → Redirect URLs_, y usa la Site URL en su
lugar: el correo se envía igual y el enlace lleva a cualquier otro lado. Es el
modo de falla más difícil de diagnosticar de todo este flujo.

Tienen que estar declaradas las dos:

| URL                                  | Quién la recibe                |
| ------------------------------------ | ------------------------------ |
| `foodhub://nueva-password`           | CLIENTE y COCINERO (app móvil) |
| `<dominio del panel>/nueva-password` | ADMINISTRADOR (panel web)      |

En producción la segunda tiene que ser el dominio real del panel desplegado, no
`localhost:5173`.

En **desarrollo** la segunda es `http://localhost:5173/nueva-password`, que es
el puerto que fija `apps/admin/vite.config.ts` con `strictPort: true` — o sea,
no se mueve solo si está ocupado. Tiene que coincidir carácter por carácter con
`URL_INVITACION_PANEL` del `.env`: GoTrue compara la URL completa.

> Cada valor cubre **los dos correos** de ese rol, el de recuperación y el de
> invitación, porque los dos apuntan a la misma pantalla. No hacen falta cuatro
> entradas.
