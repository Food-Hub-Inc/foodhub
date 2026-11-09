import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  IconoChevronDerecha,
  IconoChevronIzquierda,
} from '../../components/iconos';
import {
  correrMes,
  describirMes,
  esElMismoDia,
  inicioDelDia,
  semanasDelMes,
} from '../../lib/periodos';
import { TEXTOS_DASHBOARD } from '../../lib/textos';

/**
 * Calendario del modo "Personalizado" de US-DASH-05.
 *
 * LOS DÍAS FUTUROS ESTÁN DESHABILITADOS, no rechazados. El criterio dice que "la
 * fecha 'Hasta' no puede ser posterior a la fecha actual", y de las dos formas
 * de cumplirlo —impedir el toque o aceptarlo y mostrar un error— la guía de UX
 * elige la primera: prevenir el error es mejor que reportarlo. Además, la
 * documentación no fija ningún texto para ese error; inventarle uno sería
 * agregar un literal que ningún criterio respalda.
 *
 * Escrito a mano y no con `@react-native-community/datetimepicker`: ése es un
 * módulo nativo, y sumarlo obligaría a rehacer la build de EAS de todo el
 * equipo para una pantalla. Además abre el calendario del sistema operativo, que
 * no se puede pintar con los tokens de la guía visual.
 *
 * La semana arranca el lunes, igual que `rangoDePeriodo` en `@foodhub/shared`.
 */
export function CalendarioDeRango({
  desde,
  hasta,
  onElegirFecha,
}: {
  desde: Date | null;
  hasta: Date | null;
  onElegirFecha: (fecha: Date) => void;
}) {
  const hoy = useMemo(() => inicioDelDia(new Date()), []);
  const [mesVisible, setMesVisible] = useState(() =>
    correrMes(hasta ?? desde ?? hoy, 0),
  );

  const semanas = useMemo(() => semanasDelMes(mesVisible), [mesVisible]);
  // No hay nada que mirar más adelante: todos esos días están deshabilitados.
  const hayMesSiguiente = correrMes(mesVisible, 1).getTime() <= hoy.getTime();

  return (
    <View>
      <View className="mb-2 flex-row items-center justify-between">
        <Pressable
          onPress={() => {
            setMesVisible(correrMes(mesVisible, -1));
          }}
          className="h-11 w-11 items-center justify-center"
          accessibilityRole="button"
          accessibilityLabel={TEXTOS_DASHBOARD.mesAnterior}
        >
          <IconoChevronIzquierda size={20} className="text-text-primary" />
        </Pressable>

        <Text className="text-body font-bold text-text-primary">
          {describirMes(mesVisible)}
        </Text>

        <Pressable
          onPress={() => {
            setMesVisible(correrMes(mesVisible, 1));
          }}
          disabled={!hayMesSiguiente}
          className="h-11 w-11 items-center justify-center"
          accessibilityRole="button"
          accessibilityState={{ disabled: !hayMesSiguiente }}
          accessibilityLabel={TEXTOS_DASHBOARD.mesSiguiente}
        >
          <IconoChevronDerecha
            size={20}
            className={
              hayMesSiguiente ? 'text-text-primary' : 'text-text-disabled'
            }
          />
        </Pressable>
      </View>

      <View className="flex-row">
        {TEXTOS_DASHBOARD.diasDeLaSemana.map((dia, columna) => (
          <Text
            key={`${dia}-${String(columna)}`}
            className="flex-1 text-center text-caption font-semibold text-text-secondary"
          >
            {dia}
          </Text>
        ))}
      </View>

      {semanas.map((semana, fila) => (
        <View key={`semana-${String(fila)}`} className="flex-row">
          {semana.map((fecha, columna) => (
            <Celda
              key={fecha ? fecha.toISOString() : `hueco-${String(columna)}`}
              desde={desde}
              fecha={fecha}
              hasta={hasta}
              hoy={hoy}
              onElegir={onElegirFecha}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

/**
 * En qué estado está un día respecto del rango en construcción. Función PURA:
 * saca del componente la parte que decide, y le deja solo la que dibuja.
 */
function estadoDeCelda(
  fecha: Date,
  desde: Date | null,
  hasta: Date | null,
  hoy: Date,
): { futuro: boolean; extremo: boolean; intermedio: boolean } {
  const extremo =
    (desde !== null && esElMismoDia(fecha, desde)) ||
    (hasta !== null && esElMismoDia(fecha, hasta));

  return {
    futuro: fecha.getTime() > hoy.getTime(),
    extremo,
    intermedio:
      !extremo &&
      desde !== null &&
      hasta !== null &&
      fecha.getTime() > desde.getTime() &&
      fecha.getTime() < hasta.getTime(),
  };
}

/**
 * Las clases de un día, según su estado.
 *
 * Un día futuro va en el gris de lo inactivo, que es el mismo canal por el que
 * el resto de la app dice "esto no se puede tocar".
 */
function clasesDeCelda(estado: ReturnType<typeof estadoDeCelda>): {
  fondo: string;
  texto: string;
} {
  if (estado.extremo) return { fondo: 'bg-primary', texto: 'text-surface' };
  return {
    fondo: estado.intermedio ? 'bg-border' : 'bg-transparent',
    texto: estado.futuro ? 'text-text-disabled' : 'text-text-primary',
  };
}

/**
 * Un día de la grilla, o el hueco de las semanas que empiezan o terminan a mitad
 * de mes.
 */
function Celda({
  fecha,
  desde,
  hasta,
  hoy,
  onElegir,
}: {
  fecha: Date | null;
  desde: Date | null;
  hasta: Date | null;
  hoy: Date;
  onElegir: (fecha: Date) => void;
}) {
  if (fecha === null) return <View className="h-11 flex-1" />;

  const estado = estadoDeCelda(fecha, desde, hasta, hoy);
  const { fondo, texto } = clasesDeCelda(estado);

  return (
    <Pressable
      onPress={() => {
        onElegir(fecha);
      }}
      disabled={estado.futuro}
      className="h-11 flex-1 items-center justify-center"
      accessibilityRole="button"
      accessibilityState={{ disabled: estado.futuro, selected: estado.extremo }}
    >
      <View
        className={`h-9 w-9 items-center justify-center rounded-full ${fondo}`}
      >
        <Text className={`text-body font-semibold ${texto}`}>
          {String(fecha.getDate())}
        </Text>
      </View>
    </Pressable>
  );
}
