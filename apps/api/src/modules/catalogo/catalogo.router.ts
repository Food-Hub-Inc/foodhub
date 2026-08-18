import { Router } from 'express';
import { sesionDe } from '../../lib/request.js';
import { requiereAutenticacion } from '../../middleware/auth.middleware.js';
import { noAutorizado } from '../../middleware/error.middleware.js';
import * as catalogoService from './catalogo.service.js';

/**
 * Rutas de solo lectura de tablas de referencia que otros modulos consumen.
 *
 * Vive separado del modulo de Configuracion (donde se hace el ABM de estas
 * mismas entidades) porque el consumidor no es el panel de administracion:
 * es la app movil, en el flujo de rechazo/cancelacion de un pedido
 * (US-PED-04). Categoria, cuando el modulo de Publicaciones se fusione a
 * `develop`, agrega su propia ruta de solo lectura aca mismo.
 *
 * Exige sesion pero no un rol puntual: cualquier usuario autenticado puede
 * consultar datos de referencia, y cada ruta filtra por rol la que lo
 * necesite.
 */
export const catalogoRouter: Router = Router();

catalogoRouter.use(requiereAutenticacion);

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
