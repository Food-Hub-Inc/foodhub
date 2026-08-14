---
name: foodhub
description: 'Conocimiento del proyecto FoodHub: qué hace el sistema, sus 13 módulos, las 81 historias de usuario, el modelo de datos de 43 entidades, las 30+ pantallas y los entornos. Usar SIEMPRE al empezar cualquier tarea sobre este código para saber qué pide la documentación antes de implementar. Palabras clave: FoodHub, cocinero, cliente, publicación, plato, pedido, reseña, carrito, feed, chat, notificación, dashboard, panel de administración, historia de usuario, US-, RF, PAN-, alcance, requerimiento, módulo, entidad, diagrama de clases.'
metadata:
  proyecto: FoodHub - Proyecto Final 2026 - UTN FRM - Grupo 21
  version: '1.0.0'
  fuentes:
    - 'FoodHub - Documentación de Proyecto.md'
    - 'FoodHub - DG12082026_V5.drawio'
    - 'FoodHub - Pantallas Mockup FoodHub.pdf'
---

# FoodHub

Plataforma con funcionalidades de red social que conecta **cocineros caseros**
con **consumidores locales**. Proyecto Final 2026 de Ingeniería en Sistemas de
Información, UTN FRM, Grupo 21.

## Cómo usar esta skill

Los capítulos están en `resources/`. **No los leas todos**: abrí el que
corresponde a lo que estás haciendo.

| Necesito saber…                                                 | Capítulo                                      |
| --------------------------------------------------------------- | --------------------------------------------- |
| Qué resuelve el sistema y qué queda fuera                       | `resources/01-vision-y-alcance.md`            |
| Qué entidades hay y cómo se relacionan                          | `resources/02-modelo-de-datos.md`             |
| Auth, usuarios, seguridad, auditoría                            | `resources/03-modulos-transversales.md`       |
| Publicaciones, búsqueda, pedidos, reseñas, chat, notificaciones | `resources/04-modulos-funcionales.md`         |
| Dashboard, panel admin, configuración, ayuda                    | `resources/05-modulos-informacion-control.md` |
| Qué pantalla implementar y cómo se navega                       | `resources/06-pantallas.md`                   |
| Dónde corre cada cosa, en dev y en producción                   | `resources/07-arquitectura-y-entornos.md`     |
| Nomenclatura de códigos y reglas del proyecto                   | `resources/08-glosario-y-trazabilidad.md`     |

El índice completo con los 81 códigos de historia está en
`resources/00-indice.md`.

---

## Lo mínimo que hay que saber

**El problema.** Los cocineros caseros venden por estados de WhatsApp e
historias de Instagram: duplican mensajes, responden uno por uno y no tienen
registro de nada. Los consumidores dependen del boca en boca para encontrarlos.

**La solución.** Una app móvil donde el cocinero publica sus platos con
disponibilidad en tiempo real y el cliente los descubre por cercanía, pide,
sigue el estado del pedido y construye reputación con reseñas bidireccionales.

**Tres roles:** cliente, cocinero, administrador.

**Dos aplicaciones:** app Android (producto principal) y panel web de
administración.

**Trece módulos** en tres grupos:

```
TRANSVERSALES              FUNCIONALES               INFORMACIÓN Y CONTROL
─────────────              ───────────               ─────────────────────
Autenticación (AUT)        Publicaciones (PUB)       Dashboard cocinero (DASH)
Usuarios/roles (GURP)      Exploración (EXP)         Panel admin (ADM)
Seguridad                  Pedidos (PED)             Configuración (CFG)
Auditoría (AUD)            Reseñas (RES)             Ayuda y soporte (AYU)
                           Mensajería (MSG)
                           Notificaciones (NOT)
```

**Escala:** 81 historias de usuario · 89 requisitos funcionales · 43 entidades ·
30+ pantallas · 2 reportes.

---

## Reglas de negocio que se violan seguido

Estas son las que más errores de implementación generan. Verificalas siempre.

1. **Un pedido pertenece a un solo cocinero.** El carrito se separa por
   cocinero: agregar un plato de otro abre un carrito nuevo.
2. **El precio se congela al confirmar.** `item_pedido` guarda un snapshot de
   nombre, precio e imagen. Editar la publicación después no puede alterar un
   pedido cerrado.
3. **El pedido solo avanza por las transiciones declaradas** en
   `TRANSICIONES_PEDIDO` (`@foodhub/shared`). `CREADO → COMPLETADO` no existe.
4. **Un rechazo siempre lleva motivo.** Lo exige la API y también un CHECK en
   la base.
5. **Una reseña por pedido**, y solo sobre pedidos completados. `pedido_id` es
   UNIQUE en `resena` y en `calificacion_cocinero`.
6. **El pedido sin responder expira solo** a los N minutos (por defecto 15,
   parametrizable) y pasa a `RECHAZADO` con origen `SISTEMA` (US-PED-10).
7. **Nada se borra físicamente.** Las bajas son lógicas (`activo`,
   `estado_cuenta`): el historial de pedidos tiene que seguir siendo legible.
8. **El login no revela qué dato falló.** "Correo electrónico o contraseña
   ingresados son incorrectos", nunca "ese correo no existe".

---

## Fuera de alcance

No se implementa, y no hace falta preguntarlo:

- Pasarelas de pago reales (Mercado Pago, tarjetas). El flujo se simula.
- Logística de envíos, repartidores o cálculo de rutas. La entrega se coordina
  por el chat.
- Internacionalización, multi-moneda o adaptación regulatoria extranjera.
- Login con redes sociales.

---

## Si algo no está definido

**Preguntá. No lo inventes.** El sistema tiene 81 historias con criterios de
aceptación explícitos; si un caso no está cubierto, es una decisión pendiente
del equipo, no un hueco para completar con criterio propio.
