# Pendiente: lo que quedó fuera del módulo de Reseñas y Calificaciones (RES)

## Contexto

El núcleo del módulo se implementó en la rama `feature/Reseña_calificaciones`:
**US-RES-01** (reseñar un plato), **US-RES-02** (calificar al cliente) y
**US-RES-03** (ver reseñas y promedio), con la corrección de **RF031** sobre
PAN-PED-06.

Quedaron ocho cosas afuera. Este documento existe para que no se pierdan y para
que quede claro que **son decisiones, no olvidos** — mismo criterio que
`PENDIENTE_DASHBOARD_COCINERO.md`.

> **La fuente de verdad del módulo es la _versión corregida_ que reemplaza las
> secciones 2.2.1.2.11 y 2.2.1.3.11** (RF080–RF086). La maquetación de la
> Etapa 5 y la skill `foodhub` son anteriores al cambio de modelo del
> 2026-08-18 y dicen que la reseña es por pedido: **está desactualizado**. Hoy
> la reseña es **por plato**.

---

## 1. La foto de la reseña — RF080

**Estado:** sin resolver. Decisión pendiente del equipo.

RF080 lista cuatro campos en el formulario de reseña. Tres están:

| Campo                           | Estado |
| ------------------------------- | ------ |
| Calificación 1–5 (obligatorio)  | ✅     |
| Comentario, máx. 500 (opcional) | ✅     |
| Tags positivos (opcional)       | ✅     |
| **Foto del plato, máx. 5 MB**   | ❌     |

**Por qué no se hizo.** Las imágenes nunca pasan por la API: el dispositivo las
sube directo a Supabase Storage con una URL firmada que emite el backend
(punto 1.3.1.11). Hoy existen tres endpoints que firman esa URL y **ninguno
sirve para un CLIENTE que quiere adjuntar la foto de una reseña**:

```
/almacenamiento/foto-perfil        cualquier usuario autenticado
/almacenamiento/foto-plato         solo COCINERO   ← un cliente no puede usarlo
/almacenamiento/imagen-categoria   solo ADMINISTRADOR
```

**Qué falta decidir, y por qué es del equipo y no del código:** en qué bucket se
guardan. Los buckets **se crean a mano** desde el panel de Supabase; la API no
los crea (ver `docs/API-TRANSVERSALES.md`). Si se elige uno nuevo, hay que
crearlo en `foodhub-dev` **y** en `foodhub-prod` antes del primer despliegue, o
la subida falla en silencio.

| Opción                 | A favor                                     | En contra                                   |
| ---------------------- | ------------------------------------------- | ------------------------------------------- |
| Bucket nuevo `resenas` | no mezcla fotos de clientes con el catálogo | hay que crearlo a mano en los dos ambientes |
| Reusar `publicaciones` | cero configuración                          | mezcla fotos de cocineros y de clientes     |
| Reusar `perfiles`      | cero configuración, ya es público           | el nombre deja de describir lo que guarda   |

**Qué queda listo igual:** el contrato ya acepta `fotoUrl`, la tarjeta del
listado la dibuja si existe, el resumen cuenta cuántas reseñas la traen y el
filtro "Solo reseñas con foto" funciona. Falta únicamente **poder subirla**.

---

## 2. US-RES-04, US-RES-05 y US-RES-06 — el segundo PR

**Estado:** no iniciadas, por acuerdo de alcance.

| Historia  | Qué                             |
| --------- | ------------------------------- |
| US-RES-04 | reaccionar a una reseña         |
| US-RES-05 | responder una reseña (cocinero) |
| US-RES-06 | reportar una reseña inapropiada |

Las tres tablas ya existen en el schema (`reaccion_resena`,
`respuesta_cocinero`, `reporte_resena`), así que **no hacen falta migraciones**.
El router `resenas.router.ts` está preparado para sumar sus rutas.

De US-RES-06 se acordó que el segundo PR incluye **solo el reporte desde la
app**; la bandeja de moderación del administrador (RF086, PAN-ADM-02) va con el
módulo ADM.

---

## 3. Dos filtros de US-RES-03 que dependen de las anteriores

**Estado:** omitidos a propósito.

El tercer criterio de US-RES-03 enumera cuatro órdenes y tres filtros. Faltan
dos:

- **Ordenar por "Más útiles"** — ordena por cantidad de reacciones (US-RES-04)
- **Filtrar "Solo reseñas con respuesta del cocinero"** — depende de US-RES-05

Se omiten en lugar de mostrarse deshabilitados: una opción de orden que siempre
devuelve lo mismo es peor que no ofrecerla. Se agregan junto con las historias
de las que dependen.

---

## 4. RF038 — notificar al cocinero por una reseña nueva

**Estado:** no iniciado. Depende del módulo NOT, que no existe.

Es la misma situación, y por el mismo motivo, que
`PENDIENTE_NOTIFICACIONES_DE_PEDIDO.md` y
`PENDIENTE_NOTIFICACIONES_COCINEROS_FAVORITOS.md`.

La corrección del módulo agrega además una regla propia que hay que respetar
cuando se implemente:

> El sistema notifica al cocinero en la **creación** de la reseña y en la
> **edición que modifica la calificación en estrellas**. NO notifica cuando la
> edición afecta únicamente el comentario, los tags o la foto adjunta.

El valor `RESENA_RECIBIDA` ya existe en `TIPO_NOTIFICACION`: no hace falta
migración de enum.

---

## 5. RF019 — el listado de reseñas en el detalle del plato

**Estado:** fuera de este PR, por decisión del equipo (2026-08-23).

La corrección de RF019 pide dos cosas sobre PAN-EXP-05. Una está y la otra no:

