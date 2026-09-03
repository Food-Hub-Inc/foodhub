# Pendiente: lo que quedó fuera del módulo de Reseñas y Calificaciones (RES)

## Contexto

El núcleo del módulo se implementó en la rama `feature/Reseña_calificaciones`:
**US-RES-01** (reseñar un plato), **US-RES-02** (calificar al cliente) y
**US-RES-03** (ver reseñas y promedio), con la corrección de **RF031** sobre
PAN-PED-06.

Este documento existe para que lo que falta no se pierda y para que quede claro
que **son decisiones, no olvidos** — mismo criterio que
`PENDIENTE_DASHBOARD_COCINERO.md`.

> ## Actualización del 2026-09-02
>
> La rama `feature/resenas-completar-modulo` **cerró cinco de los once puntos**
> e incorporó **RF087 / US-RES-07**, que la versión corregida del módulo agregó
> después del PR #19: el cliente califica al cocinero, una vez por pedido
> completado, y **esa es la métrica que ahora construye la reputación del
> cocinero**.
>
> | Punto                                   | Estado                                                                                         |
> | --------------------------------------- | ---------------------------------------------------------------------------------------------- |
> | 1 · La foto de la reseña                | ✅ **resuelto** — bucket `resenas`, endpoint con rol CLIENTE, campo en el formulario y galería |
> | 9.1 · El listado no pagina              | ✅ **resuelto** — `useInfiniteQuery` con bloques de diez                                       |
> | 9.2 · Galería a pantalla completa       | ✅ **resuelto** — `GaleriaDeResenas.tsx`                                                       |
> | 9.3 · Botón del estado vacío            | ✅ **resuelto** — `accionVacio` se pasa desde el perfil                                        |
> | 9.4 · Motivo cuando no se puede reseñar | ✅ **resuelto** — el literal `pedidoNoCompletado` se usa con el pedido rechazado               |
>
> Siguen abiertos los puntos **2 a 8**, **10** y **11**, más los **tres nuevos**
> que agregan las secciones 12, 13 y 14.

> **La fuente de verdad del módulo es la _versión corregida_ que reemplaza las
> secciones 2.2.1.2.11 y 2.2.1.3.11** (RF080–RF086). La maquetación de la
> Etapa 5 y la skill `foodhub` son anteriores al cambio de modelo del
> 2026-08-18 y dicen que la reseña es por pedido: **está desactualizado**. Hoy
> la reseña es **por plato**.

---

## 1. La foto de la reseña — RF080

**Estado: ✅ RESUELTO el 2026-09-02.** El equipo decidió un bucket dedicado
`resenas` en Supabase Storage —público, 5 MB, JPG/PNG/WEBP—, siguiendo el
patrón que ya usaban `mensajes` (US-MSG-03) y `tickets` (US-AYU-03). Se agregó
`POST /almacenamiento/foto-resena` con `requiereRol('CLIENTE')`, el campo en el
formulario y la galería de US-RES-03.

**Falta un paso manual antes de desplegar:** el bucket existe en `foodhub-dev`
pero **no en `foodhub-prod`**. Sin él la subida falla en producción y la reseña
no se publica.

Lo que sigue es el registro de por qué estuvo bloqueado.

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

## 9. Cuatro criterios de aceptación sin cumplir — ✅ TODOS RESUELTOS el 2026-09-02

**Estado:** detectados en la auditoría contra la especificación del 2026-09-01.
Ninguno estaba documentado hasta ahora.

### 9.1 · El listado no pagina — US-RES-03

> "Cargue las 10 reseñas más recientes por defecto y **bloques adicionales de 10
> al hacer scroll**."

El endpoint pagina correctamente y el contrato lo soporta, pero
`ListaDeResenas` no pide la página siguiente: le falta `onEndReached` sobre la
`FlatList` y pasar la consulta a `useInfiniteQuery`. Con más de diez reseñas,
de la once en adelante son inalcanzables.

Es el más visible de los cuatro en cuanto haya volumen de datos.

### 9.2 · No hay galería a pantalla completa — US-RES-03

