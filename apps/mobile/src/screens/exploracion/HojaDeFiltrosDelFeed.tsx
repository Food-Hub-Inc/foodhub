import { Pressable, ScrollView, Text, View } from 'react-native';
import { MENSAJES_EXPLORACION } from '@foodhub/shared';
import { IconoTilde } from '../../components/iconos';
import { Boton } from '../../components/ui/Boton';
import { CampoTexto } from '../../components/ui/CampoTexto';
import { Casilla } from '../../components/ui/Casilla';
import { HojaInferior } from '../../components/ui/HojaInferior';
import { useCategorias } from '../../hooks/useCategorias';
import { TEXTOS_EXPLORACION } from '../../lib/textos';
import {
  OPCIONES_DISTANCIA_KM,
  OPCIONES_VALORACION_MINIMA,
  SIN_FILTROS_DEL_FEED,
  type FiltrosDelFeedSeleccionados,
} from './filtros';

/**
 * Hoja de filtros del feed — PAN-EXP-03, US-EXP-03.
 *
 * ESCRIBE DIRECTO SOBRE LOS FILTROS APLICADOS, sin borrador intermedio y sin
 * botón "Aplicar filtros". Es la diferencia deliberada con `HojaDeFiltros` del
 * módulo de Publicaciones, que hace exactamente lo contrario: allá el criterio
 * de US-PUB-05 dice que los resultados cambian recién al presionar el botón, y
 * acá el segundo criterio de US-EXP-03 exige "actualice los resultados de forma
 * inmediata combinando todos los filtros activos".
 *
 * Por eso el único botón del pie es "Limpiar filtros" (quinto criterio) y el
 * cierre no confirma nada: lo que se ve detrás de la hoja ya cambió.
 *
 * El filtro de distancia solo aparece con ubicación disponible. Sin punto de
 * referencia no hay distancia que medir, y ofrecer un control que el servidor va
 * a ignorar es peor que no ofrecerlo.
 */
export function HojaDeFiltrosDelFeed({
  abierta,
  filtros,
  hayUbicacion,
  tieneCocinerosFavoritos,
  onCambiar,
  onCerrar,
}: {
  abierta: boolean;
  filtros: FiltrosDelFeedSeleccionados;
  hayUbicacion: boolean;
  tieneCocinerosFavoritos: boolean;
  onCambiar: (filtros: FiltrosDelFeedSeleccionados) => void;
  onCerrar: () => void;
}) {
  return (
    <HojaInferior
      abierta={abierta}
      etiquetaAccesible={TEXTOS_EXPLORACION.filtros}
      onCerrar={onCerrar}
    >
      <Text className="mb-4 text-center text-h2 font-bold text-text-primary">
        {TEXTOS_EXPLORACION.filtros}
      </Text>

      <ScrollView className="max-h-96">
        <CuerpoDeFiltros
          filtros={filtros}
          hayUbicacion={hayUbicacion}
          onCambiar={onCambiar}
          tieneCocinerosFavoritos={tieneCocinerosFavoritos}
        />
      </ScrollView>

      <Boton
        className="mt-5"
        variante="secundario"
        onPress={() => {
          onCambiar(SIN_FILTROS_DEL_FEED);
        }}
      >
        {MENSAJES_EXPLORACION.limpiarFiltros}
      </Boton>
    </HojaInferior>
  );
}

/**
 * Los cinco controles de la hoja.
 *
 * Van en su propio componente y no dentro del `ScrollView` de arriba para que
 * ninguno de los dos pase del umbral de líneas que fija ESLint: la hoja se ocupa
 * del encabezado, el scroll y "Limpiar filtros", y este del contenido.
 */
function CuerpoDeFiltros({
  filtros,
  hayUbicacion,
  tieneCocinerosFavoritos,
  onCambiar,
}: {
  filtros: FiltrosDelFeedSeleccionados;
  hayUbicacion: boolean;
  tieneCocinerosFavoritos: boolean;
  onCambiar: (filtros: FiltrosDelFeedSeleccionados) => void;
}) {
  return (
    <>
      <FiltroDeFavoritos
        activo={filtros.soloFavoritos}
        onAlternar={() => {
          onCambiar({ ...filtros, soloFavoritos: !filtros.soloFavoritos });
        }}
        tieneCocinerosFavoritos={tieneCocinerosFavoritos}
      />

      <SelectorDeCategorias
        categoriaIds={filtros.categoriaIds}
        onAlternar={(id) => {
          onCambiar({
            ...filtros,
            categoriaIds: filtros.categoriaIds.includes(id)
              ? filtros.categoriaIds.filter((otro) => otro !== id)
              : [...filtros.categoriaIds, id],
          });
        }}
      />

      <RangoDePrecio
        onCambiarMaximo={(precioMaximo) => {
          onCambiar({ ...filtros, precioMaximo });
        }}
        onCambiarMinimo={(precioMinimo) => {
          onCambiar({ ...filtros, precioMinimo });
        }}
        precioMaximo={filtros.precioMaximo}
        precioMinimo={filtros.precioMinimo}
      />

      {hayUbicacion ? (
        <GrupoDeOpciones
          etiqueta={TEXTOS_EXPLORACION.distanciaMaxima}
          onElegir={(distanciaMaximaKm) => {
            onCambiar({ ...filtros, distanciaMaximaKm });
          }}
          opciones={OPCIONES_DISTANCIA_KM.map((km) => ({
            valor: km,
            texto: TEXTOS_EXPLORACION.distanciaOpcion(km),
          }))}
          valor={filtros.distanciaMaximaKm}
        />
      ) : null}

      <GrupoDeOpciones
        etiqueta={TEXTOS_EXPLORACION.valoracionMinima}
        onElegir={(valoracionMinima) => {
          onCambiar({ ...filtros, valoracionMinima });
        }}
        opciones={OPCIONES_VALORACION_MINIMA.map((estrellas) => ({
          valor: estrellas,
          texto: TEXTOS_EXPLORACION.valoracionOpcion(estrellas),
        }))}
        valor={filtros.valoracionMinima}
      />
    </>
  );
}

