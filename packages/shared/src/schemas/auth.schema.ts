import { z } from 'zod';
import { TIPO_USUARIO } from '../constants/enums.js';

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
  .min(8, 'La contraseña debe tener al menos 8 caracteres.')
  .max(72, 'La contraseña no puede superar los 72 caracteres.')
  .regex(/[a-z]/, 'La contraseña debe incluir al menos una letra minúscula.')
  .regex(/[A-Z]/, 'La contraseña debe incluir al menos una letra mayúscula.')
  .regex(/[0-9]/, 'La contraseña debe incluir al menos un número.');

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Ingresá un correo electrónico válido.');

const nombreSchema = z
  .string()
  .trim()
  .min(2, 'Debe tener al menos 2 caracteres.')
  .max(60, 'No puede superar los 60 caracteres.');

/** Campos comunes a los dos formularios de registro (US-AUT-01 y US-AUT-02). */
const registroBase = z.object({
  nombre: nombreSchema,
  apellido: nombreSchema,
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  fotoPerfilUrl: z.url().optional(),
  terminosAceptados: z.literal(true, {
    message: 'Debés aceptar los términos para continuar.',
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
  message: 'Las contraseñas no coinciden.',
  path: ['confirmPassword'],
};

/** US-AUT-01 - Registro de cliente. */
export const registroClienteSchema = registroBase.refine(
  passwordsCoinciden,
  errorNoCoinciden,
);

/** US-AUT-02 - Registro de cocinero: agrega zona y descripcion publica. */
export const registroCocineroSchema = registroBase
  .extend({
    zonaCoberturaId: z.uuid('Seleccioná una zona de cobertura.'),
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

/** Perfil devuelto por la API una vez autenticado el usuario. */
export const perfilUsuarioSchema = z.object({
  id: z.uuid(),
  nombre: z.string(),
  apellido: z.string(),
  email: z.email(),
  tipo: z.enum(TIPO_USUARIO),
  fotoPerfilUrl: z.url().nullable(),
  estadoCuenta: z.string(),
});

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
