import { useEffect, type ReactNode } from 'react';
import { View } from 'react-native';
import { router, useSegments, type Href } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import type { PerfilUsuario } from '@foodhub/shared';
import { MENSAJES_USUARIO } from '@foodhub/shared';
import { cerrarSesion } from '../api/auth';
import {
  mandaElEnlace,
  useEnlaceDeAcceso,
  useEscucharEnlaceDeAcceso,
} from '../hooks/useEnlaceDeAcceso';
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
 * Son cuatro preguntas y ninguna se puede adelantar:
 *
 *   1. ¿vino un enlace?  la responde el sistema operativo con el deep link;
 *   2. ¿hay sesión?      la responde Supabase leyendo el Keystore;
 *   3. ¿qué rol?         la responde la API, porque el rol vive en `usuario` y
 *                        no en el JWT: un token viejo con el rol adentro
 *                        seguiría diciendo "cocinero" después de una
 *                        degradación;
 *   4. ¿dónde está?      la responde el propio router, con los segmentos.
 *
 * El gate es además el ÚNICO que oculta el splash. Que lo ocultara alguien más
 * —las fuentes, por ejemplo— rompe la garantía: el splash se iría antes de que
 * el gate sepa qué dibujar y el usuario vería la pantalla en blanco que hay
 * debajo.
 */

/** Destino inicial de cada rol. */
const INICIO_POR_ROL = {
  CLIENTE: '/(cliente)/inicio',
  COCINERO: '/(cocinero)/platos',
} as const;

type GrupoDeRutas =
  '(auth)' | '(cliente)' | '(cocinero)' | 'aceptar-terminos' | undefined;

export function GateDeSesion({ children }: { children: ReactNode }) {
  useEscucharSesion();
  useEscucharEnlaceDeAcceso();

  const resuelta = useSesion((estado) => estado.resuelta);
  const sesion = useSesion((estado) => estado.sesion);
  const fijarAviso = useSesion((estado) => estado.fijarAviso);
  const paso = useEnlaceDeAcceso((estado) => estado.paso);
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

  /**
   * Lo único que puede faltar EN EL ARRANQUE Y NUNCA DESPUÉS. Los dos son
   * monótonos por construcción: la máquina del enlace no vuelve a `sinResolver`
   * y `resuelta` no vuelve a `false`. Que sean monótonos es lo que hace seguro
   * no dibujar nada mientras duran.
   */
  const arrancando = paso === 'sinResolver' || !resuelta;

  /**
   * Para elegir el destino hace falta además el rol, y ese sí se puede volver a
   * pedir en mitad de la sesión —el login lo pide de nuevo—. Por eso la espera
   * del perfil NO apaga el dibujado: solo posterga la decisión. Mientras tanto
   * se ve la pantalla anterior, o el splash si todavía no hubo ninguna.
   */
  const puedeDecidir =
    !arrancando && !(sesion !== null && perfil.isPending && !perfil.isError);

  const destino = puedeDecidir
    ? calcularDestino({
        haySesion: sesion !== null,
        conEnlaceEnCurso: mandaElEnlace(paso),
        perfil: esAdministrador ? undefined : perfil.data,
        segmentos,
      })
    : null;

  useEffect(() => {
    if (destino !== null) router.replace(destino);
  }, [destino]);

  /**
   * El splash se va recién cuando el destino ya está decidido. Es lo que tapa
   * el hueco entre "la primera pantalla se montó" y "el gate la reemplazó por la
   * que corresponde": sin esa cobertura, ese hueco es una pantalla en blanco.
   */
  useEffect(() => {
    if (puedeDecidir) void SplashScreen.hideAsync();
  }, [puedeDecidir]);

  // No se dibuja nada hasta saber si hay enlace y si hay sesión. Esta rama no
  // vuelve a entrar después del arranque: las dos condiciones son monótonas.
  if (arrancando) return null;

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
  conEnlaceEnCurso,
  perfil,
  segmentos,
}: {
  haySesion: boolean;
  conEnlaceEnCurso: boolean;
  perfil: PerfilUsuario | undefined;
  segmentos: readonly string[];
}): Href | null {
  const grupo = segmentos[0] as GrupoDeRutas;

  /**
   * PAN-AUT-04.1 se abre por deep link desde el correo. Mientras dura ese flujo
   * el gate no toca la navegación: expo-router está llevando al usuario a
   * `nueva-password` en paralelo, sin ningún orden garantizado respecto de este
   * cálculo, y un `replace` acá le ganaría de mano y lo dejaría en la bienvenida
   * sin poder terminar de definir su contraseña.
   */
  if (conEnlaceEnCurso) return null;

  if (!haySesion) {
    return grupo === '(auth)' ? null : '/bienvenida';
  }

  if (!perfil) return null;
  if (perfil.tipo === 'ADMINISTRADOR') return null;

  /**
   * US-CFG-04 (RF058) · el administrador publicó una versión nueva de los
   * términos o de la política de privacidad. Hasta que este usuario la
   * acepte, "aceptar-terminos" es el único destino posible: ni siquiera se
   * lo deja volver a su propio grupo de tabs.
   */
  if (perfil.debeAceptarTerminos) {
    return grupo === 'aceptar-terminos' ? null : '/aceptar-terminos';
  }

  return debeVolverACasa(perfil, grupo) ? INICIO_POR_ROL[perfil.tipo] : null;
}

/**
 * NO todas las pantallas de un rol viven anidadas bajo su grupo de rutas:
 * `/publicaciones/nueva`, `/publicaciones/[id]` y `/notificaciones` son
 * rutas de nivel superior a las que se llega empujando la pila desde adentro
 * de `(cocinero)`/`(cliente)`, así que `segmentos[0]` deja de ser el grupo
 * propio en cuanto el cocinero abre una de ellas. Redirigir a "casa" en ese
 * momento (como hacía antes `calcularDestino`, comparando
 * `grupo === grupoPropio`) expulsaba al usuario de la pantalla recién abierta
 * a los pocos milisegundos.
 *
 * Lo único que hace falta decidir acá es sacar al usuario de donde NO puede
 * estar: en las pantallas de `(auth)` estando logueado, en "aceptar-terminos"
 * cuando ya no hace falta (recién aceptó y `debeAceptarTerminos` cambió a
 * `false`), o en el grupo del OTRO rol. Cualquier otro segmento -el propio
 * grupo o una ruta compartida de nivel superior- se deja en paz.
 */
function debeVolverACasa(perfil: PerfilUsuario, grupo: GrupoDeRutas): boolean {
  const grupoAjeno = perfil.tipo === 'CLIENTE' ? '(cocinero)' : '(cliente)';
  return (
    grupo === undefined ||
    grupo === '(auth)' ||
    grupo === grupoAjeno ||
    grupo === 'aceptar-terminos'
  );
}