/**
 * Filtro "Mis favoritos" (quinto criterio de US-EXP-06).
 *
 * Cuando el cliente no tiene cocineros favoritos, la casilla queda
 * DESHABILITADA y se explica por qué con el literal "Guardá cocineros como
 * favoritos para filtrar el feed." Deshabilitarla en lugar de ocultarla sigue el
 * mismo criterio que las notificaciones no modificables de US-NOT-07: así queda
 * claro que el filtro existe y qué falta para poder usarlo.
 */
function FiltroDeFavoritos({
  activo,
  tieneCocinerosFavoritos,
  onAlternar,
}: {
  activo: boolean;
  tieneCocinerosFavoritos: boolean;
  onAlternar: () => void;
}) {
  return (
    <View className="mb-5">
      <Casilla
        nombre="solo-favoritos"
        marcada={activo}
        onChange={tieneCocinerosFavoritos ? onAlternar : () => undefined}
        etiquetaAccesible={MENSAJES_EXPLORACION.misFavoritos}
      >
        <Text
          className={`text-body ${tieneCocinerosFavoritos ? 'text-text-primary' : 'text-text-disabled'}`}
        >
          {MENSAJES_EXPLORACION.misFavoritos}
        </Text>
      </Casilla>

      {tieneCocinerosFavoritos ? null : (
        <Text className="mt-1 text-caption text-text-secondary">
          {MENSAJES_EXPLORACION.sinFavoritosParaFiltrar}
        </Text>
      )}
    </View>
  );
}

function SelectorDeCategorias({
  categoriaIds,
  onAlternar,
}: {
  categoriaIds: readonly string[];
  onAlternar: (id: string) => void;
}) {
  const categorias = useCategorias();

  return (
    <>
      <Text className="mb-2 text-label font-semibold text-text-primary">
        {TEXTOS_EXPLORACION.categoria}
      </Text>
      {(categorias.data ?? []).map((categoria) => (
        <Casilla
          key={categoria.id}
          nombre={`categoria-${categoria.id}`}
          marcada={categoriaIds.includes(categoria.id)}
          onChange={() => {
            onAlternar(categoria.id);
          }}
          etiquetaAccesible={categoria.nombre}
        >
          <Text className="text-body text-text-primary">
            {categoria.nombre}
          </Text>
        </Casilla>
      ))}
    </>
  );
}

function RangoDePrecio({
  precioMinimo,
  precioMaximo,
  onCambiarMinimo,
  onCambiarMaximo,
}: {
  precioMinimo: string;
  precioMaximo: string;
  onCambiarMinimo: (valor: string) => void;
  onCambiarMaximo: (valor: string) => void;
}) {
  return (
    <>
      <Text className="mb-2 mt-5 text-label font-semibold text-text-primary">
        {TEXTOS_EXPLORACION.rangoDePrecio}
      </Text>
      <View className="flex-row gap-3">
        <CampoTexto
          className="flex-1"
          etiqueta={TEXTOS_EXPLORACION.precioMinimo}
          nombre="precio-minimo"
          onChange={onCambiarMinimo}
          tipoTeclado="decimal-pad"
          valor={precioMinimo}
        />
        <CampoTexto
          className="flex-1"
          etiqueta={TEXTOS_EXPLORACION.precioMaximo}
          nombre="precio-maximo"
          onChange={onCambiarMaximo}
          tipoTeclado="decimal-pad"
          valor={precioMaximo}
        />
      </View>
    </>
  );
}

/**
 * Grupo de opciones de valor único (distancia, valoración).
 *
 * Volver a tocar la opción elegida la deselecciona. Sin eso, un filtro de valor
 * único no se puede quitar desde su propio control: habría que ir al chip o a
 * "Limpiar filtros", que además borra todo lo demás.
 */
function GrupoDeOpciones({
  etiqueta,
  opciones,
  valor,
  onElegir,
}: {
  etiqueta: string;
  opciones: { valor: number; texto: string }[];
  valor: number | null;
  onElegir: (valor: number | null) => void;
}) {
  return (
    <>
      <Text className="mb-2 mt-5 text-label font-semibold text-text-primary">
        {etiqueta}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {opciones.map((opcion) => {
          const elegida = opcion.valor === valor;
          return (
            <Pressable
              key={opcion.valor}
              onPress={() => {
                onElegir(elegida ? null : opcion.valor);
              }}
              className={`min-h-11 flex-row items-center gap-1.5 rounded-full border px-4 ${
                elegida
                  ? 'border-primary bg-primary'
                  : 'border-border bg-surface'
              }`}
              accessibilityRole="radio"
              accessibilityState={{ checked: elegida }}
              accessibilityLabel={opcion.texto}
            >
              {elegida ? (
                <IconoTilde size={14} className="text-surface" />
              ) : null}
              <Text
                className={`text-body ${elegida ? 'font-semibold text-surface' : 'text-text-primary'}`}
              >
                {opcion.texto}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </>
  );
}
