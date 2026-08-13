# Capítulo 01 · Visión y alcance

Fuente: puntos 2.2.2.1 y 2.2.2.2 del documento de proyecto.

---

## Objetivo general

> Reducir las barreras de acceso que enfrentan los emprendedores gastronómicos
> caseros para comercializar su oferta, y facilitar a los consumidores el
> descubrimiento de comida casera de proximidad.

FoodHub centraliza el ciclo completo entre cocinero y cliente —publicación,
pedido, coordinación y reputación— dentro de una única aplicación móvil con
funcionalidades de red social.

## Objetivos específicos

Cada uno resuelve un problema concreto y se traduce en módulos verificables.

| Objetivo                                        | Problema que resuelve                                                                     | Módulos              |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------- | -------------------- |
| Eliminar la dependencia de canales informales   | el cocinero duplica mensajes en WhatsApp e Instagram y avisa a mano cuando algo se agota  | PUB                  |
| Acortar el tiempo de búsqueda de comida cercana | descubrir cocineros depende del boca en boca y de búsquedas dispersas                     | EXP                  |
| Dar trazabilidad y certeza al pedido            | en el chat se pierde la referencia del estado; hay pedidos olvidados y reclamos           | PED, NOT             |
| Generar confianza entre desconocidos            | no hay referencias verificables de la calidad del plato ni del comportamiento del cliente | RES                  |
| Fomentar relaciones recurrentes                 | el delivery tradicional trata cada pedido como un evento aislado                          | MSG, EXP (favoritos) |
| Dar al cocinero información para decidir        | no lleva registro de qué se vende ni de quién le compra                                   | DASH                 |

---

## Los trece módulos

### Transversales

| Módulo                                    | Qué incluye                                                                                                                                                                       |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Autenticación y control de acceso**     | registro (cliente o cocinero), login, logout, recuperación de contraseña, aceptación de términos. **Sin revisión manual de alta**: el cocinero se registra y publica de inmediato |
| **Gestión de usuarios, roles y permisos** | ABM de usuarios desde el panel, perfil propio, eliminación de cuenta, permisos por rol, suspensión y baja administrativa                                                          |
| **Seguridad**                             | validación de datos, control de acceso por rol en pantalla y en API, contraseñas cifradas, HTTPS, manejo controlado de errores                                                    |
| **Auditoría y trazabilidad**              | log de altas, bajas, modificaciones y accesos, con identificación del responsable                                                                                                 |

### Funcionales (núcleo del negocio)

| Módulo                       | Qué incluye                                                                                                                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Publicaciones**            | ABM de platos con imagen, descripción, precio y categoría; disponibilidad en tres estados; listado con búsqueda, filtros, orden y paginación                                          |
| **Exploración y búsqueda**   | feed dinámico, mapa geolocalizado, perfil público del cocinero, buscador, favoritos, filtros combinables (categoría, precio, distancia, valoración), detalle de publicación y carrito |
| **Pedidos**                  | ciclo completo con estados, reglas por transición, historial para ambas partes y motivos de cancelación                                                                               |
| **Reseñas y calificaciones** | reputación bidireccional, reacciones de la comunidad, promedio visible en el perfil público                                                                                           |
| **Mensajería directa**       | chat en tiempo real habilitado en el contexto de un pedido, con historial persistente                                                                                                 |
| **Notificaciones y alertas** | push e in-app ante cambios de estado, mensajes nuevos, moderación y avisos del sistema; historial consultable                                                                         |

### De información y control

| Módulo                         | Qué incluye                                                                                                                   |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| **Dashboard del cocinero**     | ventas acumuladas, platos más pedidos, clientes recurrentes, valoración promedio y pedidos por estado, con filtro por período |
| **Panel de administración**    | usuarios por rol, publicaciones activas con moderación, total de pedidos por período y distribución por estado                |
| **Configuración y parámetros** | ABM de categorías, motivos de cancelación, parámetros de búsqueda y textos legales                                            |
| **Ayuda y soporte**            | manual dentro de la app, FAQ por rol y formulario de contacto                                                                 |

---

## Fuera de alcance

Explícitamente **no** se desarrolla en esta etapa:

- **Pagos reales.** El flujo se simula o se deja preparado por interfaz; no hay
  integración con Mercado Pago, tarjetas ni billeteras.
- **Logística propia.** La entrega se coordina entre las partes por el chat: no
  hay repartidores asignados ni cálculo de rutas.
- **Escala global.** El foco es local o regional: sin internacionalización,
  multi-moneda ni adaptación regulatoria extranjera.
- **Login con redes sociales** ni publicación cruzada.

---

## Contexto competitivo

El relevamiento de la Etapa 4 analizó **PedidosYa**, **Rappi** y **EatWith**. La
diferencia central de FoodHub frente a los dos primeros es la **barrera de
entrada**: en ellos, dar de alta un vendedor exige una revisión manual que puede
demorar días; en FoodHub, cualquier cocinero se registra y publica de inmediato.
