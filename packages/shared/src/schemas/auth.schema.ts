import { z } from 'zod';
import { ESTADO_CUENTA, TIPO_USUARIO } from '../constants/enums.js';
import { MENSAJES_AUTH, MENSAJES_VALIDACION } from '../constants/mensajes.js';

/**
 * Contratos de entrada del modulo de Autenticacion y Control de Acceso.
 *
 * Se definen una sola vez y se usan en los dos extremos:
 *   - la API valida con ellos el body de cada request antes de tocar la base;
 *   - los formularios de mobile y admin validan con los mismos schemas.
 *
 * Eso garantiza que el mensaje de error que ve el usuario sea exactamente el
 * que aplica el servidor, sin reglas duplicadas que se desincronizan.
 *
 * Los mensajes son los literales exigidos por los criterios de aceptacion de
 * US-AUT-01 a US-AUT-04; cambiarlos rompe las pruebas funcionales.
 */

/**
 * Politica de contrasenas. El minimo de 8 caracteres sale del criterio de
 * aceptacion de US-AUT-01; el resto son refuerzos del modulo de seguridad.
 * Supabase Auth aplica su propia validacion, pero se valida antes en el
 * cliente para dar el error inline sin una ida y vuelta a la red.
 */
export const passwordSchema = z
  .string()
  .min(8, MENSAJES_VALIDACION.contrasenaCorta)
  .max(72, 'La contraseña no puede superar los 72 caracteres.')
  .regex(/[a-z]/, 'La contraseña debe incluir al menos una letra minúscula.')
  .regex(/[A-Z]/, 'La contraseña debe incluir al menos una letra mayúscula.')
  .regex(/[0-9]/, 'La contraseña debe incluir al menos un número.');

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email(MENSAJES_VALIDACION.correoInvalido);

const nombreSchema = z
  .string()
  .trim()
  .min(2, 'Debe tener al menos 2 caracteres.')
  .max(60, 'No puede superar los 60 caracteres.');

/**
 * Punto geografico en WGS-84 (SRID 4326), el sistema de coordenadas del GPS.
 *
 * Se expresa como latitud/longitud porque es lo que entrega el dispositivo y lo
 * que el usuario ajusta sobre el mapa. Al persistirlo, `usuario.ubicacion` lo
 * guarda como punto PostGIS, donde el orden es (x = lng, y = lat): invertirlos
 * ubica al cocinero en otro continente sin que ninguna validacion lo detecte.
 */
export const ubicacionSchema = z.object(
  {
    lat: z
      .number()
      .min(-90, 'La latitud debe estar entre -90 y 90.')
      .max(90, 'La latitud debe estar entre -90 y 90.'),
    lng: z
      .number()
      .min(-180, 'La longitud debe estar entre -180 y 180.')
      .max(180, 'La longitud debe estar entre -180 y 180.'),
  },
  { error: 'Seleccioná tu ubicación en el mapa.' },
);

/** Campos comunes a los dos formularios de registro (US-AUT-01 y US-AUT-02). */
const registroBase = z.object({
  nombre: nombreSchema,
  apellido: nombreSchema,
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  fotoPerfilUrl: z.url().optional(),
  terminosAceptados: z.literal(true, {
    message: MENSAJES_VALIDACION.terminosSinAceptar,
  }),
});

/**
 * Comprobacion de que ambas contrasenas coinciden.
 *
 * Va como `refine` a nivel del objeto y no del campo, porque la validacion
 * depende de otro campo del mismo formulario. `path` hace que el error se
 * muestre debajo del input de confirmacion y no arriba del formulario.
 */
const passwordsCoinciden = (datos: {
  password: string;
  confirmPassword: string;
}) => datos.password === datos.confirmPassword;

// Sin `as const`: zod espera un `PropertyKey[]` mutable en `path`.
const errorNoCoinciden = {
  message: MENSAJES_AUTH.contrasenasNoCoinciden,
  path: ['confirmPassword'],
};

/** US-AUT-01 - Registro de cliente. */
export const registroClienteSchema = registroBase.refine(
  passwordsCoinciden,
  errorNoCoinciden,
);

/** US-AUT-02 - Registro de cocinero: agrega ubicacion y descripcion publica. */
export const registroCocineroSchema = registroBase
  .extend({
    /**
     * Obligatoria: el feed por cercania (RF014), el mapa (RF015) y el filtro
     * por distancia (RF017) posicionan al cocinero a partir de este punto. Sin
     * el, la cuenta se crea pero nadie la encuentra.
     */
    ubicacion: ubicacionSchema,
    descripcionPublica: z
      .string()
      .trim()
      .max(500, 'La descripción no puede superar los 500 caracteres.')
      .optional(),
  })
  .refine(passwordsCoinciden, errorNoCoinciden);

/** US-AUT-03 - Inicio de sesion. */
export const loginSchema = z.object({
  email: emailSchema,
  // En login no se aplica la politica de complejidad: si la contrasena guardada
  // es anterior a un endurecimiento de la politica, el usuario igual debe poder
  // entrar. La verificacion real la hace Supabase Auth.
  password: z.string().min(1, 'Ingresá tu contraseña.'),
});

/** US-AUT-04 - Solicitud del enlace de recuperacion. */
export const solicitarRecuperacionSchema = z.object({
  email: emailSchema,
});

/** US-AUT-04 - Definicion de la nueva contrasena. */
export const restablecerPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine(passwordsCoinciden, errorNoCoinciden);

/**
 * Perfil devuelto por la API una vez autenticado el usuario.
 *
 * US-GURP-01 exige mostrar nombre, apellido, correo, rol, estado de cuenta y
 * foto; y, si es cocinero, tambien la descripcion publica y la ubicacion. Esos
 * dos ultimos campos son opcionales aca porque solo existen para ese rol: el
 * cliente y el administrador no tienen fila en `cocinero`.
 */
export const perfilUsuarioSchema = z.object({
  id: z.uuid(),
  nombre: z.string(),
  apellido: z.string(),
  email: z.email(),
  tipo: z.enum(TIPO_USUARIO),
  fotoPerfilUrl: z.url().nullable(),
  estadoCuenta: z.enum(ESTADO_CUENTA),
  fechaRegistro: z.iso.datetime(),
  descripcionPublica: z.string().nullable().optional(),
  ubicacion: ubicacionSchema.nullable().optional(),
  /**
   * US-CFG-04 (RF058) - Si hay una versión de términos o de política de
   * privacidad más nueva que la última que este usuario aceptó. Opcional
   * porque solo lo calcula `obtenerPerfil` (GET /usuarios/yo y
   * GET /usuarios/:id); las respuestas de alta (registro, invitación desde
   * el panel) no lo necesitan — un usuario recién creado no puede deberlo.
   */
  debeAceptarTerminos: z.boolean().optional(),
});

export type Ubicacion = z.infer<typeof ubicacionSchema>;
export type RegistroClienteInput = z.infer<typeof registroClienteSchema>;
export type RegistroCocineroInput = z.infer<typeof registroCocineroSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type SolicitarRecuperacionInput = z.infer<
  typeof solicitarRecuperacionSchema
>;
export type RestablecerPasswordInput = z.infer<
  typeof restablecerPasswordSchema
>;
export type PerfilUsuario = z.infer<typeof perfilUsuarioSchema>;
