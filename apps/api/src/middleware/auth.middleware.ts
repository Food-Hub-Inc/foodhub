import type { NextFunction, Request, Response } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { eq } from 'drizzle-orm';
import { usuario } from '@foodhub/db';
import type { TipoUsuario } from '@foodhub/shared';
import { env } from '../config/env.js';
import { db } from '../lib/db.js';
import { AppError } from './error.middleware.js';

/**
 * Autenticacion de la API contra Supabase Auth.
 *
 * FLUJO COMPLETO (decision de arquitectura de la Etapa 6):
 *
 *   1. La app movil o el panel se autentican DIRECTO contra Supabase Auth con
 *      el SDK. El login nunca pasa por esta API.
 *   2. Supabase devuelve un JWT firmado con su clave privada.
 *   3. El cliente manda ese JWT en `Authorization: Bearer <token>`.
 *   4. Este middleware verifica la firma contra el JWKS publico de Supabase y
 *      carga el perfil del usuario desde la tabla `usuario`.
 *
 * La API no emite ni almacena tokens: solo los verifica. Por eso el diagrama
 * V4 ya no tiene las clases Sesion ni SolicitudRecuperacionContrasena.
 */

/**
 * Conjunto de claves publicas de Supabase.
 *
 * `createRemoteJWKSet` cachea las claves y solo vuelve a pedirlas cuando
 * aparece un `kid` desconocido, de modo que la rotacion de claves de Supabase
 * no requiere reiniciar el servidor ni genera una llamada de red por request.
 */
const jwks = createRemoteJWKSet(
  new URL(`${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`),
);

export interface UsuarioAutenticado {
  id: string;
  email: string;
  tipo: TipoUsuario;
  estadoCuenta: string;
}

/**
 * Amplia el tipo Request de Express para que `req.usuario` este tipado en
 * todos los handlers, sin castings dispersos por el codigo.
 *
 * Se amplia el modulo `express-serve-static-core`, que es donde Express 5
 * declara realmente la interfaz Request. La alternativa clasica
 * (`declare global { namespace Express }`) usa un namespace, patron que
 * typescript-eslint desaconseja a favor de los modulos ES2015.
 *
 * El tipo incluye `| undefined` de forma explicita porque
 * `exactOptionalPropertyTypes` distingue "propiedad ausente" de "propiedad
 * presente con valor undefined", y en `autenticacionOpcional` se asigna
 * undefined a proposito.
 */
declare module 'express-serve-static-core' {
  interface Request {
    usuario?: UsuarioAutenticado | undefined;
  }
}

function extraerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim() || null;
}

/**
 * Exige un usuario autenticado y con la cuenta habilitada.
 *
 * Verifica ademas el estado de la cuenta en cada request y no solo al iniciar
 * sesion: si un administrador suspende a alguien, el JWT que ya tiene emitido
 * sigue siendo criptograficamente valido hasta que expire. Sin este chequeo,
 * un usuario suspendido conservaria acceso durante toda la vida del token
 * (criterio de aceptacion de US-AUT-03: "cuenta suspendida -> no permitir el
 * acceso al sistema").
 */
export async function requiereAutenticacion(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = extraerToken(req);
    if (!token) {
      throw new AppError(401, 'Iniciá sesión para continuar.', 'SIN_TOKEN');
    }

    const { payload } = await jwtVerify(token, jwks, {
      issuer: `${env.SUPABASE_URL}/auth/v1`,
      audience: 'authenticated',
    });

    if (!payload.sub) {
      throw new AppError(401, 'Sesión inválida.', 'TOKEN_INVALIDO');
    }

    const [perfil] = await db
      .select({
        id: usuario.id,
        email: usuario.email,
        tipo: usuario.tipo,
        estadoCuenta: usuario.estadoCuenta,
      })
      .from(usuario)
      .where(eq(usuario.id, payload.sub))
      .limit(1);

    if (!perfil) {
      // El token es valido pero no hay perfil: el registro quedo a medias.
      throw new AppError(
        401,
        'Tu cuenta no está completa.',
        'PERFIL_INEXISTENTE',
      );
    }

    if (perfil.estadoCuenta === 'SUSPENDIDA') {
      throw new AppError(
        403,
        'Tu cuenta se encuentra suspendida. Contactá al soporte.',
        'CUENTA_SUSPENDIDA',
      );
    }

    if (perfil.estadoCuenta === 'ELIMINADA') {
      throw new AppError(
        403,
        'Esta cuenta fue dada de baja.',
        'CUENTA_ELIMINADA',
      );
    }

    req.usuario = perfil;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    // Firma invalida, token expirado o JWKS inaccesible: se responde igual en
    // todos los casos para no dar pistas sobre el motivo del rechazo.
    next(new AppError(401, 'Sesión inválida o expirada.', 'TOKEN_INVALIDO'));
  }
}

/**
 * Autenticacion opcional: si viene un token valido puebla `req.usuario`, y si
 * no, deja pasar igual. Se usa en el feed publico, donde un visitante puede
 * explorar publicaciones pero un usuario autenticado ve ademas sus favoritos.
 */
export async function autenticacionOpcional(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!extraerToken(req)) {
    next();
    return;
  }
  await requiereAutenticacion(req, res, (err?: unknown) => {
    // Un token invalido no bloquea: simplemente se atiende como anonimo.
    if (err) req.usuario = undefined;
    next();
  });
}
