import { sql } from 'drizzle-orm';
import {
  boolean,
  geometry,
  index,
  integer,
  pgSchema,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import {
  estadoCuentaEnum,
  estadoVersionTerminosEnum,
  tipoEventoSeguridadEnum,
  tipoUsuarioEnum,
} from './enums.js';
import { zonaCobertura } from './catalogo.js';

/**
 * Modulo transversal de usuarios, autenticacion y seguridad.
 *
 * DECISION DE ARQUITECTURA (Etapa 6): la autenticacion la resuelve
 * Supabase Auth (GoTrue). Las credenciales, las sesiones y los tokens de
 * recuperacion viven en el esquema interno `auth` de Supabase y NO se
 * replican aca. Por eso el diagrama V4 elimino las clases Sesion,
 * SolicitudRecuperacionContrasena e IntentoLoginFallido que tenia el V3.
 */

/**
 * Referencia de solo lectura a `auth.users`, la tabla que administra GoTrue.
 *
 * Se declara para que la FK de `usuario` tenga tipo, pero drizzle-kit no la
 * gestiona: `schemaFilter: ['public']` en drizzle.config.ts impide que las
 * migraciones intenten crearla o modificarla.
 */
const authSchema = pgSchema('auth');
export const authUsers = authSchema.table('users', {
  id: uuid('id').primaryKey(),
});

/**
 * Diagrama: Usuario (+ subtipos Cliente, Cocinero, Administrador).
 *
 * Los tres subtipos se resuelven con el discriminador `tipo` sobre una unica
 * tabla, porque Cliente y Administrador no agregan ningun atributo propio.
 * Cocinero si los agrega, asi que va en su propia tabla 1:1 (ver abajo).
 * Esto evita las tablas vacias que produciria un "table per subclass" literal.
 */
export const usuario = pgTable(
  'usuario',
  {
    /**
     * MISMO id que auth.users. No se genera aca: lo emite GoTrue al registrar
     * al usuario y el perfil se crea despues con ese id. `onDelete: cascade`
     * garantiza que borrar la cuenta en Supabase borre tambien el perfil.
     */
    id: uuid('id')
      .primaryKey()
      .references(() => authUsers.id, { onDelete: 'cascade' }),

    nombre: varchar('nombre', { length: 60 }).notNull(),
    apellido: varchar('apellido', { length: 60 }).notNull(),

    /**
     * Copia desnormalizada del email de auth.users. Se mantiene aca porque el
     * panel de administracion lista y filtra usuarios por correo (US-AUD-02,
     * US-GURP-05) y hacerlo contra el esquema `auth` en cada consulta obligaria
     * a usar la service role key en operaciones de solo lectura.
     */
    email: varchar('email', { length: 255 }).notNull(),

    tipo: tipoUsuarioEnum('tipo').notNull(),
    fotoPerfilUrl: text('foto_perfil_url'),
    idiomaPreferido: varchar('idioma_preferido', { length: 10 })
      .notNull()
      .default('es-AR'),

    /**
     * Ubicacion declarada por el usuario, en SRID 4326. Alimenta el feed por
     * proximidad y el mapa de cocineros cercanos (alcance 2.2.2.2.2).
     * Es opcional: el cliente puede navegar sin compartir su ubicacion.
     */
    ubicacion: geometry('ubicacion', {
      type: 'point',
      mode: 'xy',
      srid: 4326,
    }),

    // --- Estado de la cuenta -------------------------------------------------
    // El diagrama modela EstadoCuenta como clase, pero sus valores son fijos
    // (activa / suspendida / eliminada) y no admiten ABM: se traduce a ENUM.
    estadoCuenta: estadoCuentaEnum('estado_cuenta').notNull().default('ACTIVA'),
    motivoSuspension: text('motivo_suspension'),

    // --- Terminos y condiciones (US-AUT-01, US-AUT-02) -----------------------
    terminosAceptados: boolean('terminos_aceptados').notNull().default(false),
    fechaAceptacionTerminos: timestamp('fecha_aceptacion_terminos', {
      withTimezone: true,
    }),
    versionTerminosAceptadaId: uuid('version_terminos_aceptada_id'),

    fechaRegistro: timestamp('fecha_registro', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('usuario_email_idx').on(t.email),
    index('usuario_tipo_idx').on(t.tipo),
    // Indice geoespacial parcial: solo tiene sentido buscar por proximidad
    // entre quienes declararon ubicacion.
    index('usuario_ubicacion_gix')
      .using('gist', t.ubicacion)
      .where(sql`${t.ubicacion} is not null`),
  ],
);

/**
 * Diagrama: Cocinero. Atributos exclusivos del rol, en relacion 1:1 con
 * usuario. Solo existe fila si `usuario.tipo = 'COCINERO'`.
 */
export const cocinero = pgTable(
  'cocinero',
  {
    usuarioId: uuid('usuario_id')
      .primaryKey()
      .references(() => usuario.id, { onDelete: 'cascade' }),
    descripcionPublica: varchar('descripcion_publica', { length: 500 }),
    zonaCoberturaId: uuid('zona_cobertura_id')
      .notNull()
      .references(() => zonaCobertura.id, { onDelete: 'restrict' }),
  },
  (t) => [index('cocinero_zona_idx').on(t.zonaCoberturaId)],
);

/**
 * Diagrama: VersionTerminos. Historial de versiones de los terminos y
 * condiciones. Se conservan todas: al aceptar, el usuario queda vinculado a la
 * version concreta que leyo, dato necesario ante un reclamo posterior.
 */
export const versionTerminos = pgTable(
  'version_terminos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    numeroVersion: integer('numero_version').notNull(),
    tipo: varchar('tipo', { length: 40 }).notNull(),
    contenidoHtml: text('contenido_html').notNull(),
    fechaPublicacion: timestamp('fecha_publicacion', { withTimezone: true })
      .notNull()
      .defaultNow(),
    adminAutorId: uuid('admin_autor_id').references(() => usuario.id, {
      onDelete: 'set null',
    }),
    estadoVersionTerminos: estadoVersionTerminosEnum(
      'estado_version_terminos',
    ).notNull(),
  },
  (t) => [
    index('version_terminos_estado_idx').on(t.estadoVersionTerminos),
    index('version_terminos_numero_idx').on(t.tipo, t.numeroVersion),
  ],
);

/**
 * Diagrama V4: EventoSeguridad. Entidad nueva que reemplaza a
 * IntentoLoginFallido y cubre los dos criterios de aceptacion de US-AUD-01.
 *
 * Dos origenes de escritura:
 *
 *   LOGIN_FALLIDO    lo inserta un Auth Hook de Supabase. El login va del
 *                    cliente directo a GoTrue sin pasar por la API, de modo
 *                    que el backend no puede observarlo por si mismo.
 *   ACCESO_DENEGADO  lo inserta el middleware de autorizacion de la API
 *                    cuando un rol intenta un recurso que no le corresponde.
 *
 * Las columnas de identidad son nullable porque un login fallido con un correo
 * inexistente no tiene usuario asociado, y un acceso denegado si lo tiene pero
 * no tiene email intentado.
 */
export const eventoSeguridad = pgTable(
  'evento_seguridad',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tipoEvento: tipoEventoSeguridadEnum('tipo_evento').notNull(),
    emailIntentado: varchar('email_intentado', { length: 255 }),
    usuarioId: uuid('usuario_id').references(() => usuario.id, {
      onDelete: 'set null',
    }),
    recursoSolicitado: varchar('recurso_solicitado', { length: 255 }),
    ipOrigen: varchar('ip_origen', { length: 45 }), // 45 = maximo de una IPv6
    motivo: text('motivo'),
    fechaHora: timestamp('fecha_hora', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // Orden descendente: el panel de seguridad siempre muestra lo mas reciente
    // primero, y asi el indice se recorre en el sentido natural de la consulta.
    index('evento_seguridad_fecha_idx').on(t.fechaHora.desc()),
    index('evento_seguridad_tipo_idx').on(t.tipoEvento, t.fechaHora.desc()),
    index('evento_seguridad_email_idx').on(t.emailIntentado),
    index('evento_seguridad_ip_idx').on(t.ipOrigen),
  ],
);
