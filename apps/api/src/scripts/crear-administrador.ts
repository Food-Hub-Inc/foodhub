import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { usuario } from '@foodhub/db';
import { emailSchema, passwordSchema } from '@foodhub/shared';
import { env } from '../config/env.js';
import { db } from '../lib/db.js';
import {
  conCompensacionDeCuenta,
  esCorreoYaRegistrado,
  supabaseAdmin,
} from '../lib/supabase.js';

/**
 * Alta del primer administrador del sistema.
 *
 * POR QUE EXISTE ESTE SCRIPT
 *
 * US-GURP-06 crea usuarios desde el panel, y el panel exige estar autenticado
 * como administrador para entrar. El primer administrador no puede salir de
 * ahi: es el problema del huevo y la gallina, y todo sistema con un panel
 * cerrado necesita una via de arranque fuera de la aplicacion.
 *
 * Se usa una sola vez por ambiente. A partir de ese administrador, los demas se
 * dan de alta desde PAN-ADM-01, que es lo que la documentacion describe y lo
 * que deja rastro en `registro_auditoria`.
 *
 * NO usa la invitacion por correo, a diferencia de US-GURP-06: la invitacion
 * necesita SMTP configurado y una URL de redireccion en la lista blanca de
 * Supabase, y este script tiene que funcionar en un ambiente recien creado
 * donde nada de eso esta puesto todavia.
 *
 * Uso:
 *   pnpm --filter @foodhub/api run crear-admin -- --email=alguien@dominio.com
 *   pnpm --filter @foodhub/api run crear-admin -- --email=... --password=...
 *   pnpm --filter @foodhub/api run crear-admin -- --email=... --nombre=Ana --apellido=Perez
 *   pnpm --filter @foodhub/api run crear-admin -- --email=... --promover
 *
 * Sin `--password` se genera una y se imprime UNA sola vez.
 *
 * `--promover` no crea nada: convierte en administradora una cuenta que ya
 * existe, conservando su id, su historial y su contrasena. Sirve cuando quien
 * va a administrar ya se habia registrado como cliente o cocinero desde la app.
 */

interface Argumentos {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  passwordGenerada: boolean;
  promover: boolean;
}

/**
 * Contrasena aleatoria que cumple la politica de `passwordSchema`.
 *
 * Se arma con un bloque aleatorio en base64url mas un caracter garantizado de
 * cada clase exigida: base64url por si solo puede salir sin mayusculas o sin
 * digitos, y en ese caso GoTrue la aceptaria pero el usuario no podria volver a
 * ponerla desde la aplicacion, donde el schema si la valida.
 */
function generarPassword(): string {
  const aleatoria = randomBytes(18).toString('base64url');
  return `Fh${aleatoria}7z`;
}

function leerArgumentos(argv: readonly string[]): Argumentos {
  const valores = new Map<string, string>();

  for (const argumento of argv) {
    const separador = argumento.indexOf('=');
    if (!argumento.startsWith('--') || separador === -1) continue;
    valores.set(
      argumento.slice(2, separador),
      argumento.slice(separador + 1).trim(),
    );
  }

  const email = emailSchema.safeParse(valores.get('email'));
  if (!email.success) {
    throw new Error(
      'Indicá el correo del administrador: --email=alguien@dominio.com',
    );
  }

  const informada = valores.get('password');
  if (informada !== undefined) {
    const validada = passwordSchema.safeParse(informada);
    if (!validada.success) {
      const motivos = validada.error.issues.map((i) => i.message).join(' ');
      throw new Error(
        `La contraseña indicada no cumple la política: ${motivos}`,
      );
    }
  }

  return {
    email: email.data,
    password: informada ?? generarPassword(),
    passwordGenerada: informada === undefined,
    nombre: valores.get('nombre') ?? 'Administrador',
    apellido: valores.get('apellido') ?? 'FoodHub',
    // Los flags sin `=` no entran al mapa: se buscan sobre el argv crudo.
    promover: argv.includes('--promover'),
  };
}

