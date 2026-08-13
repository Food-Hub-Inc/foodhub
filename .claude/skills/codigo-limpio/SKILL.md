---
name: codigo-limpio
description: 'Principios de Código Limpio, SOLID y patrones de diseño aplicados al stack de FoodHub (TypeScript, React, React Native, Express, Drizzle). Usar ANTES de escribir un módulo o servicio nuevo, al revisar código en un pull request, cuando una función supere los umbrales de complejidad de ESLint, o cuando haya que decidir dónde poner una responsabilidad. Palabras clave: clean code, SOLID, patrones de diseño, design patterns, refactor, code smell, responsabilidad única, inyección de dependencias, acoplamiento, cohesión, nombres, revisión de código, complejidad ciclomática.'
metadata:
  proyecto: FoodHub - UTN FRM - Grupo 21
  version: '1.0.0'
---

# Código limpio, SOLID y patrones de diseño

Esta skill traduce principios abstractos a decisiones concretas sobre **este**
código. No es un resumen de un libro: cada regla viene con la forma en que se
verifica y con el ejemplo que corresponde al stack de FoodHub.

## Cómo usar esta skill

1. **Antes de escribir**: leé la sección del principio que aplica.
2. **Al terminar**: pasá la [lista de verificación](#lista-de-verificación).
3. **Si dudás dónde va una responsabilidad**: mirá
   [Arquitectura por capas](#arquitectura-por-capas-de-la-api).

Los umbrales no son opinión: están configurados en `eslint.config.mjs` y el CI
los aplica con `--max-warnings 0`.

---

## Capítulo 1 — Nombres

Un nombre bien elegido elimina la necesidad de un comentario.

| Regla                          | Mal                              | Bien                                |
| ------------------------------ | -------------------------------- | ----------------------------------- |
| Revelá la intención            | `const d = 15`                   | `const minutosExpiracion = 15`      |
| Sin abreviaturas inventadas    | `usrPedCnt`                      | `cantidadPedidosUsuario`            |
| Booleanos en forma de pregunta | `estado`                         | `estaDisponible`, `puedeEditar`     |
| Funciones: verbo + sustantivo  | `pedido()`                       | `crearPedido()`, `expirarPedidos()` |
| Sin sufijos de tipo            | `listaPedidosArray`              | `pedidos`                           |
| Una sola palabra por concepto  | `traer/obtener/buscar` mezclados | elegir uno y sostenerlo             |

**En FoodHub el dominio se nombra en español** (`usuario`, `pedido`,
`crearPedido`) y los términos técnicos en inglés (`Router`, `Provider`,
`middleware`). No mezclar dentro de un mismo identificador.

---

## Capítulo 2 — Funciones

**Hacen una sola cosa.** Si al describir qué hace una función necesitás la
palabra "y", son dos funciones.

Umbrales verificados por ESLint:

| Regla                    | Límite | Qué indica superarlo                           |
| ------------------------ | ------ | ---------------------------------------------- |
| `complexity`             | 12     | demasiados caminos: extraé las ramas           |
| `max-depth`              | 4      | anidamiento: usá cláusulas de guarda           |
| `max-lines-per-function` | 80     | la función hace más de una cosa                |
| `max-params`             | 4      | los parámetros son un objeto que falta nombrar |

### Cláusulas de guarda en vez de anidar

```ts
// ❌ el camino feliz queda enterrado
function aceptarPedido(pedido: Pedido, usuario: Usuario) {
  if (usuario.tipo === 'COCINERO') {
    if (pedido.cocineroPedidoId === usuario.id) {
      if (pedido.estadoPedidoActual === 'CREADO') {
        return transicionar(pedido, 'ACEPTADO');
      }
    }
  }
  throw new Error('no se puede');
}

// ✅ cada condición sale temprano con SU error, y el resultado queda al final
function aceptarPedido(pedido: Pedido, usuario: Usuario) {
  if (usuario.tipo !== 'COCINERO') throw noAutorizado();
  if (pedido.cocineroPedidoId !== usuario.id) throw noAutorizado();
  if (pedido.estadoPedidoActual !== 'CREADO') {
    throw new AppError(409, 'Este pedido ya fue respondido.');
  }
  return transicionar(pedido, 'ACEPTADO');
}
```

Además de leerse mejor, la segunda versión le dice al usuario **qué** falló.

### Objeto de parámetros

```ts
// ❌ en la llamada nadie sabe qué es cada valor
crearPedido(clienteId, cocineroId, items, instrucciones, true);

// ✅ autodocumentado y el orden deja de importar
crearPedido({ clienteId, cocineroId, items, instrucciones, notificar: true });
```

---

## Capítulo 3 — SOLID

### S · Responsabilidad única

Un módulo cambia por una sola razón.

En FoodHub esto se ve en la separación de `apps/api`:

```
routers/     traducen HTTP a llamadas de servicio   → cambian si cambia la API REST
services/    reglas de negocio                       → cambian si cambia el negocio
repositories/ acceso a datos                         → cambian si cambia el schema
```

Un handler que valida, consulta la base, aplica reglas y arma el JSON tiene
cuatro razones para cambiar. Cuatro responsabilidades.

También aplica a los datos: `registro_auditoria` guarda operaciones de negocio y
`evento_seguridad` guarda eventos de seguridad. Una sola tabla para ambas cosas
tendría la mitad de las columnas siempre nulas.

### O · Abierto/cerrado

Extender sin modificar. Agregar un tipo de notificación nuevo no debería obligar
a tocar un `switch` gigante:

```ts
// ❌ cada tipo nuevo modifica esta función
function armarMensaje(tipo: TipoNotificacion, datos: Datos) {
  switch (tipo) {
    case 'PEDIDO_CREADO':
      return `Nuevo pedido de ${datos.cliente}`;
    case 'PEDIDO_ACEPTADO':
      return `Tu pedido fue aceptado`;
    // ...nueve casos más
  }
}

// ✅ el tipo nuevo agrega una entrada; la función no se toca
const PLANTILLAS: Record<TipoNotificacion, (d: Datos) => string> = {
  PEDIDO_CREADO: (d) => `Nuevo pedido de ${d.cliente}`,
  PEDIDO_ACEPTADO: () => 'Tu pedido fue aceptado',
  // ...
};
```

Bonus: al tipar el registro como `Record<TipoNotificacion, ...>`, olvidarse de
un tipo nuevo **falla al compilar**.

### L · Sustitución de Liskov

Un subtipo tiene que poder usarse donde se espera el tipo base sin sorpresas. Si
`FavoritoPublicacion` hereda de `Favorito` pero lanza en un método que el padre
resuelve, la herencia está mal planteada: usá composición.

### I · Segregación de interfaces

Interfaces chicas y específicas. Un componente que solo muestra el nombre del
cocinero recibe `{ nombre: string }`, no el `Cocinero` completo — así se puede
reutilizar y testear sin construir un objeto entero.

### D · Inversión de dependencias

El código de negocio depende de abstracciones, no de implementaciones.

```ts
// ❌ el servicio queda casado con Supabase: no se puede testear sin red
async function subirFoto(archivo: File) {
  const { data } = await supabase.storage.from('platos').upload(...);
  return data.path;
}

// ✅ el servicio depende de un contrato; el test inyecta uno falso
interface AlmacenDeImagenes {
  subir(archivo: File, ruta: string): Promise<string>;
}
function crearServicioPublicaciones(almacen: AlmacenDeImagenes) { /* ... */ }
```

---

## Capítulo 4 — Patrones útiles en este proyecto

| Patrón             | Dónde se usa en FoodHub                                              |
| ------------------ | -------------------------------------------------------------------- |
| **Repository**     | aislar Drizzle del servicio: el negocio no conoce SQL                |
| **Strategy**       | plantillas de notificación por tipo (ver O de SOLID)                 |
| **State machine**  | ciclo de vida del pedido: `TRANSICIONES_PEDIDO` en `@foodhub/shared` |
| **Adapter**        | envolver FCM y Supabase Storage detrás de una interfaz propia        |
| **Factory**        | `crearApp()` y `crearConexion()`: construyen sin ejecutar            |
| **Guard clause**   | middlewares `requiereAutenticacion` y `requiereRol`                  |
| **DTO / contrato** | schemas de zod en `@foodhub/shared`, compartidos por API y clientes  |

### Máquina de estados: la regla vive en un solo lugar

```ts
export const TRANSICIONES_PEDIDO = {
  CREADO: ['ACEPTADO', 'RECHAZADO'],
  ACEPTADO: ['LISTO', 'RECHAZADO'],
  LISTO: ['COMPLETADO'],
  RECHAZADO: [],
  COMPLETADO: [],
} as const;
```

Sin esta tabla, la regla queda repartida entre los handlers de aceptar,
rechazar y completar, y tarde o temprano uno queda desactualizado.

---

## Capítulo 5 — Code smells y su antídoto

| Smell                         | Señal                                                    | Antídoto                                          |
| ----------------------------- | -------------------------------------------------------- | ------------------------------------------------- |
| Número mágico                 | `if (minutos > 15)`                                      | constante nombrada o `configuracion_sistema`      |
| Código duplicado              | el mismo bloque en 3 lugares                             | extraer a `@foodhub/shared`                       |
| Función larga                 | ESLint avisa a las 80 líneas                             | extraer pasos con nombre                          |
| Comentario que explica el qué | `// suma 1 al contador`                                  | reescribir el código, borrar el comentario        |
| Booleano como parámetro       | `guardar(pedido, true)`                                  | dos funciones, o un objeto con nombre             |
| Envidia de atributos          | una función usa más datos de otra clase que de la propia | mover la función                                  |
| Obsesión por primitivos       | `string` para todo                                       | tipos del dominio (`TipoUsuario`, `EstadoPedido`) |
| Cadena de `null`              | `a?.b?.c?.d`                                             | revisar el modelo: algo debería ser obligatorio   |

---

## Capítulo 6 — Comentarios

**El mejor comentario es el que no hizo falta escribir.** El código dice _qué_;
el comentario explica _por qué_.

```ts
// ❌ ruido: repite lo que el código ya dice
// Incrementa el contador
contador++;

// ✅ información que el código NO puede expresar
// El pooler de Supabase en modo transaction no conserva estado entre
// sentencias, y los prepared statements dependen de él: la segunda ejecución
// de la misma consulta falla.
prepare: false,
```

Comentá siempre: decisiones no obvias, límites de servicios externos, reglas de
negocio con origen documental, y workarounds (con enlace al issue).

---

## Arquitectura por capas de la API

```
Request HTTP
    ↓
middleware        autenticación, rol, rate limit   ← transversal
    ↓
router            traduce HTTP ↔ dominio           ← sin reglas de negocio
    ↓
service           reglas de negocio                ← sin SQL ni objetos de Express
    ↓
repository        acceso a datos con Drizzle       ← sin reglas de negocio
    ↓
PostgreSQL
```

Reglas de la frontera:

- Un **router** no consulta la base directamente.
- Un **service** no recibe `req` ni `res`: recibe datos ya validados.
- Un **repository** no decide nada: consulta y devuelve.
- Los **contratos zod** viven en `@foodhub/shared` y los usan los dos extremos.

---

## Lista de verificación

Antes de abrir un pull request:

- [ ] Cada función hace una sola cosa y su nombre lo dice
- [ ] Sin números mágicos: constantes nombradas o parámetros del sistema
- [ ] Sin duplicación: lo repetido está en `@foodhub/shared`
- [ ] La lógica de negocio está en `services/`, no en el router
- [ ] Las entradas se validan con un schema de zod compartido
- [ ] Los errores usan `AppError`; el usuario nunca ve un stack trace
- [ ] Los comentarios explican **por qué**, no **qué**
- [ ] `pnpm lint && pnpm typecheck && pnpm test` pasan los tres
- [ ] Sin `console.log` de depuración (el logger es `pino`)
- [ ] Sin `any` nuevo sin una justificación escrita al lado

---

## Referencias

- Robert C. Martin, _Clean Code_ (2008) — capítulos 2, 3 y 4
- Robert C. Martin, _Agile Software Development: Principles, Patterns and Practices_ — SOLID
- Gamma, Helm, Johnson, Vlissides, _Design Patterns_ (1994)
- Martin Fowler, _Refactoring_ (2ª ed., 2018) — catálogo de code smells
