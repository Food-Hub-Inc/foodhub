import { z } from 'zod';
import { emailSchema } from './auth.schema.js';
import { MENSAJES_AYUDA } from '../constants/mensajes.js';

/**
 * Contratos del modulo de Informacion legal (US-AYU-04).
 *
 * Cubre el lado de CONSUMO de los documentos legales y de los datos de
 * contacto. La gestion (CRUD de versiones, edicion del borrador, publicacion)
 * sigue viviendo en US-CFG-04 / RF058 y se importa desde
 * `terminos.schema.ts`; este archivo NO duplica esos contratos porque los
 * productores son los mismos.
 *
 * La pantalla de re-aceptacion obligatoria (US-CFG-04, ultimo criterio)
 * sigue usando `terminosVigentesParaAceptarSchema` con `contenidoHtml` y
 * `numeroVersion` solamente: no necesita la metadata que esta historia exige
 * mostrar. PAN-AYU-04 necesita `fechaPublicacion` para la "fecha de ultima
 * actualizacion" del encabezado y `adminAutor` para la trazabilidad visible
 * que el criterio de aceptacion no nombra pero el admin si quiere ver.
 */

/**
 * Autor administrativo de una version. Es `nullable` porque `version_terminos`
 * guarda `admin_autor_id` con `set null` en la FK: si el administrador que
 * publico la version es dado de baja, la version sigue siendo vigente y
 * necesitamos poder representarla sin autor.
 */
const autorSchema = z
  .object({
    nombre: z.string(),
    apellido: z.string(),
  })
  .nullable();

/**
 * US-AYU-04 - Un documento legal vigente (terminos o politica de privacidad)
 * listo para mostrar en PAN-AYU-04.
 *
 * Mas rico que `terminosVigentesParaAceptarSchema`: agrega `fechaPublicacion`
 * para la leyenda del encabezado y `adminAutor` para la trazabilidad visible.
 */
export const documentoLegalVigenteSchema = z.object({
  id: z.uuid(),
  numeroVersion: z.number().int().positive(),
  contenidoHtml: z.string(),
  fechaPublicacion: z.iso.datetime(),
  adminAutor: autorSchema,
});
export type DocumentoLegalVigente = z.infer<typeof documentoLegalVigenteSchema>;

/**
 * US-AYU-04 - Datos de contacto que ve el usuario en "Contacto del soporte".
 * El correo y el horario se leen de `configuracion_sistema` (RF057); los
 * nombres de las claves viven en `CLAVE_PARAMETRO.plataformaCorreoSoporte` y
 * `CLAVE_PARAMETRO.plataformaHorarioAtencionSoporte`.
 */
export const informacionDeContactoSchema = z.object({
  correo: emailSchema,
  horarioAtencion: z
    .string()
    .trim()
    .min(1, MENSAJES_AYUDA.contacto.horarioVacio),
});
export type InformacionDeContacto = z.infer<typeof informacionDeContactoSchema>;
