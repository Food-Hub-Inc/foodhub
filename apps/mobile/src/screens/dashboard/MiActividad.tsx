import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  ESTADOS_DISTRIBUCION,
  MENSAJES_DASHBOARD,
  PERIODO_POR_DEFECTO,
  porcentajesDeDistribucion,
  type ActividadCocinero,
  type ClienteRecurrente,
  type DistribucionPedidos,
  type PlatoMasPedido,
  type ResumenActividad,
} from '@foodhub/shared';
import {
  IconoBolsa,
  IconoChevronAbajo,
  IconoCocinero,
  IconoUsuario,
} from '../../components/iconos';
import { PantallaDeTab } from '../../components/PantallaDeTab';
import { BotonDeTexto } from '../../components/ui/Boton';
import { EncabezadoPantalla } from '../../components/ui/EncabezadoPantalla';
import { Esqueleto } from '../../components/ui/Esqueleto';
import { EstadoDeError } from '../../components/ui/EstadoDeError';
import { useActividadDelCocinero } from '../../hooks/useDashboard';
import { mensajeDeError } from '../../lib/api';
import { formatearPrecio } from '../../lib/formato';
import {
  aRangoDeApi,
  describirRango,
  seleccionPredefinida,
  type SeleccionDePeriodo,
} from '../../lib/periodos';
import { TEXTOS_DASHBOARD } from '../../lib/textos';
import { ETIQUETA_DE_PERIODO } from './estados';
import { GraficoDeDona } from './GraficoDeDona';
import {
  FilaDeCliente,
  FilaDeDistribucion,
  FilaDeRanking,
  SeccionDelDashboard,
  SeccionVacia,
  TarjetaDeResumen,
  ValoracionPromedio,
  ValorDeTarjeta,
} from './Piezas';
import { SelectorDePeriodo } from './SelectorDePeriodo';

/**
 * Mi actividad — PAN-DASH-01 · US-DASH-01 a US-DASH-05.
 *
 * EL PERÍODO ES ESTADO DE ESTA PANTALLA Y DE NADIE MÁS. US-DASH-05 no es una
 * métrica: es un parámetro de las otras cuatro. Se resuelve una sola vez acá y
 * baja a las cuatro secciones a través de una única consulta, así ninguna puede
 * quedar mostrando un rango distinto del que dice el encabezado.
 *
 * ERROR Y CARGA SON DE LA PANTALLA; EL VACÍO ES DE CADA SECCIÓN. Hay un solo
 * request, así que si falla fallan las cuatro secciones a la vez y un solo
 * `EstadoDeError` con "Reintentar" es la respuesta honesta. Los estados vacíos,
 * en cambio, son independientes: el último criterio de US-DASH-05 pide "en cada
 * sección del dashboard su mensaje de estado vacío correspondiente, sin ocultar
 * las secciones ni mostrar errores".
 */

/** US-DASH-02: "muestre los primeros 5 resultados y un botón 'Ver todos'". */
const PLATOS_VISIBLES = 5;

