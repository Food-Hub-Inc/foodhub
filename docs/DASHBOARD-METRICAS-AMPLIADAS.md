# Dashboard del cocinero · métricas de demanda y reconciliación

**Estado:** implementado el 2026-10-20.
**Pantalla:** PAN-DASH-01 «Mi actividad».
**Endpoint:** `GET /api/v1/dashboard/actividad`.

## Por qué existe este documento

Las cinco historias de DASH (US-DASH-01 a US-DASH-05) fijan las métricas del
alcance: resumen, platos más pedidos, clientes recurrentes, distribución por
estado y filtro por período. **Ninguna de ellas pide pedidos por día de la
semana ni por franja horaria**, y el mockup de la Etapa 5 tampoco las dibuja.

El equipo aprobó agregarlas como **extensión de PAN-DASH-01** (decisión del
2026-10-20). No reemplazan ninguna historia ni cambian sus métricas: las cuatro
secciones originales siguen respondiendo a lo mismo. La extensión sí ajusta
cuándo se muestra el aviso de US-DASH-01 (ver «Reconciliación de universos»),
porque el texto habla de actividad y no de ventas.

## Qué se agregó al contrato

Dos bloques nuevos y un campo de reconciliación en la respuesta de
`GET /dashboard/actividad`:

```jsonc
{
  "pedidosAbiertos": 6,
  "pedidosPorDiaSemana": [
    { "diaNumero": 1, "cantidad": 4 },
    { "diaNumero": 2, "cantidad": 2 },
    { "diaNumero": 3, "cantidad": 0 },
    { "diaNumero": 4, "cantidad": 7 },
    { "diaNumero": 5, "cantidad": 9 },
    { "diaNumero": 6, "cantidad": 12 },
    { "diaNumero": 7, "cantidad": 3 },
  ],
  "franjasHorarias": [
    { "franja": "MANANA", "cantidad": 4 },
    { "franja": "ALMUERZO", "cantidad": 9 },
    { "franja": "TARDE", "cantidad": 5 },
    { "franja": "CENA", "cantidad": 12 },
    { "franja": "NOCHE", "cantidad": 7 },
    { "franja": "MADRUGADA", "cantidad": 0 },
  ],
}
```

- `pedidosPorDiaSemana` tiene **siempre 7 cubos**, de lunes (`1`) a domingo
  (`7`). El schema exige `length(7)`.
- `franjasHorarias` tiene **siempre 6 cubos**, en el orden de
  `FRANJAS_HORARIAS`. El schema exige `length(6)`.
- `pedidosAbiertos` cuenta los pedidos que siguen en `CREADO`, `ACEPTADO` o
  `LISTO`. No pertenece a US-DASH-04: la distribución solo suma estados
  cerrados. Sirve para reconciliar la tarjeta «Pedidos totales» con el gráfico.
- La API manda **solo la clave y la cantidad**. Los rótulos, los porcentajes y
  el pico se resuelven en la app con `detalleDeDiasDeSemana` y
  `detalleDeFranjasHorarias` (`packages/shared`), que son funciones puras. Así
  un cambio de copy no obliga a deployar el servidor.

## Reconciliación de universos

La pantalla muestra tres universos distintos, y eso es deliberado:

| Dato                     | Universo                                                      |
| ------------------------ | ------------------------------------------------------------- |
| `resumen.pedidosTotales` | Todos los pedidos creados en el período, en cualquier estado. |
| `pedidosAbiertos`        | Los que siguen abiertos (`CREADO`, `ACEPTADO`, `LISTO`).      |
| `distribucion.total`     | Los que ya cerraron (`COMPLETADO` o `RECHAZADO` con origen).  |
| `platosMasPedidos`       | Solo unidades de pedidos `COMPLETADO`.                        |
| `clientesRecurrentes`    | Solo clientes con más de un pedido `COMPLETADO`.              |

En datos válidos se cumple:

```text
resumen.pedidosTotales = distribucion.total + pedidosAbiertos
```

Para que el cocinero no tenga que deducirlo, la pantalla agrega:

- una tarjeta **«Pedidos del período»** debajo de las tres tarjetas de
  US-DASH-01, con el total, los cerrados y los abiertos;
- una leyenda debajo del título de cada sección que nombra su universo
  («Incluye todos los pedidos…», «Solo pedidos completados.», «Solo pedidos
  cerrados…»).

El aviso «No tenés actividad registrada en el período seleccionado.» se muestra
ahora solo cuando `pedidosTotales === 0`. Antes se ataba a que no hubiera
pedidos completados, lo que contradecía la tarjeta de pedidos totales cuando el
cocinero tenía pedidos abiertos o rechazados. El texto del criterio no cambió.

## Decisiones

### Universo: todos los pedidos creados en el período

Igual que `resumen.pedidosTotales` y que el resto del dashboard, la pertenencia
se decide por `pedido.fecha_creacion` y **no se filtra por estado**. Consecuencia
buscada: la suma de los siete días y la de las seis franjas coincide con la
tarjeta «Pedidos totales». Si se contaran solo los completados, la pantalla
mostraría dos universos distintos y las secciones no cerrarían entre sí.

### El período de US-DASH-05 atraviesa las dos métricas

