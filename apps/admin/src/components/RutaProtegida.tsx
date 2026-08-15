import { useEffect, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { MENSAJES_AUTH, MENSAJES_USUARIO } from '@foodhub/shared';
import { useSesion, type EstadoSesion } from '../hooks/useSesion.js';
import { TEXTOS_ESTADO } from '../lib/textos.js';
import { EstadoError } from './estados/EstadoError.js';
import { PantallaDeEspera } from './estados/PantallaDeEspera.js';

/**
 * Guardia de las rutas del panel — US-GURP-10.
 *
 * Exige las dos condiciones, no una: sesión iniciada Y rol `ADMINISTRADOR`. El
 * panel completo es una herramienta de administración; un cliente o un cocinero
 * con credenciales válidas no tiene nada que hacer acá.
 *
 * Cuando el rechazo es definitivo (rol equivocado, cuenta suspendida o
 * eliminada) se cierra la sesión antes de redirigir. Dejarla abierta haría que
 * el login volviera a entrar en el mismo bucle en el próximo intento, y el
 * mensaje que explica el rechazo nunca llegaría a verse.
 */
export function RutaProtegida({ children }: { children: ReactNode }) {
  const sesion = useSesion();
  const aviso = motivoDeRechazo(sesion);
  const { cerrarSesion } = sesion;

  useEffect(() => {
    if (aviso) void cerrarSesion();
  }, [aviso, cerrarSesion]);

  if (sesion.estaCargando) {
    return <PantallaDeEspera mensaje={TEXTOS_ESTADO.verificandoSesion} />;
  }

  // El aviso se manda como estado de navegación y no como query string: es un
  // mensaje para el usuario, no una dirección que tenga sentido compartir.
  if (aviso) return <Navigate replace state={{ aviso }} to="/login" />;

  if (!sesion.tieneToken) return <Navigate replace to="/login" />;

  if (sesion.error) {
    return (
      <div className="min-h-screen bg-background">
        <EstadoError alReintentar={sesion.reintentar} error={sesion.error} />
      </div>
    );
  }

  if (!sesion.perfil) {
    return <PantallaDeEspera mensaje={TEXTOS_ESTADO.verificandoSesion} />;
  }

  return <>{children}</>;
}

/**
 * Traduce el estado de la sesión al mensaje que corresponde mostrar en el
 * login, o `null` si el acceso es legítimo.
 *
 * Los tres 403 del contrato tienen mensajes distintos porque son problemas
 * distintos: dos los resuelve el soporte y el tercero no se resuelve.
 */
function motivoDeRechazo(sesion: EstadoSesion): string | null {
  if (sesion.error?.codigo === 'CUENTA_SUSPENDIDA') {
    return MENSAJES_AUTH.cuentaSuspendida;
  }
  if (sesion.error?.codigo === 'CUENTA_ELIMINADA') {
    return MENSAJES_AUTH.cuentaEliminada;
  }
  if (sesion.perfil && sesion.perfil.tipo !== 'ADMINISTRADOR') {
    return MENSAJES_USUARIO.accesoNoAutorizado;
  }
  return null;
}
