# Dataset de pruebas de FoodHub

Reset completo de `foodhub-dev` y carga de un juego de datos reproducible para probar
las tres aplicaciones sin tener que dar de alta nada a mano.

```bash
pnpm db:seed -- --confirmar
# o, equivalente:
pnpm --filter @foodhub/api run seed -- --confirmar
```

Sin `--confirmar` el script no toca nada: informa contra qué proyecto apuntaría y sale.

---

## Qué borra

**Es destructivo y no se puede deshacer.** Antes de cargar nada:

1. `TRUNCATE ... CASCADE` sobre **todas** las tablas del esquema `public`.
2. Borra **todas** las cuentas de `auth.users` (GoTrue).
3. Vacía los buckets `perfiles`, `publicaciones`, `configuracion` y `mensajes`.

No toca el esquema `drizzle` (el historial de migraciones sigue intacto: la base queda
vacía pero migrada) ni el bucket `assets`.

Dos guardas lo protegen:

- aborta si `APP_ENV` no es `development`;
- exige el flag `--confirmar` de forma explícita.

## Qué carga

| Tabla                              |     Aprox. | Notas                                                        |
| ---------------------------------- | ---------: | ------------------------------------------------------------ |
| `usuario`                          |         27 | 15 cocineros, 6 clientes, 6 administradores. Todos `ACTIVA`. |
| `categoria`                        |         12 | 10 activas + 2 dadas de baja, con imagen.                    |
| `motivo_cancelacion`               |         11 | Repartidos entre cocinero, cliente y ambos.                  |
| `version_terminos`                 |          4 | Términos y privacidad, cada uno con una versión archivada.   |
| `publicacion`                      |        ~90 | 5 a 8 por cocinero, con foto propia en Storage.              |
| `pedido`                           |       ~750 | Todos cerrados. ~50 por cocinero, con varianza.              |
| `historial_estado_pedido`          |      ~2200 | La línea de tiempo completa de cada pedido.                  |
| `resena`                           |       ~300 | Por plato, solo de pedidos completados.                      |
| `calificacion_cocinero`            |        ~60 | Del cocinero hacia el cliente, una por par.                  |
| `conversacion` / `mensaje`         | ~55 / ~250 | Chats con no leídos coherentes y alguna imagen.              |
| `favorito_*`                       |       ~120 | Cocineros y platos, sesgados por lo que ya probó.            |
| `ticket_soporte`                   |         10 | En los tres estados, tres con adjunto.                       |
| `capitulo_ayuda` / `seccion_ayuda` |    10 / 30 | Manual completo por rol.                                     |
| `faq`                              |         19 | Las 11 de la migración 0002 más ocho nuevas.                 |
| `notificacion`                     |      ~1600 | Últimos 60 días, con leídas y sin leer.                      |
| `registro_auditoria`               |       ~250 | Derivado de lo que la seed creó, no inventado.               |
| `evento_seguridad`                 |         63 | Logins fallidos y accesos denegados.                         |

Las cantidades exactas varían con la semilla del generador, pero con la semilla por
defecto **son siempre las mismas**.

## Credenciales

Todas las cuentas usan la contraseña **`Test1234`**.

Los administradores son las cuentas reales del Grupo 21 (`datos/usuarios.ts`); los
cocineros y clientes son personas ficticias con la convención `nombre.apellido@gmail.com`.

## Decisiones que conviene conocer

**Es determinista.** Un generador con semilla fija (`lib/aleatorio.ts`) reemplaza a
`Math.random()`: dos corridas producen exactamente la misma base. Es lo que permite que
una captura de la Etapa 6 se pueda reproducir y que un bug que aparece con ciertos datos
se pueda volver a provocar. `--semilla=<n>` genera otro dataset, igual de reproducible.

**La ventana de datos es fija**, del 2026-03-01 al 2026-08-29 (`lib/tiempo.ts`), con más
densidad en los últimos 30 días. Si la fecha real se aleja mucho de ese corte, los filtros
"hoy" y "últimos 7 días" del dashboard empiezan a devolver vacío: actualizá `FIN_VENTANA`.

