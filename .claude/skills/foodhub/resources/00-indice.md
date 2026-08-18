# Capítulo 00 · Índice de historias de usuario

Las 81 historias del sistema, agrupadas por módulo. El detalle completo
(actor, precondiciones, criterios de aceptación) está en el punto **2.2.1.3** del
documento de proyecto.

**Cómo leer un código:** `US-<MÓDULO>-<NN>`. El prefijo del módulo es el mismo
que usan las pantallas (`PAN-`) y los mensajes de commit.

---

## AUT · Autenticación y Control de Acceso (5)

| Código    | Historia                   |
| --------- | -------------------------- |
| US-AUT-01 | Registro de cliente        |
| US-AUT-02 | Registro de cocinero       |
| US-AUT-03 | Inicio de sesión           |
| US-AUT-04 | Recuperación de contraseña |
| US-AUT-05 | Cierre de sesión           |

## GURP · Gestión de Usuarios, Roles y Permisos (10)

| Código     | Historia                                    |
| ---------- | ------------------------------------------- |
| US-GURP-01 | Visualizar perfil propio                    |
| US-GURP-02 | Editar perfil propio                        |
| US-GURP-03 | Cambiar contraseña                          |
| US-GURP-04 | Eliminar cuenta propia                      |
| US-GURP-05 | Visualizar y buscar usuarios desde el panel |
| US-GURP-06 | Crear usuario desde el panel                |
| US-GURP-07 | Editar usuario y rol desde el panel         |
| US-GURP-08 | Suspender y rehabilitar usuario             |
| US-GURP-09 | Eliminar usuario desde el panel             |
| US-GURP-10 | Aplicar permisos por rol                    |

## AUD · Auditoría y Trazabilidad (2)

| Código    | Historia                            |
| --------- | ----------------------------------- |
| US-AUD-01 | Registro de intentos no autorizados |
| US-AUD-02 | Visualizar registros de auditoría   |

---

## PUB · Publicaciones (5)

| Código    | Historia                                    |
| --------- | ------------------------------------------- |
| US-PUB-01 | Crear publicación de plato                  |
| US-PUB-02 | Editar publicación de plato                 |
| US-PUB-03 | Eliminar publicación de plato               |
| US-PUB-04 | Gestionar disponibilidad de plato           |
| US-PUB-05 | Visualizar listado de publicaciones propias |

## EXP · Exploración y Búsqueda (7)

| Código    | Historia                              |
| --------- | ------------------------------------- |
| US-EXP-01 | Explorar feed de publicaciones        |
| US-EXP-02 | Explorar mapa de cocineros            |
| US-EXP-03 | Filtrar publicaciones                 |
| US-EXP-04 | Visualizar perfil público de cocinero |
| US-EXP-05 | Visualizar detalle de publicación     |
| US-EXP-06 | Guardar favoritos                     |
| US-EXP-07 | Gestionar carrito                     |

## PED · Pedidos (10)

| Código    | Historia                                         |
| --------- | ------------------------------------------------ |
| US-PED-01 | Confirmar pedido                                 |
| US-PED-02 | Visualizar seguimiento de pedido (cliente)       |
| US-PED-03 | Aceptar pedido como cocinero                     |
| US-PED-04 | Rechazar pedido como cocinero                    |
| US-PED-05 | Actualizar estado de pedido (Listo y Completado) |
| US-PED-06 | Visualizar historial de pedidos (cliente)        |
| US-PED-07 | Visualizar detalle de pedido (cliente)           |
| US-PED-08 | Visualizar historial de pedidos (cocinero)       |
| US-PED-09 | Cancelar pedido como cliente                     |
| US-PED-10 | Expirar pedido automáticamente                   |

## RES · Reseñas y Calificaciones (6)

