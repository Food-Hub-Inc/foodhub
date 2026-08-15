import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  loginSchema,
  MENSAJES_AUTH,
  MENSAJES_USUARIO,
  type PerfilUsuario,
} from '@foodhub/shared';
import { consultaPerfil } from '../api/perfil.js';
import { reportarLoginFallido } from '../api/seguridad.js';
import { MarcoDeAcceso } from '../components/MarcoDeAcceso.js';
import { useSesion } from '../hooks/useSesion.js';
import { ErrorApi, mensajeDeError } from '../lib/api.js';
import { RUTAS } from '../lib/rutas.js';
import { supabase } from '../lib/supabase.js';
import { TEXTOS_LOGIN } from '../lib/textos.js';
import {
  FormularioDeIngreso,
  type ErroresDeIngreso,
} from './login/FormularioDeIngreso.js';

/**
 * PAN-AUT-03 adaptada al panel web — US-AUT-03.
 *
 * El login va DIRECTO contra Supabase Auth: la API no emite tokens, solo los
 * verifica. Recién con la sesión abierta se consulta `GET /usuarios/yo`, que es
 * lo único que puede decir si esa persona es administradora y si su cuenta
 * sigue habilitada.
 *
 * Los tres rechazos posibles tienen mensajes distintos y literales:
 *
 *   credenciales incorrectas → MENSAJES_AUTH.credencialesInvalidas
 *   cuenta suspendida        → MENSAJES_AUTH.cuentaSuspendida
 *   rol que no es admin      → MENSAJES_USUARIO.accesoNoAutorizado
 *
 * El primero NO dice cuál de los dos datos falló: decirlo permitiría enumerar
 * qué correos tienen cuenta en la plataforma.
 */
export function Login() {
  const sesion = useSesion();
  const navegar = useNavigate();
  const ubicacion = useLocation();
  const clienteDeConsultas = useQueryClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erroresDeCampo, setErroresDeCampo] = useState<ErroresDeIngreso>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(
    avisoDeNavegacion(ubicacion.state),
  );

  async function ingresar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErrorGeneral(null);

    const validacion = loginSchema.safeParse({ email, password });
    if (!validacion.success) {
      setErroresDeCampo(aErroresDeCampo(validacion.error.issues));
      return;
    }
    setErroresDeCampo({});
    setEnviando(true);

    try {
      const credenciales = validacion.data;
      const { error } = await supabase.auth.signInWithPassword(credenciales);

      if (error) {
        // US-AUD-01: el intento fallido queda registrado aunque el login no
        // pase por la API. Es "fire and forget": no se espera ni se reintenta.
        void reportarLoginFallido(credenciales.email);
        setErrorGeneral(MENSAJES_AUTH.credencialesInvalidas);
        return;
      }

      await verificarQueSeaAdministrador(clienteDeConsultas);
      void navegar(RUTAS.inicio, { replace: true });
    } catch (error) {
      // Cualquier rechazo posterior al login deja la sesión abierta pero
      // inservible: se cierra para que el próximo intento arranque limpio.
      await supabase.auth.signOut();
      setErrorGeneral(mensajeDeRechazo(error));
    } finally {
      setEnviando(false);
    }
  }

  // Quien ya está autenticado como administrador no tiene por qué ver el
  // formulario: entra derecho al panel.
  if (sesion.perfil?.tipo === 'ADMINISTRADOR') {
    return <Navigate replace to={RUTAS.inicio} />;
  }

  return (
    <MarcoDeAcceso
      descripcion={TEXTOS_LOGIN.subtitulo}
      titulo={TEXTOS_LOGIN.titulo}
    >
      <FormularioDeIngreso
        alCambiarContrasena={setPassword}
        alCambiarCorreo={setEmail}
        alEnviar={(evento) => void ingresar(evento)}
        contrasena={password}
        correo={email}
        enviando={enviando}
        errorGeneral={errorGeneral}
        errores={erroresDeCampo}
      />
    </MarcoDeAcceso>
  );
}

/**
 * Excepción interna: el login fue correcto pero la persona no puede usar el
 * panel. Se distingue de un `ErrorApi` porque no vino de la red.
 */
class RechazoDeAcceso extends Error {}

/**
 * Consulta el perfil recién autenticado y decide si corresponde entrar.
 *
 * Usa `fetchQuery` en vez de un fetch suelto para dejar el resultado en la
 * caché con la misma clave que usa `ProveedorDeSesion`: sin eso, el panel
 * pediría el mismo perfil una segunda vez apenas se monta.
 */
async function verificarQueSeaAdministrador(
  clienteDeConsultas: ReturnType<typeof useQueryClient>,
): Promise<void> {
  const perfil =
    await clienteDeConsultas.fetchQuery<PerfilUsuario>(consultaPerfil);

  if (perfil.tipo !== 'ADMINISTRADOR') {
    throw new RechazoDeAcceso(MENSAJES_USUARIO.accesoNoAutorizado);
  }
}

function mensajeDeRechazo(error: unknown): string {
  if (error instanceof RechazoDeAcceso) return error.message;

  if (error instanceof ErrorApi) {
    // El contrato responde estos dos códigos con el literal exigido por
    // US-AUT-03; se mapean acá para no depender del texto que mande el servidor.
    if (error.codigo === 'CUENTA_SUSPENDIDA') {
      return MENSAJES_AUTH.cuentaSuspendida;
    }
    if (error.codigo === 'CUENTA_ELIMINADA')
      return MENSAJES_AUTH.cuentaEliminada;
  }

  return mensajeDeError(error);
}

/** Mensaje que dejó `RutaProtegida` al expulsar a alguien del panel. */
function avisoDeNavegacion(estado: unknown): string | null {
  if (typeof estado !== 'object' || estado === null) return null;
  const aviso = (estado as { aviso?: unknown }).aviso;
  return typeof aviso === 'string' ? aviso : null;
}

function aErroresDeCampo(
  problemas: readonly { path: PropertyKey[]; message: string }[],
): ErroresDeIngreso {
  const errores: ErroresDeIngreso = {};
  for (const problema of problemas) {
    const campo = problema.path[0];
    if (campo === 'email' || campo === 'password') {
      errores[campo] ??= problema.message;
    }
  }
  return errores;
}