export function MiActividad() {
  const [seleccion, setSeleccion] = useState<SeleccionDePeriodo>(() =>
    seleccionPredefinida(PERIODO_POR_DEFECTO),
  );
  const [aperturas, setAperturas] = useState(0);
  const [selectorAbierto, setSelectorAbierto] = useState(false);
  const [rankingCompleto, setRankingCompleto] = useState(false);

  const rango = useMemo(
    () => aRangoDeApi(seleccion.desde, seleccion.hasta),
    [seleccion],
  );
  const consulta = useActividadDelCocinero(rango);
  const rangoEscrito = describirRango(seleccion.desde, seleccion.hasta);

  const abrirSelector = () => {
    // El contador reinicia el borrador del panel personalizado; ver la `key` de
    // `SelectorDePeriodo`.
    setAperturas((previas) => previas + 1);
    setSelectorAbierto(true);
  };

  const cambiarPeriodo = (nueva: SeleccionDePeriodo) => {
    setSeleccion(nueva);
    // El ranking del período nuevo puede tener menos de cinco platos: dejarlo
    // expandido mostraría un "Ver todos" ya usado sobre una lista corta.
    setRankingCompleto(false);
  };

  return (
    <PantallaDeTab>
      <EncabezadoPantalla
        accion={
          <Pressable
            onPress={abrirSelector}
            className="min-h-11 flex-row items-center gap-1 rounded-full border border-border px-3 py-2"
            accessibilityRole="button"
            accessibilityLabel={TEXTOS_DASHBOARD.cambiarPeriodo(rangoEscrito)}
          >
            <Text className="text-caption font-semibold text-text-primary">
              {ETIQUETA_DE_PERIODO[seleccion.periodo]}
            </Text>
            <IconoChevronAbajo size={16} className="text-text-secondary" />
          </Pressable>
        }
        titulo={MENSAJES_DASHBOARD.miActividad}
      />

      <View className="border-b border-border bg-surface px-4 pb-2.5">
        <Text className="text-caption text-text-secondary">{rangoEscrito}</Text>
      </View>

      {consulta.isError ? (
        <EstadoDeError
          mensaje={mensajeDeError(consulta.error)}
          onReintentar={() => {
            void consulta.refetch();
          }}
        />
      ) : consulta.data === undefined ? (
        <EsqueletoDelDashboard />
      ) : (
        <Contenido
          actividad={consulta.data}
          rankingCompleto={rankingCompleto}
          onVerTodosLosPlatos={() => {
            setRankingCompleto(true);
          }}
        />
      )}

      <SelectorDePeriodo
        abierto={selectorAbierto}
        apertura={aperturas}
        onCerrar={() => {
          setSelectorAbierto(false);
        }}
        onSeleccionar={cambiarPeriodo}
        seleccion={seleccion}
      />
    </PantallaDeTab>
  );
}

/** Las cuatro secciones, en el orden en que las numeran las historias. */
function Contenido({
  actividad,
  rankingCompleto,
  onVerTodosLosPlatos,
}: {
  actividad: ActividadCocinero;
  rankingCompleto: boolean;
  onVerTodosLosPlatos: () => void;
}) {
  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="px-4 pb-10 pt-4"
      showsVerticalScrollIndicator={false}
    >
      <ResumenGeneral
        resumen={actividad.resumen}
        sinCompletados={actividad.distribucion.completados === 0}
      />
      <RankingDePlatos
        completo={rankingCompleto}
        onVerTodos={onVerTodosLosPlatos}
        platos={actividad.platosMasPedidos}
      />
      <ClientesRecurrentes clientes={actividad.clientesRecurrentes} />
      <DistribucionPorEstado distribucion={actividad.distribucion} />
    </ScrollView>
  );
}

/** US-DASH-01 — Las tres tarjetas de resumen. */
function ResumenGeneral({
  resumen,
  sinCompletados,
}: {
  resumen: ResumenActividad;
  sinCompletados: boolean;
}) {
  return (
    <View>
      <View className="flex-row gap-3">
        <TarjetaDeResumen rotulo={MENSAJES_DASHBOARD.ventasAcumuladas}>
          <ValorDeTarjeta>
            {formatearPrecio(resumen.ventasAcumuladas)}
          </ValorDeTarjeta>
        </TarjetaDeResumen>
        <TarjetaDeResumen rotulo={MENSAJES_DASHBOARD.pedidosTotales}>
          <ValorDeTarjeta>{String(resumen.pedidosTotales)}</ValorDeTarjeta>
        </TarjetaDeResumen>
        <TarjetaDeResumen rotulo={MENSAJES_DASHBOARD.valoracionPromedio}>
          <ValoracionPromedio promedio={resumen.valoracionPromedio} />
        </TarjetaDeResumen>
      </View>

      {/* El criterio ata este aviso a que no haya pedidos COMPLETADOS, no a que
          no haya pedidos: un período con tres rechazos tiene actividad para las
          otras secciones pero no tiene ventas que resumir. */}
      {sinCompletados ? (
        <Text className="mt-3 text-body text-text-secondary">
          {MENSAJES_DASHBOARD.sinActividad}
        </Text>
      ) : null}
    </View>
  );
}

