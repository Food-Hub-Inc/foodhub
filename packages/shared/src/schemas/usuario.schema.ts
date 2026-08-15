import { z } from 'zod';
import { ESTADO_CUENTA, TIPO_USUARIO } from '../constants/enums.js';
import { MENSAJES_AUTH, MENSAJES_USUARIO } from '../constants/mensajes.js';
import {
  emailSchema,
  passwordSchema,
  perfilUsuarioSchema,
  ubicacionSchema,
} from './auth.schema.js';

/**
 * Contratos del modulo de Gestion de Usuarios, Roles y Permisos
 * (US-GURP-01 a US-GURP-10).
 *
 * Se separan en dos grupos, porque son dos superficies distintas con reglas
 * distintas:
 *
 *   PERFIL PROPIO   lo edita el dueno de la cuenta desde PAN-GURP-01. Nunca
 *                   puede cambiar su propio rol ni su estado de cuenta.
 *   PANEL ADMIN     lo opera un administrador desde PAN-ADM-01. Si puede
 *                   cambiar rol y estado, pero no puede tocar contrasenas
 *                   ajenas ni dejar al sistema sin administradores.
 *
 * Mantener los dos schemas separados es lo que impide que un cliente se
 * ascienda a administrador mandando `tipo` en el body de "editar mi perfil":
 * el campo directamente no existe en ese contrato.
 */

const nombreSchema = z
  .string()
  .trim()
  .min(2, 'Debe tener al menos 2 caracteres.')
  .max(60, 'No puede superar los 60 caracteres.');

// ---------------------------------------------------------------------------
// Perfil propio (US-GURP-01 a US-GURP-04) - PAN-GURP-01
// ---------------------------------------------------------------------------

/**
 * US-GURP-02 - Edicion del perfil propio.
 *
 * RF088 acota los campos editables a nombre, apellido, foto y, en el caso del
 * cocinero, descripcion publica y ubicacion. El correo NO es editable: es la
 * identidad de la cuenta en Supabase Auth y cambiarlo exige un flujo de
 * verificacion propio que la documentacion no define.
 *
 * Todos los campos son opcionales para admitir la edicion parcial: el
 * formulario manda solo lo que el usuario toco.
 */
export const editarPerfilSchema = z
  .object({
    nombre: nombreSchema.optional(),
    apellido: nombreSchema.optional(),
    // `nullable` y no solo opcional: quitar la foto de perfil es una edicion
    // valida, y hay que poder distinguirla de "no toque este campo".
    fotoPerfilUrl: z.url().nullable().optional(),
    descripcionPublica: z
      .string()
      .trim()
      .max(500, 'La descripción no puede superar los 500 caracteres.')
      .nullable()
      .optional(),
    ubicacion: ubicacionSchema.optional(),
  })
  .refine((datos) => Object.keys(datos).length > 0, {
    message: 'No hay cambios para guardar.',
  });

/**
 * US-GURP-03 - Cambio de contrasena.
 *
 * Pide la contrasena actual aunque la sesion ya este iniciada: sin eso,
 * cualquiera que encuentre el telefono desbloqueado se apodera de la cuenta.
 * La verificacion real la hace Supabase Auth reautenticando con ese valor.
 */
