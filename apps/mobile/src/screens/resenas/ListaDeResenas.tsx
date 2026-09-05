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
import { useResenasDe } from '../../hooks/useResenas';
import type { OrigenDeResenas } from '../../api/resenas';
import { mensajeDeError } from '../../lib/api';
import { TEXTOS_RESENA } from '../../lib/textos';
import { GaleriaDeResenas } from './GaleriaDeResenas';
import { ResumenDeResenas } from './ResumenDeResenas';
import { TarjetaDeResena } from './TarjetaDeResena';

/**
 * Listado de reseñas — US-RES-03, RF019 y US-RES-02.
 *
 * UN SOLO COMPONENTE PARA LAS CUATRO VISTAS: las reseñas de un plato
 * (PAN-EXP-05), las que le dejaron a un cocinero y las de sus platos (las dos
 * solapas de PAN-EXP-04 y PAN-RES-02) y las que recibió un cliente. Es el mismo
 * scroll infinito, la misma tarjeta, el mismo resumen y los mismos chips: lo
 * único que cambia es de qué son.
 *
 * QUÉ CONTROLES SE OFRECEN DEPENDE DEL ORIGEN, y no es una decisión estética:
 *
 *   solo con foto       únicamente donde hay fotos, y solo las reseñas de plato
 *                       las admiten (RF080)
 *   solo con respuesta  únicamente donde el cocinero puede responder, así que
 *                       no en las reseñas a un cliente
 *   galería             lo mismo que "solo con foto"
 *
 * Un filtro que siempre devuelve lo mismo es peor que no ofrecerlo: es el mismo
 * criterio con el que estos dos estuvieron omitidos hasta que existieron las
 * reacciones y las respuestas.
 */
