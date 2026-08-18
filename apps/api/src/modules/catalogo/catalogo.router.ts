import { Router } from 'express';
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