> "El cliente presiona sobre una imagen adjunta → Muestre una galería en
> pantalla completa con la imagen ampliada y permita navegar entre las imágenes
> de otras reseñas del mismo cocinero deslizando lateralmente."

No está implementado: la foto se dibuja en la tarjeta y no se puede ampliar.

**Encadenado al punto 1:** hoy no hay forma de subir una foto, así que el caso
no se puede observar. Conviene hacerlo junto con el adjunto.

### 9.3 · Falta el botón del estado vacío — US-RES-03

> "Si el cliente tiene un pedido completado con ese cocinero, muestre el botón
> **'Dejar una reseña'**."

`ListaDeResenas` acepta la acción por la prop `accionVacio`, pero el perfil
público nunca se la pasa. El literal `dejarUnaResena` existe en
`MENSAJES_RESENA` y no se usa en ninguna parte.

Para cerrarlo hace falta además saber si el cliente tiene un pedido completado
con ese cocinero, dato que hoy no viaja en `CocineroPublico`.

### 9.4 · No se explica por qué no se puede reseñar — US-RES-01

> "El pedido está en estado distinto a Completado → No muestre el botón y, en su
> lugar, **indique el motivo aplicable: 'No se puede reseñar un plato de un
> pedido cancelado.'**"

Hoy la pantalla simplemente no dibuja nada. El literal
`MENSAJES_RESENA.pedidoNoCompletado` está escrito y sin usar.

Es el más barato de los cuatro: es mostrar un mensaje que ya existe.

---

## 10. El filtro de moderación no bloquea

**Estado:** BUG ABIERTO, sin diagnosticar.

Cargando un término desde PAN-ADM-04 y escribiéndolo en el comentario de una
reseña, la reseña **se publica igual**.

Lo verificado hasta ahora, todo correcto:

- la clave del parámetro coincide entre el schema, la migración y el servicio;
- el panel envía el objeto completo y el router lo valida con
  `parametrosResenasSchema`, que exige el campo;
- `crearResena` llama a `verificarModeracion` antes de insertar;
- las pruebas de `contieneTerminoModerado` pasan, incluidas mayúsculas y tildes.

Queda por descartar si el valor llega a la base. La consulta que lo resuelve:

```sql
select clave, valor from configuracion_sistema where clave like 'resena_%';
```

| Si `valor` está… | El problema está en     |
| ---------------- | ----------------------- |
| vacío            | la escritura del panel  |
| con el término   | la lectura del servicio |

**Sospecha adicional:** si el guardado del panel estuviera roto, también
fallaría el mínimo para el promedio. Probar ese parámetro es el mismo
diagnóstico sin costo extra.

---

## 11. "Cliente nuevo" no se pudo confirmar

**Estado:** sin verificar.

En una prueba del 2026-08-23 se observó el promedio en lugar de la leyenda
"Cliente nuevo" sobre un cliente que, según el equipo, tenía menos de tres
pedidos completados. No se llegó a contrastar contra los datos.

```sql
select estado_pedido_actual, count(*)
  from pedido
 where cliente_pedido_id = '<id del cliente>'
 group by estado_pedido_actual;
```

Si da tres o más, el comportamiento es correcto y no hay nada que arreglar.

---

## 12. Exploración sigue mostrando el promedio viejo — RF082

**Estado:** abierto. Es la mitad de RF082 que no entró, por acuerdo de alcance.

RF082 cambió de raíz de dónde sale la reputación del cocinero:

> El promedio del cocinero se calcula con las **calificaciones al cocinero**, no
> con las reseñas de plato.

En el **perfil público** eso ya está: el bloque de reputación lo alimenta
`GET /resenas/cocineros/:id/reputacion`, que promedia `calificacion_a_cocinero`.

Pero `apps/api/src/lib/valoraciones.ts` **sigue derivando el promedio del
cocinero de las reseñas de platos**, y esa función la consumen seis servicios:
feed, mapa, perfil público, favoritos, carrito y pedidos. O sea que hoy:

| Dónde                        | De dónde sale el número       |
| ---------------------------- | ----------------------------- |
| Perfil, bloque de reputación | calificaciones al cocinero ✅ |
| Feed, mapa, tarjetas, etc.   | reseñas de los platos ❌      |

**No es una inconsistencia introducida por descuido**: el usuario decidió
(2026-09-02) implementar RF087 **solo dentro del módulo de Reseñas** y dejar las
correcciones de los otros módulos para después. Se deja anotado acá porque un
revisor que compare el feed con el perfil va a ver dos números distintos para el
mismo cocinero, y la explicación es esta.

**Para cerrarlo** hay que cambiar `subconsultaValoracionPorCocinero` para que
agregue sobre `calificacion_a_cocinero`, y decidir qué pasa con
`resena_minimo_para_promedio` en ese contexto: el bloque de reputación nuevo
**no lo aplica** (decisión del equipo, 2026-09-02), y la subconsulta vieja sí.

---

## 13. Las correcciones de RF013, RF019 y RF038 en sus módulos

**Estado:** abierto, fuera del alcance acordado.

La versión corregida del módulo cierra con una tabla de "correcciones
dependientes en otros módulos". Estas siguen sin hacer:

| Requisito | Módulo         | Qué falta                                                                      |
| --------- | -------------- | ------------------------------------------------------------------------------ |
| RF013     | Publicaciones  | "Sin calificaciones aún" cuando la publicación no tiene reseñas VISIBLE        |
| RF019     | Exploración    | el listado de reseñas en el detalle del plato (ya era el punto 5)              |
| RF038     | Notificaciones | la regla de notificar solo si cambian las estrellas (ya era el punto 4)        |
| —         | Publicaciones  | que la baja de una publicación sea **lógica**, para que las reseñas sobrevivan |

La última importa más de lo que parece: RF082 pide que una reseña de un plato
dado de baja **siga visible** con "[Plato no disponible]". La API ya lo resuelve
del lado de la lectura, pero si la baja fuera física la fila de `resena`
desaparecería por el `ON DELETE CASCADE` de `publicacion_id`.

---

## 14. El diagrama de clases quedó desactualizado

**Estado:** abierto. Es una tarea de documentación, no de código.

`CLAUDE.md` fija que al tocar el modelo de datos se actualiza **primero** el
diagrama vigente (`FoodHub - DG12082026_V5.drawio`). La migración `0014` no lo
hizo, por un motivo concreto: **la carpeta `../Docs/` no existe en este clon**.

Lo que hay que reflejar cuando se pueda:

- La entidad `CalificacionCocinero` del diagrama **cambia de significado**: pasa
  a llamarse `CalificacionACliente` (el cocinero evalúa al cliente).
- Entra `CalificacionACocinero`, nueva, con FK a `Pedido` y unicidad por pedido.
- Las matrices de trazabilidad suman la fila **US-RES-07 / RF087 / PAN-RES-03**,
  y el actor de US-RES-06 pasa a incluir **Administrador**.

---

## Hallazgo fuera del módulo: `ACEPTADO → RECHAZADO` es inalcanzable

RF081 habilita al cocinero a calificar "aún cuando el pedido posteriormente sea
cancelado", y explica que ese es justamente el caso del cliente que no aparece
a retirar.

**Ese escenario no se puede producir hoy.** `TRANSICIONES_PEDIDO` contempla
`ACEPTADO → RECHAZADO`, pero ningún endpoint lo provoca: `rechazarPedido` y
`cancelarPedido` exigen los dos que el pedido esté en `CREADO`. Una vez
aceptado, el único camino es `LISTO → COMPLETADO`.

Consecuencia práctica: si el cliente no retira, el cocinero no tiene forma de
cerrar el pedido y queda colgado en "Preparando" o "Listo".

**No es un defecto de Reseñas** —es un hueco del módulo de Pedidos, probablemente
de US-PED-04 o US-PED-09— pero deja sin cubrir un caso que RF081 nombra
explícitamente. El módulo de Reseñas ya está preparado: lee el hito del
historial, así que el día que Pedidos permita esa transición el botón aparece
solo.

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