/**
 * Convierte en administradora una cuenta existente.
 *
 * Cambia el rol sobre la MISMA fila en lugar de crear otra: el id de `usuario`
 * es el id de GoTrue y es lo que referencian los pedidos, las reseñas y las
 * conversaciones. Duplicar la persona en dos cuentas partiria su historial.
 *
 * Si la cuenta venia siendo de un cocinero, su fila en `cocinero` queda donde
 * esta. Borrarla perderia su descripcion publica y su ubicacion, y este script
 * no tiene por que decidir eso: revertir el rol deberia poder deshacerse.
 */
async function promoverAAdministrador(email: string): Promise<void> {
  const [actual] = await db
    .select({
      id: usuario.id,
      tipo: usuario.tipo,
      estado: usuario.estadoCuenta,
    })
    .from(usuario)
    .where(eq(usuario.email, email))
    .limit(1);

  if (!actual) {
    throw new Error(
      `No hay ninguna fila en \`usuario\` con ${email}. La cuenta existe en GoTrue pero le falta el perfil: revisá si el registro quedó a medias.`,
    );
  }

  if (actual.tipo === 'ADMINISTRADOR') {
    console.warn(`\n${email} ya era administradora. No se cambió nada.\n`);
    return;
  }

  await db
    .update(usuario)
    .set({ tipo: 'ADMINISTRADOR' })
    .where(eq(usuario.id, actual.id));

  console.warn(`
Cuenta promovida en ${env.SUPABASE_URL}

  correo      ${email}
  rol         ${actual.tipo} -> ADMINISTRADOR
  estado      ${actual.estado}
  contraseña  la que ya tenías; el script no la toca
  ambiente    ${env.APP_ENV}
`);
}

/**
 * Crea la cuenta en GoTrue y el perfil en `usuario`, en ese orden.
 *
 * `email_confirm: true` deja la cuenta lista para entrar sin pasar por el
 * correo de confirmacion. Es lo mismo que hace el registro de US-AUT-01 y acá
 * es imprescindible: en un ambiente sin SMTP, ese correo no llegaria nunca y la
 * cuenta quedaria inutilizable.
 */
async function crearAdministrador(datos: Argumentos): Promise<void> {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: datos.email,
    password: datos.password,
    email_confirm: true,
  });

  if (error) {
    if (esCorreoYaRegistrado(error)) {
      throw new Error(
        `Ya existe una cuenta con ${datos.email}. Si es tuya y querés convertirla en administradora, cambiale el rol desde el panel o desde la base.`,
      );
    }
    throw error;
  }

  await conCompensacionDeCuenta(data.user.id, async () => {
    await db.insert(usuario).values({
      id: data.user.id,
      nombre: datos.nombre,
      apellido: datos.apellido,
      email: datos.email,
      tipo: 'ADMINISTRADOR',
      // El administrador de arranque no acepta términos desde ninguna pantalla:
      // se deja el valor por defecto en lugar de simular una aceptación que
      // nunca ocurrió. `registro_auditoria` tampoco recibe una fila: no hubo un
      // usuario responsable de esta alta, que es justamente el motivo por el
      // que este script existe.
      terminosAceptados: false,
    });
  });
}

/** Aviso si ya hay administradores: no es un error, pero conviene saberlo. */
async function contarAdministradoresActivos(): Promise<number> {
  const filas = await db
    .select({ id: usuario.id })
    .from(usuario)
    .where(eq(usuario.tipo, 'ADMINISTRADOR'));
  return filas.length;
}

async function principal(): Promise<void> {
  const datos = leerArgumentos(process.argv.slice(2));

  const existentes = await contarAdministradoresActivos();
  if (existentes > 0) {
    console.warn(
      `\n[aviso] El sistema ya tiene ${String(existentes)} administrador(es). Este script es para el arranque; los demás se dan de alta desde PAN-ADM-01.\n`,
    );
  }

  if (datos.promover) {
    await promoverAAdministrador(datos.email);
    return;
  }

  await crearAdministrador(datos);

  console.warn(`
Administrador creado en ${env.SUPABASE_URL}

  correo      ${datos.email}
  contraseña  ${datos.password}
  ambiente    ${env.APP_ENV}
`);

  if (datos.passwordGenerada) {
    console.warn(
      'La contraseña se generó al azar y no queda guardada en ningún lado. Anotala ahora.\n',
    );
  }
}

principal()
  .then(() => {
    process.exit(0);
  })
  .catch((error: unknown) => {
    console.error(
      `\n[error] ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exit(1);
  });
