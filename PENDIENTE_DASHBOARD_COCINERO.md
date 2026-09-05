# Pendiente: lo que quedó fuera del módulo de Dashboard del cocinero (DASH)

## Contexto

El módulo DASH se implementó completo en la rama `feature/dashboard-cocinero`:
las cinco historias US-DASH-01 a US-DASH-05 sobre la pantalla PAN-DASH-01 «Mi
actividad». Quedaron tres cosas afuera, todas por el mismo motivo: la
documentación no alcanza para implementarlas sin inventar.

Este documento existe para que esas tres no se pierdan y para que quede claro
que son decisiones, no olvidos.

---

## 1. REP-01 — Reporte del dashboard del cocinero

**Estado:** no iniciado.

El inventario de la Etapa 5 declara dos reportes, REP-01 (dashboard del
cocinero) y REP-02 (métricas del panel). **Ninguna de las cinco historias de
DASH menciona exportar, descargar ni compartir nada**, y el detalle de REP-01
vive únicamente en el PDF de maquetación.

Para cerrarlo hace falta, del PDF:

- qué secciones del dashboard incluye el reporte;
- en qué formato se entrega (PDF, CSV, hoja para compartir);
- dónde está el disparador dentro de PAN-DASH-01;
- los textos del encabezado del reporte.

Sin eso, cualquier implementación es una invención.

---

## 2. US-DASH-03, cuarto criterio — Perfil público del cliente

**Estado: ✅ RESUELTO el 2026-09-04**, junto con la corrección del módulo de
Reseñas. La pantalla vive en `apps/mobile/src/screens/perfiles/PerfilDeCliente.tsx`
y `apps/mobile/app/clientes/[id].tsx` dejó de ser un `PantallaPendiente`.

Lo que faltaba para cerrarlo eran tres cosas, y el usuario definió las dos
primeras (2026-09-04):

| Faltaba                     | Cómo quedó                                                                                                                       |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| qué es «información básica» | nombre y apellido, foto, «Miembro desde &lt;mes&gt; de &lt;año&gt;», y el promedio con la cantidad de cocineros que lo reseñaron |
| quién puede verlo           | **cualquier cocinero**, no solo los que le vendieron                                                                             |
| el endpoint del historial   | `GET /pedidos/con-cliente/:clienteId`, nuevo                                                                                     |

**Nunca muestra la ubicación ni el correo**, y no viajan en el contrato: la
ubicación es el punto exacto que el cliente declaró, no una zona. Ocultarlos
solo en la pantalla habría dejado el dato viajando en la respuesta.

Dos solapas: las reseñas que le dejaron los cocineros (US-RES-02) y los pedidos
que le hizo a quien mira (el criterio de US-DASH-03). La reputación respeta
«Cliente nuevo» por debajo de tres pedidos completados.

**Sigue sin código PAN asignado.** La pantalla no está en el inventario de la
Etapa 5 y sus textos son todos propios (`TEXTOS_PERFIL_CLIENTE`): cuando el
equipo le asigne un código y la maquete, son los primeros que hay que
contrastar.

Se entra desde el listado de clientes recurrentes del dashboard y, desde ahora,
también desde la ficha del cliente en el detalle del pedido, que pasó a ser
tocable.

Lo que sigue es el registro de por qué estuvo pendiente.

**Estado anterior:** el destino existía como `PantallaPendiente`; la pantalla
real, no.

El criterio dice:

> El cocinero presiona sobre un cliente del listado → Navegue al perfil público
> del cliente mostrando su información básica y el historial de pedidos
> realizados a ese cocinero.

**Esa pantalla no está en el inventario de la Etapa 5.** La maquetación dibuja el
perfil público del **cocinero** (PAN-EXP-04, US-EXP-04) y no el del cliente, y
ninguna historia de usuario lo define: no hay código PAN, ni layout, ni textos,
ni criterios de aceptación propios.

Se resolvió igual que las dos pantallas de reseñas en el sprint de Pedidos
(decisión del equipo del 19/08/2026): la fila **es tocable** y lleva a una
pantalla que anuncia el pendiente, en vez de dejar el criterio sin nada que
verificar. La ficha está en `PANTALLAS_PENDIENTES.perfilCliente`
(`apps/mobile/src/lib/textos.ts`), con el código `PAN-?` justamente porque no
tiene uno asignado.

Para cerrarlo hace falta:

1. que el equipo le asigne un código PAN y lo agregue al inventario;
2. definir qué es «información básica» de un cliente para un cocinero —el nombre
   y la foto ya se ven en la fila del dashboard y en el detalle del pedido, así
   que el alcance real es el historial;
3. un endpoint nuevo: hoy no existe forma de pedir «los pedidos de este cliente
   conmigo». `GET /pedidos/recibidos` filtra por pestaña, no por cliente.

---

## 3. El layout no se contrastó contra el mockup

**Estado:** la pantalla está codificada; falta la validación visual.

El PDF de maquetación (`FoodHub - Pantallas Mockup FoodHub.pdf`) no estaba
disponible al implementar, así que el orden y la composición de PAN-DASH-01
salieron de lo que enumeran los criterios de aceptación, en su orden:

```
Mi actividad                                   [Este mes ▾]
1 ene – 20 ago
┌ Ventas acumuladas ┐ ┌ Pedidos totales ┐ ┌ Valoración promedio ┐
Platos más pedidos                            [Ver todos]
Clientes recurrentes
Pedidos por estado        (dona + listado con cantidad y %)
```

Los tokens sí salen de la guía visual y no hay ningún literal de color ni de
tamaño en el código. Lo que falta verificar es la disposición: si el mockup pone
las secciones en otro orden, o el gráfico como barras en vez de dona
—US-DASH-04 admite las dos: "gráfico de torta o barras"—, es un ajuste de
`apps/mobile/src/screens/dashboard/`, no un rediseño.

---

## Lo que sí quedó cubierto

Para que el pendiente no se lea como si el módulo estuviera a medias:

| Historia   | Estado     | Verificación                                                                         |
| ---------- | ---------- | ------------------------------------------------------------------------------------ |
| US-DASH-01 | Codificada | tres tarjetas, `—`/`$0` y «Sin calificaciones aún» sin datos                         |
| US-DASH-02 | Codificada | ranking por unidades vendidas, corte en 5 + «Ver todos», sufijo «(eliminado)»        |
| US-DASH-03 | Codificada | `count(distinct pedido)` > 1, identidad borrada si la cuenta está eliminada          |
| US-DASH-04 | Codificada | los cuatro estados, porcentajes que cierran en 100, sin gráfico con el total en cero |
| US-DASH-05 | Codificada | las cinco opciones, rango a medida sin días futuros, rango invertido con su mensaje  |

El módulo **no tocó el modelo de datos**: las cuatro métricas se derivan de
`pedido`, `item_pedido`, `publicacion`, `usuario` y `resena` tal como estaban, y
por eso no hay migración.

Las agregaciones se apoyan en `pedido_cocinero_idx`
(`cocinero_pedido_id`, `estado_pedido_actual`, `fecha_creacion desc`), que cubre
el filtro por cocinero pero no lleva la fecha como segunda columna. A la escala
del proyecto alcanza; un índice pensado para el rango implicaría una migración y
se decide aparte.