/** US-DASH-02 — El ranking, cortado en cinco hasta que se toca "Ver todos". */
function RankingDePlatos({
  platos,
  completo,
  onVerTodos,
}: {
  platos: PlatoMasPedido[];
  completo: boolean;
  onVerTodos: () => void;
}) {
  const visibles = completo ? platos : platos.slice(0, PLATOS_VISIBLES);

  return (
    <SeccionDelDashboard
      accion={
        platos.length > PLATOS_VISIBLES && !completo ? (
          <BotonDeTexto onPress={onVerTodos}>
            {MENSAJES_DASHBOARD.verTodos}
          </BotonDeTexto>
        ) : undefined
      }
      titulo={MENSAJES_DASHBOARD.platosMasPedidos}
    >
      {visibles.length === 0 ? (
        <SeccionVacia
          icono={<IconoCocinero size={24} className="text-primary" />}
          mensaje={MENSAJES_DASHBOARD.sinPlatosPedidos}
        />
      ) : (
        <View className="overflow-hidden rounded-md border border-border bg-surface">
          {visibles.map((plato, indice) => (
            <FilaDeRanking
              key={plato.publicacionId}
              plato={plato}
              puesto={indice + 1}
            />
          ))}
        </View>
      )}
    </SeccionDelDashboard>
  );
}

/** US-DASH-03 — Los clientes con más de un pedido completado en el período. */
function ClientesRecurrentes({ clientes }: { clientes: ClienteRecurrente[] }) {
  return (
    <SeccionDelDashboard titulo={MENSAJES_DASHBOARD.clientesRecurrentes}>
      {clientes.length === 0 ? (
        <SeccionVacia
          icono={<IconoUsuario size={24} className="text-primary" />}
          mensaje={MENSAJES_DASHBOARD.sinClientesRecurrentes}
        />
      ) : (
        <View className="overflow-hidden rounded-md border border-border bg-surface">
          {clientes.map((cliente) => (
            <FilaDeCliente
              key={cliente.clienteId}
              cliente={cliente}
              onPress={() => {
                router.push({
                  pathname: '/clientes/[id]',
                  params: { id: cliente.clienteId },
                });
              }}
            />
          ))}
        </View>
      )}
    </SeccionDelDashboard>
  );
}

/** US-DASH-04 — La dona y el listado con cantidad y porcentaje. */
function DistribucionPorEstado({
  distribucion,
}: {
  distribucion: DistribucionPedidos;
}) {
  const porcentajes = porcentajesDeDistribucion(distribucion);

  return (
    <SeccionDelDashboard titulo={MENSAJES_DASHBOARD.pedidosPorEstado}>
      {distribucion.total === 0 ? (
        <SeccionVacia
          icono={<IconoBolsa size={24} className="text-primary" />}
          mensaje={MENSAJES_DASHBOARD.sinPedidosRegistrados}
        />
      ) : (
        <View className="overflow-hidden rounded-md border border-border bg-surface pt-5">
          <View
            className="items-center pb-5"
            accessibilityLabel={TEXTOS_DASHBOARD.distribucionDePedidos}
          >
            <GraficoDeDona
              porcentajes={porcentajes}
              total={distribucion.total}
            />
          </View>

          {/* Los cuatro estados siempre, también los que están en cero: "para
              que el cocinero tenga siempre una vista completa de todos los
              estados posibles". */}
          {ESTADOS_DISTRIBUCION.map((estado) => (
            <FilaDeDistribucion
              key={estado}
              cantidad={distribucion[estado]}
              estado={estado}
              porcentaje={porcentajes[estado]}
            />
          ))}
        </View>
      )}
    </SeccionDelDashboard>
  );
}

/**
 * Carga con la forma del contenido real: tres tarjetas arriba y dos bloques de
 * lista. Solo aparece la primera vez; al cambiar de período los datos anteriores
 * se quedan en pantalla (ver `useActividadDelCocinero`).
 */
function EsqueletoDelDashboard() {
  return (
    <View className="px-4 pt-4">
      <View className="flex-row gap-3">
        <Esqueleto className="h-20 flex-1 rounded-md" />
        <Esqueleto className="h-20 flex-1 rounded-md" />
        <Esqueleto className="h-20 flex-1 rounded-md" />
      </View>
      <Esqueleto className="mt-6 h-5 w-40" />
      <Esqueleto className="mt-3 h-44 rounded-md" />
      <Esqueleto className="mt-6 h-5 w-44" />
      <Esqueleto className="mt-3 h-32 rounded-md" />
    </View>
  );
}