- ✅ el promedio del plato sale de las reseñas `VISIBLE` de esa publicación
- ❌ el detalle **no** incorpora todavía el listado de reseñas del plato

Se difirió para no mezclar en el mismo PR una pantalla de Exploración que ya
estaba mergeada. El endpoint que lo alimentaría es el mismo que ya usa el perfil
público, filtrando por publicación.

---

## 6. El layout no se contrastó contra la maquetación

**Estado:** las pantallas están codificadas; falta la validación visual.

Y hay un motivo particular en este módulo: **la maquetación de la Etapa 5 es
anterior al cambio de modelo del 18/08 y contradice la especificación
corregida.** Se resolvió a favor de la especificación (decisión del equipo,
2026-08-23):

| Punto              | Mockup PAN-RES-01 | Se implementó                        |
| ------------------ | ----------------- | ------------------------------------ |
| Objeto reseñado    | el pedido         | **el plato**                         |
| Ventana de edición | "24 hs"           | **48 h**, reabiertas por cada pedido |
| Tags               | no los dibuja     | los tres de RF080                    |
| Foto               | no la dibuja      | pendiente (punto 1)                  |
| Vista previa       | envía directo     | previsualiza, como pide el criterio  |
| Botón / éxito      | "Enviar reseña"   | los literales de los criterios       |

Del mockup **sí** se conservaron la cabecera con foto, el contador del
comentario y el aviso al pie (con el plazo corregido a 48 h).

**PAN-RES-02 "Calificar cliente" no tiene maquetación en ningún lado.** El
inventario de la Etapa 5 usa ese código para "Mis reseñas" del cocinero, que es
otra pantalla. El layout replica el de PAN-RES-01.

Para cerrarlo hace falta que la maquetación se actualice al modelo vigente y que
alguien contraste las tres pantallas.

---

## 7. Cinco mensajes redactados por el equipo

**Estado:** escritos y marcados; falta que alguien los apruebe.

Las historias describen estos casos como "no muestre el botón": resuelven la
interfaz y no dicen qué responde el servidor. Pero la regla del módulo de
seguridad es que toda validación del formulario existe también en la API, y una
API que rechaza tiene que explicar por qué.

Están en `MENSAJES_RESENA` (`packages/shared`), en un bloque aparte y anotados
como `PROPIO` para distinguirlos de los literales comprometidos:

| Clave                     | Cuándo                                        |
| ------------------------- | --------------------------------------------- |
| `sinDerechoAResenar`      | no hay pedido completado con ese plato        |
| `plazoParaResenarVencido` | pasaron los días de `resena_limite_dias...`   |
| `resenaYaExiste`          | ya reseñó ese plato; corresponde editar       |
| `edicionFueraDeVentana`   | se cerró la ventana de 48 h                   |
| `sinDerechoACalificar`    | nunca tuvo un pedido aceptado con ese cliente |

Cambiarlos **no rompe ninguna prueba funcional**: no salen de un criterio de
aceptación.

---

## 8. Verificación funcional completa

**Estado:** parcial. Es el paso 4 del flujo de trabajo y todavía no está cerrado.

Lo verificado hasta ahora fue sobre la marcha, arreglando lo que aparecía. Falta
recorrer los criterios uno por uno, **con los dos roles**, y dejarlo asentado.

**Como cliente:** dejar reseña con el botón por plato, el mensaje al intentar sin
estrellas, el contador del comentario, la vista previa, editar dentro de las 48 h,
la solapa "Reseñas" del perfil público con su resumen y sus filtros, y los dos
estados vacíos (sin reseñas / sin resultados por filtros).

**Como cocinero:** calificar al cliente, el tope de 300 caracteres, que el mismo
cliente ofrezca "Editar calificación" desde otro pedido, la reputación en el
detalle del pedido y "Mis reseñas" con el resumen.

### Un caso abierto: "Cliente nuevo"

US-RES-02 pide mostrar **"Cliente nuevo"** cuando el cliente registra **menos de
3 pedidos completados en la plataforma**. En una prueba del 2026-08-23 se
observó el promedio en lugar de esa leyenda sobre un cliente que, según el
equipo, tenía menos de 3.

No se llegó a diagnosticar. Para descartarlo hay que contar los pedidos
`COMPLETADO` de ese cliente con **todos** los cocineros, no solo con quien mira:

```sql
select estado_pedido_actual, count(*)
  from pedido
 where cliente_pedido_id = '<id del cliente>'
 group by estado_pedido_actual;
```

Si da 3 o más, el comportamiento es correcto y no hay nada que arreglar.

---

## Lo que sí quedó cubierto

Para que el pendiente no se lea como si el módulo estuviera a medias:

| Historia  | Estado     | Verificación                                                                           |
| --------- | ---------- | -------------------------------------------------------------------------------------- |
| US-RES-01 | Codificada | tres modos (crear / editar / solo lectura), los dos plazos, vista previa               |
| US-RES-02 | Codificada | una por par cocinero-cliente, editable, privada, habilitada desde `ACEPTADO`           |
| US-RES-03 | Codificada | resumen con distribución, listado paginado, filtros, las dos vistas del mismo endpoint |
| RF031     | Codificada | un botón por ítem en el detalle del pedido, con su rótulo según el estado              |

**El módulo no tocó el modelo de datos.** Las cinco tablas ya estaban con el
modelo por plato desde las migraciones `0006` y `0007`. La única migración que
suma es `0013_sembrar_terminos_moderacion`, que siembra un parámetro vacío.

El promedio público del cocinero pasa a ocultarse hasta alcanzar
`resena_minimo_para_promedio` (3 por defecto). **Es un cambio intencional en lo
que muestra Exploración**, aprobado por el equipo el 2026-08-23.
