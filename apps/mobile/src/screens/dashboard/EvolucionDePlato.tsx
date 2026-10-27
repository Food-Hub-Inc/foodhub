import { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import {
  MENSAJES_DASHBOARD,
  PERIODO_DASHBOARD,
  PERIODO_POR_DEFECTO,
  serieDeEvolucion,
  type EvolucionPlato,
  type PeriodoDashboard,
} from '@foodhub/shared';
import { IconoCocinero } from '../../components/iconos';
import { SafeAreaView } from '../../components/SafeAreaView';
import { EncabezadoPantalla } from '../../components/ui/EncabezadoPantalla';
import { Esqueleto } from '../../components/ui/Esqueleto';
import { EstadoDeError } from '../../components/ui/EstadoDeError';
import { useEvolucionDePlato } from '../../hooks/useDashboard';
import { mensajeDeError } from '../../lib/api';
import {
  aRangoDeApi,
  describirRango,
  seleccionPredefinida,
  type SeleccionDePeriodo,
} from '../../lib/periodos';
import { ETIQUETA_DE_PERIODO } from './estados';
import { GraficoDeEvolucion } from './GraficoDeEvolucion';
import { SeccionVacia } from './Piezas';

/**
 * Evolución de un plato — corrección del 20/10/2026, extensión de PAN-DASH-01.
 *
 * Se entra tocando un plato del ranking de US-DASH-02. NO TIENE SELECTOR DE
 * PERÍODO PROPIO: usa el que estaba activo en "Mi actividad" (decisión del
 * equipo del 27/10/2026), así "Esta semana" muestra la semana día a día y
 * "Este mes" el mes día a día. Para cambiarlo se vuelve y se elige otro.
 *
 * Las fechas llegan en la ruta. Si faltan o no se pueden leer —un enlace
 * directo, un parámetro manipulado— se cae al período por defecto en lugar de
 * mostrar un error: el dato que se pide sigue teniendo sentido.
 */
export function EvolucionDePlato({
  id,
  periodo,
  desde,
  hasta,
}: {
  id: string | undefined;
  periodo: string | undefined;
  desde: string | undefined;
  hasta: string | undefined;
}) {
  const seleccion = useMemo(
    () => leerSeleccion(periodo, desde, hasta),
    [periodo, desde, hasta],
  );
  const rango = useMemo(
    () => aRangoDeApi(seleccion.desde, seleccion.hasta),
    [seleccion],
  );
  const consulta = useEvolucionDePlato(id ?? '', rango);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <EncabezadoPantalla
        destinoAlternativo="/(cocinero)/actividad"
        titulo={MENSAJES_DASHBOARD.evolucionDelPlato}
      />

      <View className="border-b border-border bg-surface px-4 pb-2.5">
        <Text className="text-caption text-text-secondary">
          {`${ETIQUETA_DE_PERIODO[seleccion.periodo]} · ${describirRango(seleccion.desde, seleccion.hasta)}`}
        </Text>
      </View>

      {consulta.isError ? (
        <EstadoDeError
          mensaje={mensajeDeError(consulta.error)}
          onReintentar={() => {
            void consulta.refetch();
          }}
        />
      ) : consulta.data === undefined ? (
        <View className="px-4 pt-4">
          <Esqueleto className="h-6 w-48" />
          <Esqueleto className="mt-2 h-4 w-32" />
          <Esqueleto className="mt-4 h-48 rounded-md" />
        </View>
      ) : (
        <Contenido evolucion={consulta.data} seleccion={seleccion} />
      )}
    </SafeAreaView>
  );
}

function Contenido({
  evolucion,
  seleccion,
}: {
  evolucion: EvolucionPlato;
  seleccion: SeleccionDePeriodo;
}) {
  const serie = serieDeEvolucion(
    evolucion.evolucion,
    seleccion.desde,
    seleccion.hasta,
  );

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="px-4 pb-10 pt-4"
      showsVerticalScrollIndicator={false}
    >
      <Text className="text-h2 font-extrabold text-text-primary">
        {evolucion.eliminado
          ? `${evolucion.nombre} ${MENSAJES_DASHBOARD.sufijoEliminado}`
          : evolucion.nombre}
      </Text>
      <Text className="mt-1 text-body font-bold text-primary">
        {MENSAJES_DASHBOARD.pedidosDelPlatoEnElPeriodo(evolucion.totalPedidos)}
      </Text>
      <Text className="mt-0.5 text-caption text-text-secondary">
        {MENSAJES_DASHBOARD.descripcionEvolucionDelPlato}
      </Text>

      <View className="mt-4">
        {evolucion.totalPedidos === 0 ? (
          <SeccionVacia
            icono={<IconoCocinero size={24} className="text-primary" />}
            mensaje={MENSAJES_DASHBOARD.sinPedidosDelPlato}
          />
        ) : (
          <View className="overflow-hidden rounded-md border border-border bg-surface p-3">
            <GraficoDeEvolucion
              granularidad={evolucion.evolucion.granularidad}
              serie={serie}
            />
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function esPeriodo(valor: string | undefined): valor is PeriodoDashboard {
  return PERIODO_DASHBOARD.some((periodo) => periodo === valor);
}

/** El período que viene en la ruta, o el por defecto si no se puede leer. */
function leerSeleccion(
  periodo: string | undefined,
  desde: string | undefined,
  hasta: string | undefined,
): SeleccionDePeriodo {
  const fechaDesde = new Date(desde ?? '');
  const fechaHasta = new Date(hasta ?? '');
  const validas =
    esPeriodo(periodo) &&
    !Number.isNaN(fechaDesde.getTime()) &&
    !Number.isNaN(fechaHasta.getTime()) &&
    fechaDesde <= fechaHasta;

  return validas
    ? { periodo, desde: fechaDesde, hasta: fechaHasta }
    : seleccionPredefinida(PERIODO_POR_DEFECTO);
}
