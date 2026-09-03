import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import type {
  InfiniteData,
  UseInfiniteQueryResult,
} from '@tanstack/react-query';
import {
  MENSAJES_RESENA,
  ORDEN_RESENAS,
  type OrdenResenas,
  type PaginaResenas,
  type ResenaPublica,
} from '@foodhub/shared';
import { IconoEstrella } from '../../components/iconos';
import { Esqueleto } from '../../components/ui/Esqueleto';
import { EstadoDeError } from '../../components/ui/EstadoDeError';
import { EstadoVacio } from '../../components/ui/EstadoVacio';
import { useResenasDeCocinero } from '../../hooks/useResenas';
import { mensajeDeError } from '../../lib/api';
import { TEXTOS_RESENA } from '../../lib/textos';
import { GaleriaDeResenas } from './GaleriaDeResenas';
import { ResumenDeResenas } from './ResumenDeResenas';
import { TarjetaDeResena } from './TarjetaDeResena';

/**
 * Listado de reseñas de un cocinero — US-RES-03 (RF082).
 *
 * UN SOLO COMPONENTE PARA LAS DOS VISTAS. El cliente lo ve dentro del perfil
 * público (solapa "Reseñas" de PAN-EXP-04) y el cocinero como "Mis reseñas"
 * (PAN-RES-02). Es el mismo endpoint, el mismo resumen y las mismas tarjetas:
 * lo único que cambia es quién entra y desde dónde. Dos copias se habrían ido
 * separando en cuanto una recibiera un ajuste.
 *
 * `accionVacio` es la única diferencia real: cuando el cocinero no tiene
 * reseñas, al cliente que ya le compró se le ofrece dejar la primera
 * (US-RES-03), y al propio cocinero mirando su perfil no se le ofrece nada.
 */
export function ListaDeResenas({
  cocineroId,
  accionVacio,
  encabezado,
  pieDeTarjeta,
}: {
  cocineroId: string;
  accionVacio?: React.ReactNode;
  encabezado?: React.ReactNode;
  /**
   * Lo que cada vista agrega al pie de CADA tarjeta. "Mis reseñas" pasa el
   * botón de responder de US-RES-05; el perfil público no pasa nada, porque el
   * criterio ubica esa acción en "Mi reputación" y no en el perfil.
   */
  pieDeTarjeta?: (resena: ResenaPublica) => React.ReactNode;
}) {
  const filtros = useFiltrosDeResenas();

  const consulta = useResenasDeCocinero(cocineroId, {
    orden: filtros.orden,
    estrellas: filtros.estrellas,
    soloConFoto: filtros.soloConFoto,
    soloConRespuesta: filtros.soloConRespuesta,
  });

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

  if (!consulta.data) {
    return (
      <View className="px-4 pt-4">
        <Esqueleto className="h-44 rounded-md" />
        <Esqueleto className="mt-3 h-28 rounded-md" />
        <Esqueleto className="mt-3 h-28 rounded-md" />
      </View>
    );
  }

  return (
    <CuerpoDelListado
      accionVacio={accionVacio}
      consulta={consulta}
      encabezado={encabezado}
      filtros={filtros}
      pieDeTarjeta={pieDeTarjeta}
    />
  );
}

/**
 * Estado de orden y filtros, agrupado para que no viaje suelto por tres
 * componentes. Vive acá y no en el cuerpo del listado porque la consulta
 * -que se hace un nivel más arriba- depende de él.
 */
interface ControlesDeFiltro {
  orden: OrdenResenas;
  estrellas: number[];
  soloConFoto: boolean;
  soloConRespuesta: boolean;
  cambiarOrden: (orden: OrdenResenas) => void;
  cambiarEstrellas: (estrellas: number[]) => void;
  cambiarSoloConFoto: (valor: boolean) => void;
  cambiarSoloConRespuesta: (valor: boolean) => void;
}

