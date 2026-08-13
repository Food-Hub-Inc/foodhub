# Capítulo 05 · Módulos de información y control

Alcance 2.2.2.2.3.

---

## DASH · Dashboard del cocinero (5 historias)

Pantalla: **PAN-DASH-01 · Mi actividad**. Destinatario exclusivo: el cocinero.

| Historia   | Métrica                            |
| ---------- | ---------------------------------- |
| US-DASH-01 | resumen general de actividad       |
| US-DASH-02 | platos más pedidos                 |
| US-DASH-03 | clientes recurrentes               |
| US-DASH-04 | distribución de pedidos por estado |
| US-DASH-05 | filtro por período de tiempo       |

El filtro por período (US-DASH-05) **atraviesa a las otras cuatro**: no es una
métrica más, es un parámetro de todas. Conviene resolverlo una sola vez a nivel
de la pantalla y no repetir el rango en cada consulta.

Métricas del alcance: ventas acumuladas en el período, platos más pedidos,
clientes recurrentes, valoración promedio recibida y cantidad de pedidos por
estado.

---

## ADM · Panel de administración (5 historias)

Vive en `apps/admin` (web). Es la herramienta central de monitoreo.

| Historia  | Pantalla   | Qué hace                                               |
| --------- | ---------- | ------------------------------------------------------ |
| US-ADM-01 | PAN-ADM-01 | listado de usuarios registrados, por rol, con búsqueda |
| US-ADM-02 | PAN-ADM-01 | suspender y rehabilitar cuentas                        |
| US-ADM-03 | PAN-ADM-01 | eliminar usuario                                       |
| US-ADM-04 | PAN-ADM-02 | moderar publicaciones                                  |
| US-ADM-05 | PAN-ADM-03 | métricas generales: pedidos por período y por estado   |

**US-ADM-04 · Moderación.** Al eliminar una publicación que infringe las
políticas, el sistema **notifica al cocinero propietario** (US-NOT-03). La
publicación guarda `motivo_eliminacion_admin` y `eliminada_por_admin_id`: la
moderación queda trazada.

> ADM y GURP se solapan en la gestión de cuentas. Al implementar, seguí **GURP**
> para las operaciones sobre usuarios y **ADM** para las vistas y métricas.

---

## CFG · Configuración y parámetros (6 historias)

Permite operar el sistema sin desplegar código.

| Historia  | Qué se configura                 | Entidad                    |
| --------- | -------------------------------- | -------------------------- |
| US-CFG-01 | categorías de platos             | `categoria`                |
| US-CFG-02 | motivos de cancelación de pedido | `motivo_cancelacion`       |
| US-CFG-03 | parámetros generales del sistema | `configuracion_sistema`    |
| US-CFG-04 | términos y condiciones           | `version_terminos`         |
| US-CFG-05 | preferencias de notificaciones   | `preferencia_notificacion` |
| US-CFG-06 | idioma de la aplicación          | `usuario.idioma_preferido` |

Pantalla del administrador: PAN-ADM-04.

**US-CFG-05 y US-CFG-06 son del usuario final**, no del administrador: viven en
la configuración del perfil dentro de la app (PAN-GURP-01), no en el panel web.

**Parámetros típicos de `configuracion_sistema`:** minutos de expiración de un
pedido sin responder (US-PED-10), radio de búsqueda por defecto, tamaño máximo
de imagen.

**Los motivos de cancelación se segmentan por `tipo_usuario_cancelacion`**: un
cliente no debería poder elegir "no tengo ingredientes".

**Las versiones de términos no se pisan.** Cada una queda archivada porque el
usuario está vinculado a la versión concreta que aceptó — dato necesario ante un
reclamo posterior.

---

## AYU · Ayuda y soporte al usuario (5 historias)

| Historia  | Qué hace                                            | Entidades                          |
| --------- | --------------------------------------------------- | ---------------------------------- |
| US-AYU-01 | manual de usuario dentro de la app                  | `capitulo_ayuda`, `seccion_ayuda`  |
| US-AYU-02 | FAQ diferenciadas por rol                           | `faq`, `rol_destino`               |
| US-AYU-03 | enviar consulta, sugerencia o reporte de incidencia | `ticket_soporte`, `adjunto_ticket` |
| US-AYU-04 | información legal y datos de contacto               | `version_terminos`                 |
| US-AYU-05 | gestionar el contenido del manual y las FAQ (admin) | todas las anteriores               |

El contenido se segmenta por `rol_destino`: un cliente y un cocinero ven
capítulos y preguntas distintos. El orden de presentación lo define el
administrador (campo `orden`), porque el manual sigue una secuencia didáctica y
no el orden de carga.

Las FAQ llevan contadores de votos útil / no útil: sirven para ordenarlas por
utilidad y para detectar qué respuestas conviene reescribir.

---

## Reportes

La maquetación de la Etapa 5 define dos:

| Código | Reporte                                         |
| ------ | ----------------------------------------------- |
| REP-01 | reporte del dashboard del cocinero              |
| REP-02 | reporte de métricas del panel de administración |

El detalle de cada uno está en el PDF de maquetación.
