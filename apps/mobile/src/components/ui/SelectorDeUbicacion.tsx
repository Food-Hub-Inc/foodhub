import { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import MapView, { type Region } from 'react-native-maps';
import type { Ubicacion } from '@foodhub/shared';
import { consultarGps, type ResultadoGps } from '../../lib/gps';
import { TEXTOS_REGISTRO, TEXTOS_UBICACION } from '../../lib/textos';
import { IconoUbicacion } from '../iconos';
import { Boton } from './Boton';
import { Esqueleto } from './Esqueleto';
import { MensajeDeCampo } from './MensajeDeCampo';

/**
 * Selector de ubicación del registro de cocinero (PAN-AUT-02, US-AUT-02).
 *
 * La ubicación es OBLIGATORIA: el feed por cercanía, el mapa de cocineros y el
 * filtro por distancia posicionan al cocinero a partir de este punto. Sin él la
 * cuenta se crea pero nadie la encuentra.
 *
 * El pin va fijo en el centro y lo que se mueve es el mapa. Es más preciso que
 * arrastrar un marcador: el dedo no tapa el punto que se está eligiendo.
 *
 * Si el permiso se niega no se deja al usuario trabado: se le explica para qué
 * se necesita y se le ofrece volver a pedirlo, que es lo único que la app puede
 * hacer una vez que Android registró la negativa.
 */

/** Zoom inicial: unas quince cuadras a la redonda, suficiente para reconocer el barrio. */
const AMPLITUD = 0.01;

type Estado = 'pidiendo' | 'denegado' | 'sinPosicion' | 'listo';

// `consultarGps` vive en `lib/gps.ts`: la comparte con `useUbicacionActual`, que
// la necesita para el feed y el mapa del módulo de Exploración. Lo que NO se
// comparte es lo de abajo: acá el punto se persiste como ubicación del cocinero
// y el permiso denegado bloquea el registro, mientras que en Exploración es
// opcional y solo degrada el orden del feed.

export function SelectorDeUbicacion({
  ubicacion,
  onCambiar,
  error,
}: {
  ubicacion: Ubicacion | null;
  onCambiar: (ubicacion: Ubicacion) => void;
  error?: string | undefined;
}) {
  const [estado, setEstado] = useState<Estado>('pidiendo');
  const [region, setRegion] = useState<Region | null>(null);

  /**
   * `onCambiar` SE LEE DE UN REF Y NUNCA ENTRA EN UNA LISTA DE DEPENDENCIAS.
   *
   * Quien monta este componente le pasa un handler creado durante el render
   * —el registro de cocinero escribe `onUbicacion={(valor) => formulario.fijar(…)}`—,
   * así que su identidad cambia cada vez que el formulario se redibuja. Cuando
   * ese handler estaba en las dependencias, el efecto de abajo volvía a
   * consultar el GPS en CADA render y el resultado volvía a llamar al handler,
   * que redibujaba el formulario: un ciclo infinito que hacía titilar el mapa,
   * impedía escribir en los campos y pisaba la ubicación elegida a mano.
   */
  const refOnCambiar = useRef(onCambiar);
  useEffect(() => {
    refOnCambiar.current = onCambiar;
  }, [onCambiar]);

  /**
   * Vuelca el resultado del GPS al estado del componente.
   *
   * Está separado de `consultarGps` a propósito: la consulta es una función
   * pura respecto de React —habla con el sistema operativo y devuelve un
   * valor— y este callback es el único que toca el estado. Esa separación es
   * lo que permite que el efecto de abajo llame a setState desde dentro de una
   * continuación y no de forma sincrónica, que es lo que produce renders en
   * cascada.
   */
  const aplicar = useCallback((resultado: ResultadoGps) => {
    if (resultado.estado !== 'listo') {
      setEstado(resultado.estado);
      return;
    }
    setRegion({
      latitude: resultado.punto.lat,
      longitude: resultado.punto.lng,
      latitudeDelta: AMPLITUD,
      longitudeDelta: AMPLITUD,
    });
    refOnCambiar.current(resultado.punto);
    setEstado('listo');
  }, []);

  // UNA consulta por montaje, igual que `useUbicacionActual`. `aplicar` es
  // estable, así que esta lista es efectivamente vacía: agregarle cualquier
  // cosa que dependa de un prop reintroduce el ciclo descrito arriba.
  useEffect(() => {
    // Si la pantalla se abandona mientras el GPS todavía busca posición, el
    // resultado llega a un componente desmontado. La bandera lo descarta.
    let vigente = true;

    void consultarGps().then((resultado) => {
      if (vigente) aplicar(resultado);
    });

    return () => {
      vigente = false;
    };
  }, [aplicar]);

  const reintentar = useCallback(() => {
    setEstado('pidiendo');
    void consultarGps().then(aplicar);
  }, [aplicar]);

  /**
   * Arrastrar el mapa mueve el punto elegido. Va memorizado para que
   * `CuerpoDelSelector` no reciba un handler nuevo en cada render del padre.
   */
  const cambiarRegion = useCallback((nueva: Region) => {
    setRegion(nueva);
    refOnCambiar.current({ lat: nueva.latitude, lng: nueva.longitude });
  }, []);

  return (
    <View>
      <Text className="mb-1.5 text-label font-semibold text-text-primary">
        {TEXTOS_REGISTRO.ubicacion}
        <Text className="text-label text-error">{' *'}</Text>
      </Text>

      <CuerpoDelSelector
        estado={estado}
        region={region}
        onRegionCambiada={cambiarRegion}
        onReintentar={reintentar}
      />

      {estado === 'listo' && ubicacion ? (
        <Text className="mt-1.5 text-caption text-text-secondary">
          {TEXTOS_UBICACION.detectada}
        </Text>
      ) : null}

      <MensajeDeCampo mensaje={error} idCampo="ubicacion" />
    </View>
  );
}

/** Cuerpo del selector: mapa, esqueleto de carga o explicación del permiso. */
function CuerpoDelSelector({
  estado,
  region,
  onRegionCambiada,
  onReintentar,
}: {
  estado: Estado;
  region: Region | null;
  onRegionCambiada: (region: Region) => void;
  onReintentar: () => void;
}) {
  if (estado === 'pidiendo') {
    return (
      <View>
        <Esqueleto className="h-44 w-full" />
        <Text className="mt-1.5 text-caption text-text-secondary">
          {TEXTOS_UBICACION.detectando}
        </Text>
      </View>
    );
  }

  if (estado !== 'listo' || !region) {
    const mensaje =
      estado === 'denegado'
        ? TEXTOS_UBICACION.permisoDenegado
        : TEXTOS_UBICACION.sinPosicion;

    return (
      <View className="items-center rounded-sm border border-border bg-surface p-5">
        <IconoUbicacion size={28} className="text-text-disabled" />
        <Text className="mt-3 text-center text-body text-text-secondary">
          {mensaje}
        </Text>
        <Boton
          variante="secundario"
          tamano="sm"
          onPress={onReintentar}
          className="mt-4 flex-row items-center justify-center gap-2"
        >
          {TEXTOS_UBICACION.reintentar}
        </Boton>
      </View>
    );
  }

  return (
    <View
      className="h-44 overflow-hidden rounded-sm border border-border"
      accessible
      accessibilityLabel={TEXTOS_UBICACION.etiquetaMapa}
    >
      <MapView
        style={{ flex: 1 }}
        initialRegion={region}
        onRegionChangeComplete={onRegionCambiada}
        showsUserLocation
        toolbarEnabled={false}
        userInterfaceStyle="light"
      />
      {/* El pin no es un Marker: está pegado al centro de la vista, no al mapa. */}
      <View className="absolute inset-0 items-center justify-center">
        <IconoUbicacion size={34} className="text-primary" />
      </View>
    </View>
  );
}
