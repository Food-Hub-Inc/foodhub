# Capítulo 06 · Pantallas

Fuente: `../Docs/FoodHub - Pantallas Mockup FoodHub.pdf` (77 páginas, 30+
pantallas con 11 estados alternativos, 2 reportes y mapa de navegación).

**Antes de implementar una pantalla, abrí el PDF en la página de su código.** Este
capítulo es un índice, no un reemplazo del mockup: los estados de error, los
textos exactos y las medidas están en el documento.

---

## Inventario

| Código      | Pantalla                  | Rol      |
| ----------- | ------------------------- | -------- |
| PAN-AUT-00  | Bienvenida                | todos    |
| PAN-AUT-01  | Registro cliente          | público  |
| PAN-AUT-02  | Registro cocinero         | público  |
| PAN-AUT-03  | Iniciar sesión            | público  |
| PAN-AUT-04  | Recuperar contraseña      | público  |
| PAN-AUT-05  | Restablecer contraseña    | público  |
| PAN-EXP-01  | Feed                      | cliente  |
| PAN-EXP-02  | Mapa de cocineros         | cliente  |
| PAN-EXP-03  | Filtros                   | cliente  |
| PAN-EXP-04  | Perfil del cocinero       | cliente  |
| PAN-EXP-05  | Detalle de publicación    | cliente  |
| PAN-PUB-01  | Mis publicaciones         | cocinero |
| PAN-PUB-02  | Nueva publicación         | cocinero |
| PAN-PUB-03  | Editar publicación        | cocinero |
| PAN-PED-01  | Carrito                   | cliente  |
| PAN-PED-02  | Confirmación de pedido    | cliente  |
| PAN-PED-03  | Seguimiento del pedido    | cliente  |
| PAN-PED-04  | Mis pedidos / Nuevos      | cocinero |
| PAN-PED-05  | Historial de pedidos      | ambos    |
| PAN-PED-06  | Detalle del pedido        | ambos    |
| PAN-RES-01  | Dejar reseña              | cliente  |
| PAN-RES-02  | Mis reseñas               | ambos    |
| PAN-MSG-01  | Lista de conversaciones   | ambos    |
| PAN-MSG-02  | Conversación              | ambos    |
| PAN-NOT-01  | Notificaciones            | ambos    |
| PAN-DASH-01 | Mi actividad (dashboard)  | cocinero |
| PAN-GURP-01 | Mi perfil                 | todos    |
| PAN-ADM-01  | Gestión de usuarios       | admin    |
| PAN-ADM-02  | Moderación de contenido   | admin    |
| PAN-ADM-03  | Métricas generales        | admin    |
| PAN-ADM-04  | Configuración del sistema | admin    |
| PAN-AUD-01  | Registros de auditoría    | admin    |

Reportes: **REP-01** (dashboard del cocinero) · **REP-02** (métricas del panel).

---

## Navegación de entrada

```
PAN-AUT-00 · Bienvenida
   ├── Registrarse como cliente  → PAN-AUT-01 → éxito → PAN-EXP-01 (feed)
   ├── Registrarse como cocinero → PAN-AUT-02 → éxito → PAN-PUB-01 (mis publicaciones)
   └── Iniciar sesión            → PAN-AUT-03 → según rol
                                       └── ¿Olvidaste tu contraseña? → PAN-AUT-04
```

La pantalla de bienvenida **no tiene formulario de login**: son tres caminos
hacia registro o ingreso.

---

## Los cuatro estados de toda pantalla con datos

El mockup documenta 11 estados alternativos (validación fallida, listas vacías,
sin conexión…). Toda pantalla que carga datos implementa los cuatro:

```
cargando  → skeleton con la forma del contenido real
vacío     → ilustración + explicación + acción sugerida
error     → qué pasó, en lenguaje humano, + reintentar
con datos → el caso feliz
```

Un estado vacío que dice solo "Sin resultados" está sin terminar.

---

## Guía visual

La sección 00 del PDF define los tokens del sistema: paleta, tipografía
(Plus Jakarta Sans), componentes base, radios y sistema de iconografía
(stroke 1.75, viewBox 24×24).

Los valores exactos, ya transcritos y listos para usar, están en la skill
**`ux-ui-foodhub`**. Los tokens en código viven en `apps/admin/src/styles/global.css`
y `apps/mobile/global.css`.

**No escribas un color ni un tamaño literal en un componente.**
