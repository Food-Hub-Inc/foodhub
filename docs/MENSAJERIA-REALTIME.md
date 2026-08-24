# Mensajería en tiempo real — qué hay que configurar

El módulo de Mensajería directa (US-MSG-01 a US-MSG-07) es el **primero del
sistema que usa Supabase Realtime**. El resto de la app habla siempre con la API
y nunca lee la base directo.

Este documento dice qué se aplica solo, qué tenés que hacer vos y cómo verificar
que quedó bien.

---

## Por qué este módulo sí y los demás no

El seguimiento del pedido (US-PED-02) se resolvió con revalidación periódica de
React Query, para no abrir políticas de lectura sobre la base. Un pedido cambia
de estado cuatro veces en veinte minutos: diez segundos de retraso no cambian
ninguna decisión del usuario.

El chat es otra cosa. Tres criterios de aceptación exigen "en tiempo real":

| Criterio                                                     | Historia  |
| ------------------------------------------------------------ | --------- |
| el mensaje nuevo aparece sin recargar la pantalla            | US-MSG-02 |
| el indicador pasa a "Leído" sin recargar                     | US-MSG-02 |
| "Escribiendo..." aparece y desaparece en menos de 3 segundos | US-MSG-05 |

El tercero es directamente irrealizable con consultas periódicas. Por eso el
equipo decidió (2026-08-21) habilitar Realtime **sólo para `conversacion` y
`mensaje`**.

---

## 1. La migración (la aplicás vos, con un comando)

Todo lo que se puede versionar está en
`packages/db/drizzle/0011_realtime_mensajeria.sql`. No hace falta tocar nada a
mano en el panel:

```bash
pnpm db:migrate
```

Aplica, en este orden:

1. **`public.es_participante_de(uuid)`** — función `SECURITY DEFINER` que
   responde si el usuario de la sesión participa de una conversación.
2. **Dos políticas RLS de SELECT**, sobre `conversacion` y `mensaje`, para el rol
   `authenticated` y sólo sobre las filas propias.
3. **`GRANT SELECT`** de esas dos tablas a `authenticated`.
4. **`REPLICA IDENTITY FULL`** en las dos tablas.
5. **Alta en la publicación `supabase_realtime`**.
6. **Dos políticas sobre `realtime.messages`**, para el canal privado de
   presencia y "Escribiendo...".

> **Aplicala primero contra `foodhub-dev`.** El `DATABASE_URL` del `.env` de la
> raíz es el que decide a qué proyecto va.

### Qué se abre, exactamente

|                              | ¿Se abre?                                       |
| ---------------------------- | ----------------------------------------------- |
| SELECT para `authenticated`  | **sí**, y sólo sobre las conversaciones propias |
| INSERT / UPDATE / DELETE     | **no** — todo se escribe por la API             |
| Cualquier acceso para `anon` | **no** — sin sesión no se lee nada              |

El efecto colateral a tener presente: con una política de SELECT, esas dos tablas
quedan legibles también por la API REST que Supabase expone en `/rest/v1`. Es
lectura, acotada a las conversaciones propias y con el JWT del usuario:
exactamente lo mismo que ya devuelve la API de FoodHub.

---

## 2. El paso manual que puede aparecer

`realtime.messages` pertenece al rol `supabase_realtime_admin`, no al rol con el
que corren las migraciones. En los proyectos de Supabase el rol `postgres` suele
tener permiso para declararle políticas, pero **no está garantizado**.

La migración lo contempla: si no puede, **no aborta** — emite un `WARNING` y
sigue. Buscalo en la salida de `pnpm db:migrate`:

```
WARNING: Sin permisos para declarar politicas sobre realtime.messages...
```

**Si aparece ese warning**, entrá al panel de Supabase → SQL Editor y corré esto
tal cual:

```sql
create policy foodhub_chat_recibir
  on realtime.messages
  for select
  to authenticated
  using (public.es_participante_del_topico(realtime.topic()));

create policy foodhub_chat_emitir
  on realtime.messages
  for insert
  to authenticated
  with check (public.es_participante_del_topico(realtime.topic()));
```

**Si no aparece, no hay nada que hacer.**

### Qué se pierde si esto queda sin aplicar

Sólo dos cosas, y las dos son accesorias:

- el indicador **"En línea"** de la cabecera del chat;
- el indicador **"Escribiendo..."**.

Los mensajes, el "Leído" y los contadores de no leídos siguen funcionando en
tiempo real: viajan por el otro canal, el que se autoriza con la política de la
tabla `mensaje`. Esa separación en dos canales es deliberada, justamente para
que un fallo acá no tumbe el chat entero (ver `useCanalDeChat`).

---

## 3. Storage

El bucket **`mensajes`** ya está creado. Si hiciera falta recrearlo en otro
ambiente:

```bash
supabase storage create mensajes
```

La API lo nombra con `STORAGE_BUCKET_MENSAJES`, que tiene `mensajes` como valor
por defecto: no hace falta declararlo en el `.env` salvo que se lo quiera llamar
distinto.

El tope de 8 MB que fija US-MSG-03 vive en `STORAGE_MAX_IMAGEN_CHAT_MB`, aparte
del de 5 MB de la foto de perfil y del plato: son tres criterios de aceptación
distintos.

> ⚠️ **El bucket es público.** Las URLs no son adivinables —llevan el UUID de la
> conversación y una marca de tiempo— pero quien tenga la URL de una imagen del
> chat puede abrirla sin sesión. Es el mismo modelo que ya usan `perfiles` y
> `publicaciones`. Si el equipo decide que las imágenes de una conversación
> privada merecen otro trato, hay que pasar el bucket a privado y servirlas con
> URL firmada de lectura; el cambio es acotado (`crearUrlDeCargaDeImagenChat` y
> el `Image` de la burbuja).

---

## 4. Cómo verificar que quedó bien

Con dos sesiones abiertas —cliente y cocinero— en el mismo pedido o perfil:

| Qué probar                               | Qué tiene que pasar                  |
| ---------------------------------------- | ------------------------------------ |
| A escribe un mensaje                     | aparece en B **sin recargar**        |
| B abre la conversación                   | en A el indicador pasa a **"Leído"** |
| B empieza a escribir                     | en A aparece **"Escribiendo..."**    |
| B deja de escribir 3 segundos            | el indicador **desaparece**          |
| B tiene el chat abierto                  | en A la cabecera dice **"En línea"** |
| B cierra la app                          | "En línea" desaparece                |
| A manda con B en otra pantalla de la app | el indicador pasa a **"Entregado"**  |

Si los mensajes llegan pero "Escribiendo..." y "En línea" no, el problema es el
paso 2: las políticas de `realtime.messages`.

Si **nada** llega en tiempo real, revisá en este orden:

1. que la migración 0011 esté aplicada (`select * from drizzle.__drizzle_migrations`);
2. que las tablas estén en la publicación:
   `select * from pg_publication_tables where pubname = 'supabase_realtime';`
3. que el proyecto tenga Realtime habilitado (panel → Database → Replication).

---

## Lo que este módulo NO hace

- **No manda notificaciones push** por mensaje nuevo (US-NOT-02). Es del módulo
  NOT, que todavía no existe. Ver `PENDIENTE_NOTIFICACIONES_DE_MENSAJE.md`.
- **No muestra "última conexión hace X tiempo"** (US-MSG-01). Ver
  `PENDIENTE_PRESENCIA_MENSAJERIA.md`.
