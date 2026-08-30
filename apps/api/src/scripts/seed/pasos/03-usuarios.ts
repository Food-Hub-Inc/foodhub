import { cocinero, preferenciaNotificacion, usuario } from '@foodhub/db';
import { preferenciasIniciales } from '@foodhub/shared';
import { db } from '../../../lib/db.js';
import { supabaseAdmin } from '../../../lib/supabase.js';
import {
  ADMINISTRADORES,
  CLIENTES,
  COCINEROS,
  PASSWORD_DE_PRUEBA,
  type SemillaUsuario,
} from '../datos/usuarios.js';
import { subirImagen } from '../lib/almacenamiento.js';
import type { ContextoSeed, UsuarioCreado } from '../lib/contexto.js';
import { sumarDias } from '../lib/tiempo.js';

/**
 * Paso 3 - Las 27 cuentas.
 *
 * Reproduce EXACTAMENTE lo que hace `registrarCliente` / `registrarCocinero`
 * de auth.service.ts, en el mismo orden:
 *
 *   1. cuenta en GoTrue con `email_confirm: true`
 *   2. foto de perfil en el bucket `perfiles`, bajo la carpeta del usuario
 *   3. fila en `usuario` con el MISMO id que emitio GoTrue
 *   4. fila en `cocinero` si corresponde
 *   5. filas de `preferencia_notificacion` del rol
 *
 * `email_confirm: true` no es un atajo: es lo que hace el registro real
 * (US-AUT-01 exige que el alta inicie sesion sola) y ademas el ambiente de
 * desarrollo no tiene SMTP, asi que un correo de confirmacion no llegaria
 * nunca y las cuentas quedarian inservibles.
 *
 * La fila de `usuario` NO va en una transaccion con la creacion en GoTrue,
 * a diferencia de la API. Aca no hace falta compensar: si el script falla a
 * mitad de camino, la solucion es volver a correrlo entero, que empieza
 * borrando todo.
 */

/**
 * Fechas de alta, anteriores a la ventana de pedidos.
 *
 * Los administradores se dan de alta primero -son quienes ponen en marcha la
 * plataforma- y despues entran cocineros y clientes de forma escalonada. El
 * escalonamiento importa: un cocinero que se registro en abril no puede tener
 * pedidos de marzo, y el paso de pedidos usa esta fecha como piso.
 */
const ALTA_PRIMER_ADMIN = new Date('2026-01-05T14:00:00.000Z');

function fechaDeAlta(semilla: SemillaUsuario, indice: number): Date {
  if (semilla.tipo === 'ADMINISTRADOR') {
    return sumarDias(ALTA_PRIMER_ADMIN, indice);
  }
  if (semilla.tipo === 'COCINERO') {
    // Del 15 de enero al 15 de abril, uno cada seis dias.
    return sumarDias(new Date('2026-01-15T11:00:00.000Z'), indice * 6);
  }
  // Clientes: del 20 de enero al 10 de mayo, uno cada veinte dias.
  return sumarDias(new Date('2026-01-20T19:00:00.000Z'), indice * 20);
}

async function crearCuenta(semilla: SemillaUsuario): Promise<string> {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: semilla.email,
    password: PASSWORD_DE_PRUEBA,
    email_confirm: true,
  });

  if (error) {
    throw new Error(
      `no se pudo crear la cuenta de ${semilla.email} en GoTrue: ${error.message}`,
    );
  }
  return data.user.id;
}

async function crearUsuario(
  semilla: SemillaUsuario,
  fechaRegistro: Date,
): Promise<UsuarioCreado> {
  const id = await crearCuenta(semilla);

  const fotoPerfilUrl = await subirImagen({
    bucket: 'perfiles',
    carpeta: id,
    archivoLocal: `perfiles/${semilla.slug}.png`,
  });

  await db.insert(usuario).values({
    id,
    nombre: semilla.nombre,
    apellido: semilla.apellido,
    email: semilla.email,
    tipo: semilla.tipo,
    fotoPerfilUrl,
    ubicacion: semilla.ubicacion,
    estadoCuenta: 'ACTIVA',
    terminosAceptados: true,
    fechaAceptacionTerminos: fechaRegistro,
    fechaRegistro,
  });

  if (semilla.tipo === 'COCINERO') {
    await db.insert(cocinero).values({
      usuarioId: id,
      descripcionPublica: semilla.descripcionPublica ?? null,
    });
  }

  // El administrador no tiene ninguna: opera desde el panel web y no recibe
  // push (GRUPOS_PREFERENCIA_POR_ROL en @foodhub/shared). Sin esta guarda,
  // drizzle falla con un INSERT sin valores.
  const preferencias = preferenciasIniciales(semilla.tipo);
  if (preferencias.length > 0) {
    await db.insert(preferenciaNotificacion).values(
      preferencias.map((preferencia) => ({
        usuarioId: id,
        tipoNotificacion: preferencia.tipoNotificacion,
        activa: true,
        modificable: preferencia.modificable,
      })),
    );
  }

  return { ...semilla, id, fechaRegistro };
}

async function crearGrupo(
  contexto: ContextoSeed,
  semillas: readonly SemillaUsuario[],
  destino: UsuarioCreado[],
): Promise<void> {
  for (const [indice, semilla] of semillas.entries()) {
    const creado = await crearUsuario(semilla, fechaDeAlta(semilla, indice));
    contexto.usuarios.set(semilla.slug, creado);
    destino.push(creado);
  }
}

export async function sembrarUsuarios(contexto: ContextoSeed): Promise<void> {
  await crearGrupo(contexto, ADMINISTRADORES, contexto.administradores);
  await crearGrupo(contexto, COCINEROS, contexto.cocineros);
  await crearGrupo(contexto, CLIENTES, contexto.clientes);
}