Cambiar «Esta semana», «Este mes», «Últimos 3 meses», «Este año» o el rango
personalizado recalcula los dos bloques en el mismo request. Con «Esta semana»,
los días que todavía no transcurrieron aparecen en cero: el eje tiene siempre
siete barras para que dos períodos se puedan comparar.

### Zona horaria: la del dispositivo, no la del servidor

`pedido.fecha_creacion` es `timestamptz`. Agrupar sin convertir manda un pedido
de las 23 h de Argentina al día siguiente. El cliente manda `zonaHoraria` (IANA)
dentro del rango, validada con `Intl` y usada como parámetro en
`at time zone`; el servidor no la interpola en el SQL.

El rango sigue viajando como dos instantes UTC calculados por el cliente. Es el
mismo criterio que `metricasAdmin.schema.ts` usa para la serie del panel.

### Días de la semana

`extract(isodow ...)`: lunes = 1, domingo = 7. Los siete cubos se completan con
cero cuando no hubo pedidos.

### Franjas horarias: seis cubos de cuatro horas

| Franja      | Horario       |
| ----------- | ------------- |
| `MANANA`    | 07:00 a 11:00 |
| `ALMUERZO`  | 11:00 a 15:00 |
| `TARDE`     | 15:00 a 19:00 |
| `CENA`      | 19:00 a 23:00 |
| `NOCHE`     | 23:00 a 03:00 |
| `MADRUGADA` | 03:00 a 07:00 |

Todas miden lo mismo a propósito. Una primera versión dejaba `NOCHE` con doce
horas (23 a 11) y le sumaba la mañana: con demanda uniforme se llevaba la mitad
de los pedidos y el «turno pico» terminaba midiendo el ancho del cubo, no la
demanda.

### Pico único

El día pico y la franja pico son **uno solo**, aunque haya empate: se elige el
primero en el orden de presentación (lunes antes que domingo; mañana antes que
madrugada). El badge habla en singular y el gráfico resalta un solo elemento;
marcar todos los máximos dejaría el badge nombrando uno y el dibujo destacando
varios. La regla es determinista entre cargas.

### Porcentajes que suman 100

Las franjas muestran su porcentaje sobre el total del período. Se reparte por
**resto mayor**, no con `Math.round` independiente: tres franjas con un tercio
cada una darían 33 + 33 + 33 = 99. Es el mismo criterio que
`porcentajesDeDistribucion` usa para US-DASH-04.

## Evolución en el tiempo (corrección del 20/10/2026)

La corrección pidió, además de la distribución por día de la semana, ver la
**evolución** de los pedidos —totales y de un plato— a lo largo de la semana y
del mes. El ranking de US-DASH-02 no alcanzaba: dice cuánto se vendió en el
período, no cómo se repartió en el tiempo. Decisiones del equipo del
2026-10-27:

| Tema                | Decisión                                                                        |
| ------------------- | ------------------------------------------------------------------------------- |
| Pedidos totales     | Sección «Evolución de pedidos», mismo universo que «Pedidos totales».           |
| Plato               | Se toca un plato del ranking y se abre su evolución (`/actividad/platos/[id]`). |
| Qué cuenta el plato | **Pedidos completados** que incluyen el plato (no unidades).                    |
| Semana o mes        | **Sigue el selector de período** de US-DASH-05; no hay un toggle propio.        |

### Contrato

- `GET /dashboard/actividad` suma `evolucionPedidos: { granularidad, puntos }`.
- `GET /dashboard/platos/:publicacionId/evolucion` devuelve
  `{ publicacionId, nombre, eliminado, totalPedidos, evolucion }`. Un plato que
  no es del cocinero de la sesión responde 404, igual que uno inexistente.
- `puntos` trae solo los cubos con pedidos (`inicio` = fecha local
  `YYYY-MM-DD`); la app completa los vacíos con `serieDeEvolucion`.

### Escala según el largo del período (`granularidadDeEvolucion`)

| Largo del rango | Un punto por… | Caso típico               |
| --------------- | ------------- | ------------------------- |
| hasta 31 días   | día           | «Esta semana», «Este mes» |
| hasta 124 días  | semana (lun)  | «Últimos 3 meses»         |
| más             | mes           | «Este año»                |

La agrupación usa `date_trunc` en la zona del dispositivo (`rango.zonaHoraria`),
con el mismo cuidado que los días de la semana. La serie termina hoy: en el
eje del tiempo, un día futuro en cero se leería como un día sin ventas.

Verificado contra foodhub-dev el 2026-10-27: en los cuatro períodos la suma de
la evolución coincide con `resumen.pedidosTotales`.

## Lo que NO se agregó

- **Reporte REP-01:** sigue pendiente de definición en el PDF de maquetación
  (ver `PENDIENTE_DASHBOARD_COCINERO.md`).

## Trazabilidad

| Elemento                | Dónde                                             |
| ----------------------- | ------------------------------------------------- |
| Contrato y reglas puras | `packages/shared/src/schemas/dashboard.schema.ts` |
| Consultas y mapeo       | `apps/api/src/modules/dashboard/`                 |
| Pantalla                | `apps/mobile/src/screens/dashboard/`              |
| Pruebas                 | `reglas.test.ts` y `consultas.test.ts` del módulo |

**No hubo migración ni cambios en `packages/db`:** las métricas se derivan
de `pedido` tal como está.
