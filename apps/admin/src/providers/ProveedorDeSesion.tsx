import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { consultaPerfil } from '../api/perfil.js';
import { ContextoSesion, type EstadoSesion } from '../hooks/useSesion.js';
import { ErrorApi } from '../lib/api.js';
import { supabase } from '../lib/supabase.js';

/**
 * Fuente única del estado de sesión del panel.
 *
 * Junta las dos mitades que hacen falta para decidir si alguien puede entrar:
 * el token que administra Supabase Auth y el perfil que devuelve la API. Están
 * separadas a propósito —la API solo verifica el JWT, no lo emite— y ninguna
 * de las dos alcanza sola: un token vigente puede pertenecer a una cuenta
 * suspendida después de emitirlo, y el rol solo existe en la tabla `usuario`.
 *
 * Vive por encima del ruteo para que el perfil se consulte una sola vez y no
 * en cada cambio de pantalla.
 */

/** `undefined` = todavía no se preguntó; `null` = se preguntó y no hay sesión. */
type EstadoToken = string | null | undefined;

export function ProveedorDeSesion({ children }: { children: ReactNode }) {
  const [usuarioId, setUsuarioId] = useState<EstadoToken>(undefined);
  const clienteDeConsultas = useQueryClient();

  useEffect(() => {
    let montado = true;

    /**
     * `getSession()` lee el token de localStorage y lo renueva si venció. Se
     * llama una vez al montar: `onAuthStateChange` no dispara por la sesión que
     * ya estaba guardada, solo por los cambios posteriores.
     */
    void supabase.auth.getSession().then(({ data }) => {
      if (montado) setUsuarioId(data.session?.user.id ?? null);
    });

    const { data: suscripcion } = supabase.auth.onAuthStateChange(
      (_evento, sesion) => {
        setUsuarioId(sesion?.user.id ?? null);
      },
    );

    return () => {
      montado = false;
      suscripcion.subscription.unsubscribe();
    };
  }, []);

  const consulta = useQuery({
    ...consultaPerfil,
    // Sin token no hay a quién consultarle el perfil: la request saldría con un
    // Authorization vacío y volvería 401.
    enabled: Boolean(usuarioId),
  });

  const cerrarSesion = useCallback(async () => {
    await supabase.auth.signOut();
    /**
     * Se vacía la caché entera, no solo la clave del perfil: el listado de
     * usuarios y los registros de auditoría son datos de una cuenta de
     * administrador y no pueden quedar en memoria para el próximo que abra el
     * panel en la misma computadora.
     */
    clienteDeConsultas.clear();
  }, [clienteDeConsultas]);

  const valor = useMemo<EstadoSesion>(
    () => ({
      estaCargando:
        usuarioId === undefined || (Boolean(usuarioId) && consulta.isPending),
      tieneToken: Boolean(usuarioId),
      perfil: consulta.data ?? null,
      error: consulta.error instanceof ErrorApi ? consulta.error : null,
      reintentar: () => {
        void consulta.refetch();
      },
      cerrarSesion,
    }),
    [usuarioId, consulta, cerrarSesion],
  );

  return (
    <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>
  );
}