function useFiltrosDeResenas(): ControlesDeFiltro {
  const [orden, cambiarOrden] = useState<OrdenResenas>('MAS_RECIENTES');
  const [estrellas, cambiarEstrellas] = useState<number[]>([]);
  const [soloConFoto, cambiarSoloConFoto] = useState(false);
  const [soloConRespuesta, cambiarSoloConRespuesta] = useState(false);

  return {
    orden,
    estrellas,
    soloConFoto,
    soloConRespuesta,
    cambiarOrden,
    cambiarEstrellas,
    cambiarSoloConFoto,
    cambiarSoloConRespuesta,
  };
}

/**
 * El listado propiamente dicho, con el scroll infinito de US-RES-03: diez
 * reseñas por defecto y bloques adicionales de diez al llegar al final.
 *
 * El resumen sale de la PRIMERA página y no de la última: es el mismo objeto en
 * todas -lo calcula el servidor sobre el total, no sobre el bloque- y tomarlo
 * de `pages[0]` lo deja quieto mientras se cargan las siguientes.
 */
function CuerpoDelListado({
  consulta,
  filtros,
  accionVacio,
  encabezado,
  pieDeTarjeta,
}: {
  consulta: UseInfiniteQueryResult<InfiniteData<PaginaResenas>, Error>;
  filtros: ControlesDeFiltro;
  accionVacio?: React.ReactNode;
  encabezado?: React.ReactNode;
  pieDeTarjeta?: (resena: ResenaPublica) => React.ReactNode;
}) {
  const paginas = consulta.data?.pages ?? [];
  const datos = paginas.flatMap((pagina) => pagina.datos);
  const resumen = paginas[0]?.resumen;
  const hayFiltros =
    filtros.estrellas.length > 0 ||
    filtros.soloConFoto ||
    filtros.soloConRespuesta;

  /**
   * US-RES-03 pide navegar "entre las imágenes de otras reseñas del mismo
   * cocinero", así que la galería recibe TODAS las fotos cargadas y no solo la
   * de la tarjeta tocada. Se arma de las páginas ya traídas: es lo que el
   * usuario tiene delante, y pedir el resto solo para poder deslizar traería el
   * historial entero por un gesto que quizá no haga.
   */
  const fotos = datos
    .map((resena) => resena.fotoUrl)
    .filter((url): url is string => url !== null);

  const [fotoAbierta, setFotoAbierta] = useState<string | null>(null);

  if (!resumen) return null;

  return (
    <>
      {fotoAbierta === null ? null : (
        <GaleriaDeResenas
          fotos={fotos}
          indiceInicial={Math.max(fotos.indexOf(fotoAbierta), 0)}
          onCerrar={() => {
            setFotoAbierta(null);
          }}
        />
      )}

      <FlatList
        contentContainerClassName="px-4 pb-24 gap-3"
        data={datos}
        keyExtractor={(resena) => resena.id}
        ListEmptyComponent={
          <VacioDelListado
            accion={accionVacio}
            conFiltros={hayFiltros}
            total={resumen.total}
          />
        }
        ListFooterComponent={
          consulta.isFetchingNextPage ? (
            <Esqueleto className="h-28 rounded-md" />
          ) : null
        }
        ListHeaderComponent={
          <EncabezadoDelListado
            encabezado={encabezado}
            filtros={filtros}
            resumen={resumen}
          />
        }
        onEndReached={() => {
          if (consulta.hasNextPage && !consulta.isFetchingNextPage) {
            void consulta.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        renderItem={({ item }) => (
          <TarjetaDeResena
            onAbrirFoto={setFotoAbierta}
            pieDeLaTarjeta={pieDeTarjeta?.(item)}
            resena={item}
          />
        )}
      />
    </>
  );
}

/**
 * Lo que va arriba del listado: lo que traiga la vista, el título del bloque de
 * platos, el resumen y los filtros.
 */
function EncabezadoDelListado({
  encabezado,
  resumen,
  filtros,
}: {
  encabezado?: React.ReactNode;
  resumen: PaginaResenas['resumen'];
  filtros: ControlesDeFiltro;
}) {
  return (
    <View className="gap-3 pt-4">
      {encabezado}
      {/*
        US-RES-03 pide que el listado de platos sea "un bloque diferenciado" del
        de reputación. Sin el título los dos se leen como uno solo con dos
        números que se contradicen.
      */}
      <Text className="text-label font-bold text-text-primary">
        {TEXTOS_RESENA.tituloResenasDePlatos}
      </Text>
      <ResumenDeResenas resumen={resumen} />
      {resumen.total === 0 ? null : <Filtros filtros={filtros} />}
    </View>
  );
}

/**
 * Estado vacío, que tiene dos causas distintas y no se pueden confundir:
 * el cocinero no tiene ninguna reseña, o los filtros no dejaron pasar ninguna.
 * Ofrecer "sé el primero en opinar" cuando en realidad hay 87 reseñas filtradas
 * sería mentirle al usuario.
 */
function VacioDelListado({
  total,
  conFiltros,
  accion,
}: {
  total: number;
  conFiltros: boolean;
  accion?: React.ReactNode;
}) {
  if (conFiltros && total > 0) {
    return (
      <EstadoVacio
        icono={<IconoEstrella className="text-text-disabled" size={28} />}
        titulo={TEXTOS_RESENA.sinResultadosConFiltros}
      />
    );
  }

  return (
    <EstadoVacio
      accion={accion}
      icono={<IconoEstrella className="text-text-disabled" size={28} />}
      subtitulo={MENSAJES_RESENA.cocineroSinResenasSubtitulo}
      titulo={MENSAJES_RESENA.cocineroSinResenasTitulo}
    />
  );
}

/**
 * Orden y filtros del listado — los cuatro órdenes y los tres filtros que
 * enumera US-RES-03, completos desde que existen las reacciones (US-RES-04) y
 * las respuestas (US-RES-05).
 */
function Filtros({ filtros }: { filtros: ControlesDeFiltro }) {
  const { orden, estrellas, soloConFoto } = filtros;

  return (
    <View className="gap-2">
      <View className="flex-row flex-wrap gap-2">
        {ORDEN_RESENAS.map((valor) => (
          <Chip
            activo={orden === valor}
            key={valor}
            onPress={() => {
              filtros.cambiarOrden(valor);
            }}
            texto={ETIQUETA_DE_ORDEN[valor]}
          />
        ))}
      </View>

      <View className="flex-row flex-wrap gap-2">
        {[5, 4, 3, 2, 1].map((nivel) => (
          <Chip
            activo={estrellas.includes(nivel)}
            key={nivel}
            onPress={() => {
              filtros.cambiarEstrellas(
                estrellas.includes(nivel)
                  ? estrellas.filter((n) => n !== nivel)
                  : [...estrellas, nivel],
              );
            }}
            texto={`${String(nivel)} ★`}
          />
        ))}

        <Chip
          activo={soloConFoto}
          onPress={() => {
            filtros.cambiarSoloConFoto(!soloConFoto);
          }}
          texto={MENSAJES_RESENA.filtroSoloConFoto}
        />

        <Chip
          activo={filtros.soloConRespuesta}
          onPress={() => {
            filtros.cambiarSoloConRespuesta(!filtros.soloConRespuesta);
          }}
          texto={MENSAJES_RESENA.filtroSoloConRespuesta}
        />
      </View>
    </View>
  );
}

const ETIQUETA_DE_ORDEN: Record<OrdenResenas, string> = {
  MAS_RECIENTES: MENSAJES_RESENA.ordenMasRecientes,
  MEJOR_CALIFICACION: MENSAJES_RESENA.ordenMejorCalificacion,
  PEOR_CALIFICACION: MENSAJES_RESENA.ordenPeorCalificacion,
  MAS_UTILES: MENSAJES_RESENA.ordenMasUtiles,
};

function Chip({
  texto,
  activo,
  onPress,
}: {
  texto: string;
  activo: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: activo }}
      className={`rounded-full border px-3 py-1.5 ${
        activo ? 'border-primary bg-primary/10' : 'border-border bg-surface'
      }`}
      onPress={onPress}
    >
      <Text
        className={`text-caption ${
          activo
            ? 'font-semibold text-primary'
            : 'font-medium text-text-secondary'
        }`}
      >
        {texto}
      </Text>
    </Pressable>
  );
}