**Todos los pedidos están cerrados.** No queda ninguno en `CREADO`, `ACEPTADO` ni `LISTO`,
así que las bandejas de pendientes arrancan vacías a propósito. Los cuatro desenlaces se
distinguen así, porque el enum `estado_pedido` no tiene "cancelado" ni "expirado":

| Desenlace              | `estado_pedido_actual` | `origen_rechazo` | Motivo           |
| ---------------------- | ---------------------- | ---------------- | ---------------- |
| Completado             | `COMPLETADO`           | —                | —                |
| Rechazado por cocinero | `RECHAZADO`            | `COCINERO`       | catálogo o texto |
| Cancelado por cliente  | `RECHAZADO`            | `CLIENTE`        | catálogo o vacío |
| Tiempo agotado         | `RECHAZADO`            | `SISTEMA`        | ninguno          |

**Cada cocinero tiene su propia mezcla** de esos desenlaces y su propia tendencia de
reputación (`datos/usuarios.ts`). Va de uno que completa el 84 % y junta cincos a otro que
completa el 61 % y reparte estrellas. Sin esa dispersión, el ranking del panel y los
filtros por valoración ordenarían ruido.

**Las imágenes se suben de verdad a Storage**, con las mismas rutas que arma
`almacenamiento.service.ts` (`{bucket}/{id}/{archivo}`). Apuntar a una URL externa habría
sido más rápido pero no ejercitaría buckets, permisos ni el CDN.

**Las reseñas respetan la regla de negocio**: solo puede reseñar quien recibió ese plato en
un pedido completado, y hay una sola reseña por par (cliente, plato). El módulo de reseñas
todavía no tiene endpoints de escritura en la API, así que estos datos ejercitan el lado de
lectura: el promedio del perfil público, el filtro por valoración del feed y el dashboard.

**Los términos se re-aceptan al sembrar.** `calcularDebeAceptarTerminos` compara la fecha
de aceptación del usuario contra la publicación vigente más reciente y, si es anterior,
`GateDeSesion` bloquea toda la app. El paso 4 deja a las 27 cuentas aceptando la versión
vigente para que nadie quede atrapado en esa pantalla. Para probarla, publicá una versión
nueva desde PAN-ADM-04.

## Puntos abiertos

- **Adjuntos de tickets.** `adjunto_ticket` guarda una URL, pero la API todavía no tiene
  endpoint de carga para ese caso ni bucket asignado. La seed los sube a
  `configuracion/tickets/{ticketId}/`. Es una decisión de la seed: cuando se implemente la
  subida de US-AYU-05, alineá esa ruta con la que defina `almacenamiento.service.ts`.
- **Tokens push falsos.** `dispositivo_push` tiene el formato de un Expo Push Token pero
  Expo los rechaza con `DeviceNotRegistered`. Un script no puede registrar el token de un
  teléfono real.
- **`resena.foto_url` queda en `null`**: la API no expone subida de fotos de reseña.
- **Sin carritos activos ni publicaciones eliminadas por administrador**, por decisión del
  equipo.

## Estructura

```
seed/
  index.ts             orquestador: los 13 pasos, en orden de dependencias
  datos/               contenido del dataset (personas, platos, textos, legales)
  pasos/               un archivo por paso, todos escriben sobre el mismo contexto
  lib/                 generador determinista, fechas, geo, Storage, contexto
  imagenes/            53 fotos + 27 avatares, con CREDITOS.md
```

El orden de los pasos no es negociable: catálogo antes que publicaciones, usuarios antes
que legales, pedidos antes que reseñas, reseñas antes que moderación.

No hay una transacción global. Las cuentas de GoTrue se crean por HTTP y no participan de
la transacción de PostgreSQL: un rollback dejaría credenciales sin perfil. Ante un fallo,
la reparación es volver a correr el script entero, que empieza borrando todo.

## Créditos de las imágenes

Ver [`imagenes/CREDITOS.md`](./imagenes/CREDITOS.md). Las fotos de platos y categorías son
de Wikimedia Commons (CC BY, CC BY-SA y CC0) y los avatares de DiceBear (CC0). Las
licencias CC BY y CC BY-SA exigen atribución: no borres ese archivo.
