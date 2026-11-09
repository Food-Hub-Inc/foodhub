import { useState } from 'react';
import { FlatList, View } from 'react-native';
import { router } from 'expo-router';
import {
  FILTRO_CONVERSACIONES,
  MENSAJES_MENSAJERIA,
  type FiltroConversaciones,
} from '@foodhub/shared';
import { IconoMensaje } from '../../components/iconos';
import { PantallaDeTab } from '../../components/PantallaDeTab';
import { Boton } from '../../components/ui/Boton';
import { BarraDeBusqueda } from '../../components/ui/BarraDeBusqueda';
import { EncabezadoPantalla } from '../../components/ui/EncabezadoPantalla';
import { Esqueleto } from '../../components/ui/Esqueleto';
import { EstadoDeError } from '../../components/ui/EstadoDeError';
import { EstadoVacio } from '../../components/ui/EstadoVacio';
import {
  useArchivarConversacion,
  useConversaciones,
} from '../../hooks/useMensajeria';
import { useValorDebounced } from '../../hooks/useValorDebounced';
import { mensajeDeError } from '../../lib/api';
import { TEXTOS_MENSAJERIA } from '../../lib/textos';
import { Pestanas } from '../pedidos/Piezas';
import { FilaDeConversacion } from './FilaDeConversacion';

/**
 * "Mensajes" — PAN-MSG-01 · US-MSG-04.
 *
 * La misma pantalla para el cliente y para el cocinero: el criterio de
 * aceptación es idéntico para los dos actores y lo único que cambia es el estado
 * vacío, que para el cliente lleva "un acceso para explorar cocineros".
 *
 * EL ESTADO VACÍO SE BIFURCA EN TRES, no en uno. Son tres situaciones distintas
 * con tres salidas distintas, y el criterio fija dos de los textos:
 *
 *   sin conversaciones     "Todavía no tienes conversaciones."
 *   búsqueda sin resultado "No se encontraron conversaciones con esos criterios."
 *                          + "Limpiar filtros"
 *   nada archivado         texto propio: el criterio no lo cubre.
 */

const ETIQUETA: Record<FiltroConversaciones, string> = {
  ACTIVAS: TEXTOS_MENSAJERIA.filtroActivas,
  ARCHIVADAS: MENSAJES_MENSAJERIA.archivados,
};

export function ListaDeConversaciones({ esCliente }: { esCliente: boolean }) {
  const [filtro, setFiltro] = useState<FiltroConversaciones>('ACTIVAS');
  const [busqueda, setBusqueda] = useState('');
  const termino = useValorDebounced(busqueda);

  const consulta = useConversaciones(filtro, termino);
  const archivar = useArchivarConversacion();

  return (
    <PantallaDeTab>
      <EncabezadoPantalla titulo={MENSAJES_MENSAJERIA.mensajes} />

      <View className="flex-row border-b border-border bg-surface px-4 pb-3 pt-3">
        <BarraDeBusqueda
          onCambiar={setBusqueda}
          placeholder={TEXTOS_MENSAJERIA.buscarConversacion}
          valor={busqueda}
        />
      </View>

      <Pestanas
        activa={filtro}
        onCambiar={setFiltro}
        opciones={FILTRO_CONVERSACIONES.map((valor) => ({
          valor,
          etiqueta: ETIQUETA[valor],
        }))}
      />

      <Contenido
        consulta={consulta}
        esCliente={esCliente}
        filtro={filtro}
        onArchivar={(conversacionId, archivada) => {
          archivar.mutate({ conversacionId, archivada });
        }}
        onLimpiar={() => {
          setBusqueda('');
        }}
        termino={termino}
      />
    </PantallaDeTab>
  );
}

function Contenido({
  consulta,
  esCliente,
  filtro,
  termino,
  onArchivar,
  onLimpiar,
}: {
  consulta: ReturnType<typeof useConversaciones>;
  esCliente: boolean;
  filtro: FiltroConversaciones;
  termino: string;
  onArchivar: (conversacionId: string, archivada: boolean) => void;
  onLimpiar: () => void;
}) {
  if (consulta.isError) {
    return (
      <EstadoDeError
        mensaje={mensajeDeError(consulta.error)}
        onReintentar={() => {
          void consulta.refetch();
        }}
      />
    );
  }

  if (consulta.isPending) return <EsqueletoDeListado />;

  const conversaciones = consulta.data;
  if (conversaciones.length === 0) {
    return (
      <Vacio
        conBusqueda={termino.length > 0}
        esCliente={esCliente}
        filtro={filtro}
        onLimpiar={onLimpiar}
      />
    );
  }

  return (
    <FlatList
      data={conversaciones}
      keyExtractor={(conversacion) => conversacion.id}
      renderItem={({ item }) => (
        <FilaDeConversacion
          conversacion={item}
          onAbrir={() => {
            router.push({
              pathname: '/mensajes/[conversacionId]',
              params: { conversacionId: item.id },
            });
          }}
          onArchivar={() => {
            onArchivar(item.id, !item.archivada);
          }}
        />
      )}
    />
  );
}

/** Skeleton con la forma de las filas reales, no un spinner suelto. */
function EsqueletoDeListado() {
  return (
    <View className="px-4 pt-3">
      {[0, 1, 2, 3, 4].map((fila) => (
        <View className="flex-row items-center gap-3 py-3" key={fila}>
          <Esqueleto className="h-11 w-11 rounded-full" />
          <View className="flex-1 gap-2">
            <Esqueleto className="h-4 w-2/5" />
            <Esqueleto className="h-3 w-4/5" />
          </View>
        </View>
      ))}
    </View>
  );
}

function Vacio({
  conBusqueda,
  esCliente,
  filtro,
  onLimpiar,
}: {
  conBusqueda: boolean;
  esCliente: boolean;
  filtro: FiltroConversaciones;
  onLimpiar: () => void;
}) {
  const icono = <IconoMensaje className="text-primary" size={28} />;

  if (conBusqueda) {
    return (
      <EstadoVacio
        accion={
          <Boton onPress={onLimpiar} tamano="sm" variante="secundario">
            {MENSAJES_MENSAJERIA.limpiarFiltros}
          </Boton>
        }
        icono={icono}
        titulo={MENSAJES_MENSAJERIA.sinResultadosDeBusqueda}
      />
    );
  }

  if (filtro === 'ARCHIVADAS') {
    return (
      <EstadoVacio icono={icono} titulo={TEXTOS_MENSAJERIA.sinArchivadas} />
    );
  }

  /**
   * US-MSG-04: el acceso para explorar cocineros es "en el caso del cliente".
   * Al cocinero no se le ofrece: su feed no existe, y las conversaciones le
   * llegan desde el perfil o el pedido, no las inicia él.
   */
  return (
    <EstadoVacio
      accion={
        esCliente ? (
          <Boton
            onPress={() => {
              router.push('/(cliente)/inicio');
            }}
            tamano="sm"
          >
            {TEXTOS_MENSAJERIA.explorarCocineros}
          </Boton>
        ) : undefined
      }
      icono={icono}
      titulo={MENSAJES_MENSAJERIA.sinConversaciones}
    />
  );
}
