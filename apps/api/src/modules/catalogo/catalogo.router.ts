import { Router } from 'express';
import { requiereAutenticacion } from '../../middleware/auth.middleware.js';
import * as catalogoService from './catalogo.service.js';

/**
 * Rutas de solo lectura de tablas de referencia que otros modulos consumen.
 *
 * Vive separado del modulo de publicaciones aunque hoy Publicaciones sea su
 * unico consumidor (el desplegable de categoria de US-PUB-01): Categoria no es
 * un concepto del dominio de platos, es una entidad del Modulo de
 * configuracion y parametros (alcance 2.2.2.2.3) que Publicaciones solo
 * consulta, igual que en el futuro la consultara el feed o el panel.
 *
 * Exige sesion pero no un rol puntual: cliente, cocinero y administrador
 * necesitan las categorias por igual (el formulario de plato, los filtros del
 * feed, el ABM del panel).
 */
export const catalogoRouter: Router = Router();

catalogoRouter.use(requiereAutenticacion);

/** US-PUB-01 - Categorias activas para el desplegable del formulario de plato. */
catalogoRouter.get('/categorias', async (_req, res) => {
  const categorias = await catalogoService.listarCategoriasActivas();
  res.json(categorias);
});
