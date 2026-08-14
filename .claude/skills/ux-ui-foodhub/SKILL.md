---
name: ux-ui-foodhub
description: 'Sistema de diseño de FoodHub y principios de UX/UI aplicados con HeroUI. Usar SIEMPRE antes de crear o modificar una pantalla, componente o estilo, tanto en la app móvil (heroui-native) como en el panel de administración (@heroui/react). Contiene los tokens exactos de la guía visual aprobada en la Etapa 5. Palabras clave: UI, UX, pantalla, componente, estilo, color, tipografía, HeroUI, HeroUI Native, diseño, accesibilidad, mockup, maquetación, tokens, botón, formulario, estado vacío, error, loading, feedback.'
metadata:
  proyecto: FoodHub - UTN FRM - Grupo 21
  fuente: 'Guía visual del sistema - Etapa 5, sección 00 del PDF de maquetación'
  version: '1.0.0'
---

# Diseño de interfaz de FoodHub

Complementa las skills oficiales `heroui-native` y `heroui-react`. Aquéllas
explican **cómo se usa la librería**; ésta define **qué construimos con ella**.

## Regla número uno

> Los tokens se copian de la guía visual. No se eligen, no se aproximan y no se
> escriben literales en un componente.

Si un color, un tamaño o un radio no está en esta tabla, **no existe en
FoodHub**. Ante una necesidad no cubierta, se agrega primero a la guía visual y
recién después al código.

---

## Capítulo 1 — Tokens

Transcritos de la sección 00 del documento de maquetación (Etapa 5). Viven en
`apps/admin/src/styles/global.css` y `apps/mobile/global.css`.

### Colores

| Token                    | Valor     | Uso                               |
| ------------------------ | --------- | --------------------------------- |
| `--color-primary`        | `#EC6829` | botones primarios, íconos activos |
| `--color-primary-dark`   | `#C8521A` | estados pressed / hover           |
| `--color-secondary`      | `#6C757D` | color de apoyo (logo)             |
| `--color-background`     | `#FAFAF7` | fondo general de la app           |
| `--color-surface`        | `#FFFFFF` | fondo de cards y modales          |
| `--color-border`         | `#E6E1DC` | bordes de inputs y dividers       |
| `--color-text-primary`   | `#1F1A17` | texto principal                   |
| `--color-text-secondary` | `#57514C` | subtítulos                        |
| `--color-text-disabled`  | `#BCB6B0` | texto deshabilitado               |
| `--color-error`          | `#D92D20` | errores y acciones destructivas   |
| `--color-success`        | `#12815A` | confirmaciones                    |
| `--color-warning`        | `#B4540A` | alertas / últimas unidades        |

### Tipografía

**Plus Jakarta Sans** (Google Fonts), pesos 400/500/600/700/800.

| Estilo    | Tamaño | Peso | Uso                      |
| --------- | ------ | ---- | ------------------------ |
| `h1`      | 24 px  | 800  | headers principales      |
| `h2`      | 18 px  | 700  | subtítulos y card titles |
| `h3`      | 15 px  | 700  | sección menor            |
| `body`    | 14 px  | 400  | texto de párrafos        |
| `label`   | 12 px  | 600  | labels de formularios    |
| `caption` | 11 px  | 500  | timestamps y notas       |

En React Native cada peso es una **familia distinta**: no existe el fallback
numérico de la web. Se registran en `app/_layout.tsx` con `expo-font`.

### Radios y espaciado

Sistema basado en múltiplos de 4 px.

| Token           | Valor  |
| --------------- | ------ |
| `--radius-xs`   | 4 px   |
| `--radius-sm`   | 10 px  |
| `--radius-md`   | 14 px  |
| `--radius-lg`   | 20 px  |
| `--radius-xl`   | 28 px  |
| `--radius-full` | 9999px |

### Cómo se usan

```tsx
// ✅ el token, vía la utilidad de Tailwind
<View className="bg-surface border border-border rounded-md p-4">
  <Text className="text-h2 font-bold text-text-primary">Milanesas</Text>
  <Text className="text-caption text-text-secondary">Hace 2 min</Text>
</View>

// ❌ nunca
<View style={{ backgroundColor: '#FFFFFF', borderRadius: 14 }}>
```

---

## Capítulo 2 — Componentes base

La guía visual define estas variantes. Antes de inventar una, revisá si ya está.

**Botones:** primario · deshabilitado · secundario · ghost · destructivo ·
tamaño SM · con ícono.

**Campos de texto:** normal · foco · error (con mensaje debajo, en
`--color-error`).

**Badges de disponibilidad** (`EstadoPublicacion`):

| Estado             | Color                   |
| ------------------ | ----------------------- |
| `DISPONIBLE`       | `--color-success`       |
| `ULTIMAS_UNIDADES` | `--color-warning`       |
| `NO_DISPONIBLE`    | `--color-text-disabled` |

**Badges de estado de pedido** (`EstadoPedido`): `CREADO`, `ACEPTADO`, `LISTO`,
`COMPLETADO`, `RECHAZADO`.

**Otros:** checkbox, switch, chips de categoría, calificación con estrellas
(admite medias), avatares con iniciales.

---

## Capítulo 3 — Principios de UX aplicados

### 1. Visibilidad del estado del sistema

El usuario siempre sabe qué está pasando. Toda pantalla que carga datos tiene
**cuatro estados**, y los cuatro se diseñan:

```
cargando → skeleton con la forma del contenido real (no un spinner suelto)
vacío    → ilustración + explicación + acción sugerida
error    → qué pasó, en lenguaje humano, + botón de reintentar
con datos → el caso feliz
```

Un estado vacío que dice solo "Sin resultados" es un estado sin terminar. La
maquetación de la Etapa 5 especifica el texto exacto de varios de ellos; usalos.

### 2. Correspondencia con el mundo real

El vocabulario es el del usuario, no el de la base de datos. "Tu pedido está en
preparación", no "Estado: ACEPTADO".

### 3. Control y libertad

Toda acción destructiva se confirma y, cuando se puede, se deshace. Eliminar una
publicación abre un diálogo que nombra **qué** se elimina.

### 4. Consistencia

La misma acción se ve igual en toda la app. El botón primario está siempre en la
misma posición dentro de un formulario.

### 5. Prevención de errores

Mejor impedir el error que reportarlo: el botón "Registrarme" queda deshabilitado
hasta que el formulario sea válido (US-AUT-01), y el selector de cantidad no baja
de 1.

### 6. Reconocer antes que recordar

Las categorías se eligen de una lista de chips, no se escriben. Los filtros
ofrecen sus opciones en desplegables.

### 7. Diseño estético y minimalista

Cada elemento en pantalla compite con los demás por atención. Si no aporta a la
tarea, se saca.

### 8. Errores que ayudan a recuperarse

Los mensajes son **literales de los criterios de aceptación** y están
centralizados en `@foodhub/shared`. No los reescribas: las pruebas funcionales
de la Etapa 6 los verifican palabra por palabra.

| Situación              | Mensaje exacto                                                |
| ---------------------- | ------------------------------------------------------------- |
| Correo duplicado       | `Este correo ya esta registrado`                              |
| Contraseña corta       | `La contraseña debe tener al menos 8 caracteres.`             |
| Contraseñas distintas  | `Las contraseñas no coinciden.`                               |
| Términos sin aceptar   | `Debés aceptar los términos para continuar.`                  |
| Credenciales inválidas | `Correo electrónico o contraseña ingresados son incorrectos.` |
| Cuenta suspendida      | `Tu cuenta se encuentra suspendida. Contactá al soporte.`     |

Nota: el login **no dice** cuál de los dos datos falló. Es intencional: revelarlo
permite enumerar cuentas existentes.

---

## Capítulo 4 — Específico de móvil

- **Área táctil mínima 44 × 44 px.** Un ícono de 24 px necesita padding.
- **El pulgar manda.** Las acciones frecuentes van en la mitad inferior.
- **`SafeAreaView` siempre.** El notch y la barra de gestos tapan contenido.
- **Feedback inmediato.** Toda acción responde en menos de 100 ms, aunque sea
  con un estado de carga: en móvil no hay cursor que indique actividad.
- **Optimista donde se puede.** Marcar un favorito actualiza la UI al instante y
  revierte si el servidor rechaza.
- **La conexión se corta.** Toda pantalla contempla el caso sin red.
- **Listas largas van virtualizadas** (`FlatList`, no `ScrollView` con `.map()`).

---

## Capítulo 5 — Accesibilidad

No es opcional ni es "para después".

- **Contraste mínimo 4.5:1** en texto normal. `--color-text-primary` sobre
  `--color-surface` cumple; `--color-text-disabled` sobre `--color-background`
  **no**, y por eso solo se usa en elementos inactivos.
- **El color nunca es el único canal.** Un badge de error lleva ícono y texto,
  no solo el rojo.
- **Etiquetas para lectores de pantalla:** `accessibilityLabel` en móvil,
  `aria-label` en web. Un botón que es solo un ícono es invisible sin etiqueta.
- **Foco visible.** Se estiliza, nunca se elimina (`:focus-visible` ya está
  definido en `global.css`).
- **Todo lo operable con toque es operable con teclado** en el panel admin.

HeroUI está construido sobre React Aria, así que sus componentes ya traen roles
y manejo de foco correctos. Ese trabajo se pierde si los reemplazás por un
`<div onClick>`.

---

## Capítulo 6 — Antes de dar una pantalla por terminada

- [ ] Coincide con el mockup `PAN-XXX-NN` de la Etapa 5
- [ ] Usa solo tokens; ningún color ni tamaño literal
- [ ] Los cuatro estados están implementados (cargando, vacío, error, con datos)
- [ ] Los mensajes salen de `@foodhub/shared`, palabra por palabra
- [ ] Áreas táctiles ≥ 44 px
- [ ] Contraste verificado en textos
- [ ] Etiquetas de accesibilidad en los controles sin texto visible
- [ ] Probada con el texto más largo posible (nombres de plato de 120 caracteres)
- [ ] Probada sin conexión

---

## Dónde está cada cosa

| Necesito                      | Dónde                                            |
| ----------------------------- | ------------------------------------------------ |
| Componentes de HeroUI (móvil) | skill `heroui-native`                            |
| Componentes de HeroUI (web)   | skill `heroui-react`                             |
| El mockup de una pantalla     | `../Docs/FoodHub - Pantallas Mockup FoodHub.pdf` |
| Criterios de aceptación       | skill `foodhub`, capítulo del módulo             |
| Tokens en código              | `apps/*/global.css`                              |