export const cambiarPasswordSchema = z
  .object({
    passwordActual: z.string().min(1, 'Ingresá tu contraseña actual.'),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((datos) => datos.password === datos.confirmPassword, {
    // El mismo literal que exigen US-AUT-01, US-AUT-02 y US-AUT-04: el usuario
    // no tiene por que ver dos redacciones distintas del mismo error.
    message: MENSAJES_AUTH.contrasenasNoCoinciden,
    path: ['confirmPassword'],
  })
  .refine((datos) => datos.password !== datos.passwordActual, {
    message: MENSAJES_USUARIO.contrasenaNuevaIgualAActual,
    path: ['password'],
  });

/**
 * US-GURP-04 - Baja de la cuenta propia.
 *
 * El body exige una confirmacion explicita en lugar de ser un DELETE vacio:
 * una baja irreversible no puede dispararse por una request accidental o por
 * un retry automatico del cliente.
 */
export const eliminarCuentaPropiaSchema = z.object({
  confirmacion: z.literal(true, {
    message: 'Confirmá que querés eliminar tu cuenta.',
  }),
});

// ---------------------------------------------------------------------------
// Panel de administracion (US-GURP-05 a US-GURP-09) - PAN-ADM-01
// ---------------------------------------------------------------------------

/**
 * US-GURP-05 - Listado, busqueda y filtros del panel.
 *
 * `busqueda` cubre nombre, apellido y correo en un unico campo, tal como lo
 * pide el segundo criterio de aceptacion y lo muestra la maquetacion: un solo
 * input, no tres.
 */
export const filtrosUsuarioSchema = z.object({
  busqueda: z.string().trim().max(120).optional(),
  tipo: z.enum(TIPO_USUARIO).optional(),
  estadoCuenta: z.enum(ESTADO_CUENTA).optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * US-GURP-06 - Alta de usuario desde el panel.
 *
 * DOS DECISIONES DEL EQUIPO ESTAN CODIFICADAS ACA:
 *
 * 1. No hay campo de contrasena. La cuenta se crea por invitacion: Supabase
 *    manda un correo y el usuario define su propia credencial. Asi el
 *    administrador nunca conoce la contrasena de otra persona.
 *
 * 2. El rol admite CLIENTE y ADMINISTRADOR, no COCINERO. La base exige
 *    ubicacion para el cocinero (CHECK usuario_cocinero_con_ubicacion) y el
 *    criterio de aceptacion de US-AUT-02 la define como "detectada por el GPS
 *    del dispositivo": el alta de cocinero ocurre desde la app.
 */
export const crearUsuarioPanelSchema = z.object({
  nombre: nombreSchema,
  apellido: nombreSchema,
  email: emailSchema,
  tipo: z.enum(['CLIENTE', 'ADMINISTRADOR'], {
    message: MENSAJES_USUARIO.rolInvalido,
  }),
});

/**
 * US-GURP-07 - Edicion de datos administrativos y rol.
 *
 * El destino del rol se acota por el mismo motivo que en el alta. La regla de
 * "al menos un administrador activo" no se puede validar aca porque depende
 * del estado de la base: la aplica el servicio antes de escribir.
 */
export const editarUsuarioPanelSchema = z
  .object({
    nombre: nombreSchema.optional(),
    apellido: nombreSchema.optional(),
    tipo: z
      .enum(['CLIENTE', 'ADMINISTRADOR'], {
        message: MENSAJES_USUARIO.rolInvalido,
      })
      .optional(),
  })
  .refine((datos) => Object.keys(datos).length > 0, {
    message: 'No hay cambios para guardar.',
  });

/**
 * US-GURP-08 - Suspension de una cuenta.
 *
 * El motivo es obligatorio por criterio de aceptacion: "solicite confirmacion
 * y un motivo obligatorio de suspension". Queda guardado en
 * `usuario.motivo_suspension` para que el soporte pueda explicarle al usuario
 * por que perdio el acceso.
 */
export const suspenderUsuarioSchema = z.object({
  motivo: z
    .string()
    .trim()
    .min(1, MENSAJES_USUARIO.motivoSuspensionObligatorio)
    .max(500, 'El motivo no puede superar los 500 caracteres.'),
});

/** US-GURP-09 - Baja logica desde el panel. */
export const eliminarUsuarioPanelSchema = z.object({
  confirmacion: z.literal(true, {
    message: 'Confirmá la baja de la cuenta.',
  }),
});

// ---------------------------------------------------------------------------
// Respuestas
// ---------------------------------------------------------------------------

/**
 * Fila del listado de PAN-ADM-01. RF091 fija exactamente estas columnas:
 * nombre, apellido, correo, rol, estado de cuenta y fecha de registro.
 */
export const usuarioListadoSchema = perfilUsuarioSchema.pick({
  id: true,
  nombre: true,
  apellido: true,
  email: true,
  tipo: true,
  estadoCuenta: true,
  fotoPerfilUrl: true,
  fechaRegistro: true,
});

/** Envoltorio de las respuestas paginadas del panel. */
export const paginaUsuariosSchema = z.object({
  datos: z.array(usuarioListadoSchema),
  total: z.number().int().min(0),
  pagina: z.number().int().min(1),
  porPagina: z.number().int().min(1),
});

export type EditarPerfilInput = z.infer<typeof editarPerfilSchema>;
export type CambiarPasswordInput = z.infer<typeof cambiarPasswordSchema>;
export type EliminarCuentaPropiaInput = z.infer<
  typeof eliminarCuentaPropiaSchema
>;
export type FiltrosUsuario = z.infer<typeof filtrosUsuarioSchema>;
export type CrearUsuarioPanelInput = z.infer<typeof crearUsuarioPanelSchema>;
export type EditarUsuarioPanelInput = z.infer<typeof editarUsuarioPanelSchema>;
export type SuspenderUsuarioInput = z.infer<typeof suspenderUsuarioSchema>;
export type UsuarioListado = z.infer<typeof usuarioListadoSchema>;
export type PaginaUsuarios = z.infer<typeof paginaUsuariosSchema>;
