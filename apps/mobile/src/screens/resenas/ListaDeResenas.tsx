import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import {
  MENSAJES_RESENA,
  ORDEN_RESENAS,
  type OrdenResenas,
} from '@foodhub/shared';
import { IconoEstrella } from '../../components/iconos';
import { Esqueleto } from '../../components/ui/Esqueleto';
import { EstadoDeError } from '../../components/ui/EstadoDeError';
import { EstadoVacio } from '../../components/ui/EstadoVacio';
import { useResenasDeCocinero } from '../../hooks/useResenas';
import { mensajeDeError } from '../../lib/api';
import { TEXTOS_RESENA } from '../../lib/textos';
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
}: {
  cocineroId: string;
  accionVacio?: React.ReactNode;
  encabezado?: React.ReactNode;
}) {
  const [orden, setOrden] = useState<OrdenResenas>('MAS_RECIENTES');
  const [estrellas, setEstrellas] = useState<number[]>([]);
  const [soloConFoto, setSoloConFoto] = useState(false);

  const consulta = useResenasDeCocinero(cocineroId, {
    orden,
    estrellas,
    soloConFoto,
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

  const { datos, resumen } = consulta.data;
  const hayFiltros = estrellas.length > 0 || soloConFoto;

  return (
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
      ListHeaderComponent={
        <View className="gap-3 pt-4">
          {encabezado}
          <ResumenDeResenas resumen={resumen} />
          {resumen.total === 0 ? null : (
            <Filtros
              estrellas={estrellas}
              onCambiarEstrellas={setEstrellas}
              onCambiarOrden={setOrden}
              onCambiarSoloConFoto={setSoloConFoto}
              orden={orden}
              soloConFoto={soloConFoto}
            />
          )}
        </View>
      }
      renderItem={({ item }) => <TarjetaDeResena resena={item} />}
    />
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
 * Orden y filtros del listado.
 *
 * FALTAN DOS DE LOS QUE ENUMERA US-RES-03: "Más útiles" ordena por cantidad de
 * reacciones (US-RES-04) y el toggle "con respuesta del cocinero" depende de
 * las respuestas (US-RES-05). Las dos historias van en el segundo PR del
 * módulo, y una opción que siempre devuelve lo mismo es peor que no ofrecerla.
 */
function Filtros({
  orden,
  estrellas,
  soloConFoto,
  onCambiarOrden,
  onCambiarEstrellas,
  onCambiarSoloConFoto,
}: {
  orden: OrdenResenas;
  estrellas: number[];
  soloConFoto: boolean;
  onCambiarOrden: (orden: OrdenResenas) => void;
  onCambiarEstrellas: (estrellas: number[]) => void;
  onCambiarSoloConFoto: (valor: boolean) => void;
}) {
  return (
    <View className="gap-2">
      <View className="flex-row flex-wrap gap-2">
        {ORDEN_RESENAS.map((valor) => (
          <Chip
            activo={orden === valor}
            key={valor}
            onPress={() => {
              onCambiarOrden(valor);
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
              onCambiarEstrellas(
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
            onCambiarSoloConFoto(!soloConFoto);
          }}
          texto={MENSAJES_RESENA.filtroSoloConFoto}
        />
      </View>
    </View>
  );
}

const ETIQUETA_DE_ORDEN: Record<OrdenResenas, string> = {
  MAS_RECIENTES: MENSAJES_RESENA.ordenMasRecientes,
  MEJOR_CALIFICACION: MENSAJES_RESENA.ordenMejorCalificacion,
  PEOR_CALIFICACION: MENSAJES_RESENA.ordenPeorCalificacion,
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
