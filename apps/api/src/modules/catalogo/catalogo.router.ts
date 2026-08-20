import { Router } from 'express';
import { z } from 'zod';
import { TIPO_VERSION_TERMINOS } from '@foodhub/shared';
import { sesionDe } from '../../lib/request.js';
import { requiereAutenticacion } from '../../middleware/auth.middleware.js';
import { noAutorizado } from '../../middleware/error.middleware.js';
import * as catalogoService from './catalogo.service.js';

/**
 * Rutas de solo lectura de tablas de referencia que otros modulos consumen.
 *
 * Vive separado del modulo de Configuracion (donde se hace el ABM de estas
 * entidades) y del de Publicaciones (donde vive el dominio de platos):
 * Categoria, MotivoCancelacion y Terminos son datos de referencia que
 * Publicaciones, el flujo de rechazo/cancelacion de un pedido (US-PED-04) y
 * la pantalla de re-aceptacion obligatoria solo consultan.
 *
 * Exige sesion pero no un rol puntual: cliente, cocinero y administrador
 * necesitan las categorias por igual (el formulario de plato, los filtros del
 * feed, el ABM del panel), y cada ruta que sí necesita acotar por rol filtra
 * puntualmente la que lo requiere.
 */
export const catalogoRouter: Router = Router();

catalogoRouter.use(requiereAutenticacion);

/**
 * Valida que el parametro `:tipo` de las rutas de documentos legales sea
 * uno de los dos valores que `version_terminos.tipo` admite (es varchar en
 * la base, no un ENUM). Cualquier otro valor produce 400 VALIDACION sin
 * llegar a la base.
 */
const tipoVersionTerminosParamsSchema = z.object({
  tipo: z.enum(TIPO_VERSION_TERMINOS),
});

/** US-PUB-01 - Categorias activas para el desplegable del formulario de plato. */
catalogoRouter.get('/categorias', async (_req, res) => {
  const categorias = await catalogoService.listarCategoriasActivas();
  res.json(categorias);
});

/**
 * US-CFG-02, RF056 (consumo) - Motivos rapidos para el rol que cancela.
 * Exclusivo de cliente y cocinero: un administrador no cancela pedidos
 * propios.
 */
catalogoRouter.get('/motivos-cancelacion', async (req, res) => {
  const rol = sesionDe(req).tipo;
  if (rol !== 'COCINERO' && rol !== 'CLIENTE') {
    throw noAutorizado();
  }
  const motivos = await catalogoService.listarMotivosCancelacionRapidos(rol);
  res.json(motivos);
});

/**
 * US-CFG-04, RF058 (consumo) - Documentos vigentes para la pantalla de
 * re-aceptación obligatoria. Cualquier usuario autenticado: es la misma
 * pantalla que se le muestra a cualquiera con `debeAceptarTerminos`, sin
 * distinción de rol.
 */
catalogoRouter.get('/terminos-vigentes', async (_req, res) => {
  const vigentes = await catalogoService.obtenerTerminosVigentesParaAceptar();
  res.json(vigentes);
});

/**
 * US-AYU-04 - Documento legal vigente de un tipo (terminos o privacidad)
 * para PAN-AYU-04. A diferencia del endpoint anterior, este devuelve la
 * `fechaPublicacion` y el `adminAutor` para que la pantalla pueda
 * mostrar "Ultima actualizacion: ..." y la trazabilidad visible.
 */
catalogoRouter.get('/terminos-vigentes/:tipo', async (req, res) => {
  const { tipo } = tipoVersionTerminosParamsSchema.parse(req.params);
  const documento = await catalogoService.obtenerDocumentoLegalVigente(tipo);
  res.json(documento);
});

/**
 * US-AYU-04 - Correo electronico y horario de atencion del equipo de
 * soporte, para "Contacto del soporte" de PAN-AYU-04. Se leen de
 * `configuracion_sistema` (claves plataforma_correo_soporte y
 * plataforma_horario_atencion_soporte).
 */
catalogoRouter.get('/informacion-de-contacto', async (_req, res) => {
  const contacto = await catalogoService.obtenerInformacionDeContacto();
  res.json(contacto);
});