export function ListaDeResenas({
  origen,
  titulo,
  textosVacio,
  accionVacio,
  encabezado,
  pieDeTarjeta,
}: {
  origen: OrigenDeResenas;
  /** Encabeza el bloque del listado. Cada pantalla nombra lo suyo. */
  titulo: string;
  /** Qué decir cuando no hay ninguna reseña todavía. */
  textosVacio: { titulo: string; subtitulo?: string };
  accionVacio?: React.ReactNode;
  encabezado?: React.ReactNode;
  /**
   * Lo que cada vista agrega al pie de CADA tarjeta. "Mis reseñas" pasa el
   * botón de responder de US-RES-05; el perfil público no pasa nada.
   */
  pieDeTarjeta?: (resena: ResenaPublica) => React.ReactNode;
}) {
  const conFotos =
    origen.tipo === 'PLATO' || origen.tipo === 'PLATOS_DEL_COCINERO';
  const conRespuestas = origen.tipo !== 'CLIENTE';

  const filtros = useFiltrosDeResenas();

  const consulta = useResenasDe(origen, {
    orden: filtros.orden,
    estrellas: filtros.estrellas,
    soloConFoto: conFotos && filtros.soloConFoto,
    soloConRespuesta: conRespuestas && filtros.soloConRespuesta,
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
      conFotos={conFotos}
      conRespuestas={conRespuestas}
      consulta={consulta}
      encabezado={encabezado}
      filtros={filtros}
      pieDeTarjeta={pieDeTarjeta}
      textosVacio={textosVacio}
      titulo={titulo}
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
 * El listado propiamente dicho, ya con datos.
 *
 * SE SEPARA DEL COMPONENTE DE ARRIBA para que los hooks de la galería no
 * convivan con los estados de carga: `useState` no puede ir después de un
 * return condicional, y el resumen que encabeza la lista sale de `pages[0]`,
 * que queda quieto mientras se cargan las siguientes.
 */
function CuerpoDelListado({
  consulta,
  filtros,
  conFotos,
  conRespuestas,
  titulo,
  textosVacio,
  accionVacio,
  encabezado,
  pieDeTarjeta,
}: {
  consulta: UseInfiniteQueryResult<InfiniteData<PaginaResenas>, Error>;
  filtros: ControlesDeFiltro;
  conFotos: boolean;
  conRespuestas: boolean;
  titulo: string;
  textosVacio: { titulo: string; subtitulo?: string };
  accionVacio?: React.ReactNode;
  encabezado?: React.ReactNode;
  pieDeTarjeta?: (resena: ResenaPublica) => React.ReactNode;
}) {
  const paginas = consulta.data?.pages ?? [];
  const datos = paginas.flatMap((pagina) => pagina.datos);
  const resumen = paginas[0]?.resumen;
  const hayFiltros =
    filtros.estrellas.length > 0 ||
    (conFotos && filtros.soloConFoto) ||
    (conRespuestas && filtros.soloConRespuesta);

  const galeria = useGaleria(datos);

  if (!resumen) return null;

  return (
    <>
      {galeria.visor}

      <FlatList
        contentContainerClassName="px-4 pb-24 gap-3"
        data={datos}
        keyExtractor={(resena) => resena.id}
        ListEmptyComponent={
          <VacioDelListado
            accion={accionVacio}
            conFiltros={hayFiltros}
            textos={textosVacio}
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
            conFotos={conFotos}
            conRespuestas={conRespuestas}
            encabezado={encabezado}
            filtros={filtros}
            resumen={resumen}
            titulo={titulo}
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
            onAbrirFoto={conFotos ? galeria.abrir : undefined}
            pieDeLaTarjeta={pieDeTarjeta?.(item)}
            resena={item}
          />
        )}
      />
    </>
  );
}

/**
 * La galería a pantalla completa y el estado de qué foto está abierta.
 *
 * US-RES-03 pide navegar "entre las imágenes de otras reseñas del mismo
 * cocinero", así que recibe TODAS las fotos cargadas y no solo la de la tarjeta
 * tocada. Se arma de las páginas ya traídas: es lo que el usuario tiene
 * delante, y pedir el resto solo para poder deslizar traería el historial
 * entero por un gesto que quizá no haga.
 */
function useGaleria(resenas: ResenaPublica[]) {
  const [abierta, setAbierta] = useState<string | null>(null);

  const fotos = resenas
    .map((resena) => resena.fotoUrl)
    .filter((url): url is string => url !== null);

  return {
    abrir: setAbierta,
    visor:
      abierta === null ? null : (
        <GaleriaDeResenas
          fotos={fotos}
          indiceInicial={Math.max(fotos.indexOf(abierta), 0)}
          onCerrar={() => {
            setAbierta(null);
          }}
        />
      ),
  };
}

/**
 * Lo que va arriba del listado: lo que traiga la vista, su título, el resumen
 * y los filtros.
 */
function EncabezadoDelListado({
  encabezado,
  resumen,
  filtros,
  titulo,
  conFotos,
  conRespuestas,
}: {
  encabezado?: React.ReactNode;
  resumen: PaginaResenas['resumen'];
  filtros: ControlesDeFiltro;
  titulo: string;
  conFotos: boolean;
  conRespuestas: boolean;
}) {
  return (
    <View className="gap-3 pt-4">
      {encabezado}
      {/*
        El título nombra de qué es el listado. Sin él, en el perfil del cocinero
        el bloque se leería pegado a la ficha de arriba, y en el detalle del
        plato no se distinguiría del resto de la pantalla.
      */}
      <Text className="text-label font-bold text-text-primary">{titulo}</Text>
      <ResumenDeResenas conFotos={conFotos} resumen={resumen} />
      {resumen.total === 0 ? null : (
        <Filtros
          conFotos={conFotos}
          conRespuestas={conRespuestas}
          filtros={filtros}
        />
      )}
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
  textos,
}: {
  total: number;
  conFiltros: boolean;
  accion?: React.ReactNode;
  textos: { titulo: string; subtitulo?: string };
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
      subtitulo={textos.subtitulo}
      titulo={textos.titulo}
    />
  );
}

/**
 * Orden y filtros del listado — los cuatro órdenes y los tres filtros que
 * enumera US-RES-03, completos desde que existen las reacciones (US-RES-04) y
 * las respuestas (US-RES-05).
 */
function Filtros({
  filtros,
  conFotos,
  conRespuestas,
}: {
  filtros: ControlesDeFiltro;
  conFotos: boolean;
  conRespuestas: boolean;
}) {
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

        {conFotos ? (
          <Chip
            activo={soloConFoto}
            onPress={() => {
              filtros.cambiarSoloConFoto(!soloConFoto);
            }}
            texto={MENSAJES_RESENA.filtroSoloConFoto}
          />
        ) : null}

        {conRespuestas ? (
          <Chip
            activo={filtros.soloConRespuesta}
            onPress={() => {
              filtros.cambiarSoloConRespuesta(!filtros.soloConRespuesta);
            }}
            texto={MENSAJES_RESENA.filtroSoloConRespuesta}
          />
        ) : null}
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