| Código    | Historia                                                          |
| --------- | ----------------------------------------------------------------- |
| US-RES-01 | Dejar calificación con estrellas y reseña de un plato pedido       |
| US-RES-02 | Calificar al cliente (cocinero)                                   |
| US-RES-03 | Ver reseñas y promedio en el perfil público del cocinero          |
| US-RES-04 | Reaccionar a una reseña                                           |
| US-RES-05 | Responder una reseña (cocinero)                                   |
| US-RES-06 | Reportar reseña inapropiada                                       |

## MSG · Mensajería Directa (7)

| Código    | Historia                                          |
| --------- | ------------------------------------------------- |
| US-MSG-01 | Iniciar conversación desde el perfil del cocinero |
| US-MSG-02 | Enviar y recibir mensajes de texto                |
| US-MSG-03 | Adjuntar y enviar imágenes                        |
| US-MSG-04 | Listado de conversaciones por actividad reciente  |
| US-MSG-05 | Historial completo de una conversación            |
| US-MSG-06 | Hilo de chat asociado a un pedido                 |
| US-MSG-07 | Gestión de conversaciones ante baja de una cuenta |

## NOT · Notificaciones y Alertas (8)

| Código    | Historia                                                      |
| --------- | ------------------------------------------------------------- |
| US-NOT-01 | Push automática ante cambio de estado de un pedido relevante  |
| US-NOT-02 | Push ante mensaje nuevo en el chat                            |
| US-NOT-03 | Push al cocinero cuando el admin elimina una publicación suya |
| US-NOT-04 | Push ante aviso general del sistema                           |
| US-NOT-05 | Push al cocinero cuando recibe una reseña                     |
| US-NOT-06 | Push al cliente cuando un cocinero favorito publica           |
| US-NOT-07 | Historial de notificaciones dentro de la app                  |
| US-NOT-08 | Habilitar/deshabilitar cada tipo de notificación              |

---

## DASH · Dashboard del Cocinero (5)

| Código     | Historia                                      |
| ---------- | --------------------------------------------- |
| US-DASH-01 | Visualizar resumen general de actividad       |
| US-DASH-02 | Visualizar platos más pedidos                 |
| US-DASH-03 | Visualizar clientes recurrentes               |
| US-DASH-04 | Visualizar distribución de pedidos por estado |
| US-DASH-05 | Filtrar dashboard por periodo de tiempo       |

## ADM · Panel de Administración (5)

| Código    | Historia                                  |
| --------- | ----------------------------------------- |
| US-ADM-01 | Visualizar y buscar usuarios              |
| US-ADM-02 | Suspender y rehabilitar usuario           |
| US-ADM-03 | Eliminar usuario                          |
| US-ADM-04 | Moderar contenido publicado               |
| US-ADM-05 | Visualizar métricas generales del sistema |

## CFG · Configuración y Parámetros (6)

| Código    | Historia                                    |
| --------- | ------------------------------------------- |
| US-CFG-01 | Gestionar categorías de platos              |
| US-CFG-02 | Gestionar motivos de cancelación de pedido  |
| US-CFG-03 | Configurar parámetros generales del sistema |
| US-CFG-04 | Gestionar términos y condiciones            |
| US-CFG-05 | Configurar preferencias de notificaciones   |
| US-CFG-06 | Configurar idioma de la aplicación          |

## AYU · Ayuda y Soporte al Usuario (5)

| Código    | Historia                                            |
| --------- | --------------------------------------------------- |
| US-AYU-01 | Manual de usuario integrado en la aplicación        |
| US-AYU-02 | Preguntas frecuentes diferenciadas por rol          |
| US-AYU-03 | Enviar consulta, sugerencia o reporte de incidencia |
| US-AYU-04 | Acceder a la información legal y datos de contacto  |
| US-AYU-05 | Gestionar contenido del manual y las FAQ (admin)    |

---

> **Nota.** Los módulos ADM y GURP se solapan en la gestión de usuarios: ADM
> describe la funcionalidad desde el punto de vista del panel y GURP desde el de
> la entidad usuario. Al implementar, seguí GURP para las operaciones sobre
> cuentas y ADM para las vistas y métricas del panel.
