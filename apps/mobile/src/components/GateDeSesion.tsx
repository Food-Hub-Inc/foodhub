import { useEffect, type ReactNode } from 'react';
import { View } from 'react-native';
import { router, useSegments, type Href } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import type { PerfilUsuario } from '@foodhub/shared';
import { MENSAJES_USUARIO } from '@foodhub/shared';
import { cerrarSesion } from '../api/auth';
import { usePerfil } from '../hooks/usePerfil';
import { useSesion, useEscucharSesion } from '../hooks/useSesion';
import { TEXTOS_LOGIN } from '../lib/textos';
import { EstadoDeError } from './ui/EstadoDeError';

/**
 * Guardia de sesión del layout raíz.
 *
 * Decide a qué mitad de la app entra el usuario y, mientras lo decide, mantiene
 * el splash arriba. Sin esa espera la app muestra la bienvenida por un frame y
 * después salta al feed: el parpadeo se nota y da sensación de app rota.
 *
 * Son tres preguntas encadenadas y ninguna se puede adelantar:
 *
 *   1. ¿hay sesión?   la responde Supabase leyendo el Keystore;
 *   2. ¿qué rol?      la responde la API, porque el rol vive en `usuario` y no
 *                     en el JWT: un token viejo con el rol adentro seguiría
 *                     diciendo "cocinero" después de una degradación;
 *   3. ¿dónde está?   la responde el propio router, con los segmentos.
 */

/** Destino inicial de cada rol. */
const INICIO_POR_ROL = {
  CLIENTE: '/(cliente)/inicio',
  COCINERO: '/(cocinero)/platos',
} as const;

type GrupoDeRutas = '(auth)' | '(cliente)' | '(cocinero)' | undefined;

export function GateDeSesion({ children }: { children: ReactNode }) {
  useEscucharSesion();

  const resuelta = useSesion((estado) => estado.resuelta);
  const sesion = useSesion((estado) => estado.sesion);
  const fijarAviso = useSesion((estado) => estado.fijarAviso);
  const perfil = usePerfil();
  const segmentos = useSegments() as readonly string[];

  const esAdministrador = perfil.data?.tipo === 'ADMINISTRADOR';

  /**
   * Decisión del equipo: la administración se opera desde el panel web. Si un
   * administrador entra con sus credenciales a la app se le cierra la sesión y
   * se le explica dónde tiene que ir; dejarlo adentro sin ninguna de sus
   * herramientas sería peor que no dejarlo entrar.
   */
  useEffect(() => {
    if (!esAdministrador) return;
    fijarAviso(TEXTOS_LOGIN.soloPanelWeb);
    void cerrarSesion();
  }, [esAdministrador, fijarAviso]);

  const esperando =
    !resuelta || (sesion !== null && perfil.isPending && !perfil.isError);

  const destino = esperando
    ? null
    : calcularDestino({
        haySesion: sesion !== null,
        perfil: esAdministrador ? undefined : perfil.data,
        segmentos,
      });

  useEffect(() => {
    if (destino !== null) router.replace(destino);
  }, [destino]);

  useEffect(() => {
    if (!esperando) void SplashScreen.hideAsync();
  }, [esperando]);

  // Splash arriba: no se dibuja nada hasta saber a dónde va el usuario.
  if (esperando) return null;

  /**
   * El perfil no cargó y sin él no se sabe el rol. Se muestra el error con
   * reintento en lugar de adivinar una barra de tabs: entrar como cliente a
   * alguien que es cocinero es peor que pedirle que reintente.
   */
  if (sesion !== null && perfil.isError) {
    return (
      <View className="flex-1 bg-background">
        <EstadoDeError
          mensaje={MENSAJES_USUARIO.perfilNoDisponible}
          onReintentar={() => {
            void perfil.refetch();
          }}
        />
      </View>
    );
  }

  return <>{children}</>;
}

/** A dónde hay que mandar al usuario, o `null` si ya está donde corresponde. */
function calcularDestino({
  haySesion,
  perfil,
  segmentos,
}: {
  haySesion: boolean;
  perfil: PerfilUsuario | undefined;
  segmentos: readonly string[];
}): Href | null {
  const grupo = segmentos[0] as GrupoDeRutas;

  /**
   * PAN-AUT-04.1 se abre por deep link desde el correo y Supabase deja una
   * sesión de recuperación activa. Sacar al usuario de ahí por "tener sesión"
   * le impediría justamente terminar de recuperar la cuenta.
   */
  if (segmentos[1] === 'nueva-password') return null;

  if (!haySesion) {
    return grupo === '(auth)' ? null : '/bienvenida';
  }

  if (!perfil) return null;
  if (perfil.tipo === 'ADMINISTRADOR') return null;

  const grupoPropio = perfil.tipo === 'CLIENTE' ? '(cliente)' : '(cocinero)';
  if (grupo === grupoPropio) return null;

  return INICIO_POR_ROL[perfil.tipo];
}
