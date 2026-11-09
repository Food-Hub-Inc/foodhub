import { useEffect, type ReactNode } from 'react';
import { View } from 'react-native';
import type { Session } from '@supabase/supabase-js';
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
import { TEXTOS_LOGIN, TEXTOS_PERFIL } from '../lib/textos';
import { BotonDeTexto } from './ui/Boton';
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

  const { perfilDeLaSesion, esAdministrador, arrancando, esperandoPerfil } =
    situacionDelGate({
      perfil: perfil.data,
      hayErrorDePerfil: perfil.isError,
      paso,
      resuelta,
      sesion,
    });

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
   * Para elegir el destino hace falta además el rol, y ese sí se puede volver a
   * pedir en mitad de la sesión —el login lo pide de nuevo—.
   */
  const puedeDecidir = !arrancando && !esperandoPerfil;

  const destino = puedeDecidir
    ? calcularDestino({
        haySesion: sesion !== null,
        conEnlaceEnCurso: mandaElEnlace(paso),
        perfil: esAdministrador ? undefined : perfilDeLaSesion,
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
   *
   * VA TAMBIÉN UNA SALIDA, y no solo el reintento. Esta rama reemplaza el árbol
   * de navegación entero, así que mientras dura no hay pestañas ni "Mi perfil"
   * —donde vive el único "Cerrar sesión" de la app—. Con un error que el
   * reintento no puede resolver, eso dejaba al usuario encerrado sin manera de
   * cambiar de cuenta ni siquiera reiniciando, porque la sesión sigue en el
   * Keystore.
   */
  if (sesion !== null && perfil.isError) {
    return (
      <View className="flex-1 bg-background">
        {/* Absoluto y no un hermano en flujo: si compitiera por alto con el
            "Cerrar sesión" de abajo, el bloque de error se centraría contra el
            espacio que le queda y no contra la pantalla entera. */}
        <View className="absolute inset-0">
          <EstadoDeError
            mensaje={MENSAJES_USUARIO.perfilNoDisponible}
            onReintentar={() => {
              void perfil.refetch();
            }}
          />
        </View>
        <View className="absolute inset-x-0 bottom-8 items-center">
          <BotonDeTexto
            onPress={() => {
              void cerrarSesion();
            }}
          >
            {TEXTOS_PERFIL.cerrarSesion}
          </BotonDeTexto>
        </View>
      </View>
    );
  }

  /**
   * MIENTRAS NO SEPAMOS DE QUIÉN ES LA SESIÓN NO SE DIBUJA LA APP.
   *
   * Es el arreglo del cambio de cuenta. Los dos grupos de rutas montan
   * `NativeTabs`, o sea una barra de pestañas NATIVA: si el gate sigue
   * renderizando `children` mientras carga el perfil del usuario nuevo, el host
   * nativo del rol anterior no se desmonta y el `router.replace` posterior
   * termina apoyándose sobre un árbol que todavía tiene viva la mitad de la
   * interfaz vieja. Cerrar sesión como cliente y entrar como cocinero dejaba a
   * la vista las pestañas del cliente; reiniciar la app lo tapaba porque ahí no
   * hay ningún árbol previo que sobreviva.
   *
   * Un `View` con el color de fondo y no `null`: `null` deja ver el vacío que
   * hay debajo por un frame, que es el mismo parpadeo que el splash evita en el
   * arranque.
   */
  if (esperandoPerfil) {
    return <View className="flex-1 bg-background" />;
  }

  return <>{children}</>;
}

/**
 * En qué situación está el gate, resuelto de una vez.
 *
 * Vive afuera del componente porque son cuatro decisiones sobre los mismos
 * datos y dejarlas adentro lo llevaba por encima del umbral de complejidad que
 * fija ESLint.
 */
function situacionDelGate({
  perfil,
  hayErrorDePerfil,
  paso,
  resuelta,
  sesion,
}: {
  perfil: PerfilUsuario | undefined;
  hayErrorDePerfil: boolean;
  paso: string;
  resuelta: boolean;
  sesion: Session | null;
}): {
  perfilDeLaSesion: PerfilUsuario | undefined;
  esAdministrador: boolean;
  arrancando: boolean;
  esperandoPerfil: boolean;
} {
  /**
   * EL PERFIL QUE HAY EN MANO NO SIEMPRE ES EL DE QUIEN ESTÁ AUTENTICADO.
   *
   * `usePerfil` cuelga de una clave sin id (`['perfil','yo']`), así que entre el
   * `SIGNED_IN` de una cuenta nueva y la llegada de su perfil la consulta puede
   * seguir devolviendo el del usuario anterior. Comparar contra `sesion.user.id`
   * lo detecta con exactitud y no con una heurística de tiempos: `usuario.id` ES
   * el id que emite GoTrue, porque el registro crea el perfil con ese valor.
   */
  const perfilDeLaSesion =
    perfil !== undefined && perfil.id === sesion?.user.id ? perfil : undefined;

  return {
    perfilDeLaSesion,
    esAdministrador: perfilDeLaSesion?.tipo === 'ADMINISTRADOR',

    /**
     * Lo único que puede faltar EN EL ARRANQUE Y NUNCA DESPUÉS. Los dos son
     * monótonos por construcción: la máquina del enlace no vuelve a
     * `sinResolver` y `resuelta` no vuelve a `false`. Que sean monótonos es lo
     * que hace seguro no dibujar nada mientras duran.
     */
    arrancando: paso === 'sinResolver' || !resuelta,

    /**
     * Hay sesión pero todavía no sabemos de quién: o el perfil está viajando, o
     * el que tenemos es del usuario anterior.
     *
     * Un refetch del MISMO usuario no entra acá —el dato viejo se conserva y su
     * id coincide—, así que editar el perfil no apaga la pantalla.
     */
    esperandoPerfil:
      sesion !== null && perfilDeLaSesion === undefined && !hayErrorDePerfil,
  };
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
