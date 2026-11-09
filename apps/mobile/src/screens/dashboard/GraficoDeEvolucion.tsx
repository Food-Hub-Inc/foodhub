import { useState } from 'react';
import { Text, View } from 'react-native';
import { G, Line, Rect, Svg, Text as SvgText } from 'react-native-svg';
import { useResolveClassNames } from 'uniwind';
import type { GranularidadEvolucion, PuntoDeSerie } from '@foodhub/shared';
import { rotuloAccesibleDeCubo, rotuloDeCubo } from '../../lib/periodos';
import { TEXTOS_DASHBOARD } from '../../lib/textos';

/**
 * Evolución de pedidos en el tiempo (corrección del 20/10/2026): una barra por
 * día, semana o mes del período.
 *
 * Mismo criterio que `GraficoDeBarrasSemanal`: dibujado a mano con
 * `react-native-svg`, sin librería de gráficos, el cero sin barra y el dibujo
 * oculto para el lector de pantalla con los valores resumidos en el contenedor.
 *
 * LA CANTIDAD DE BARRAS VARÍA: de 1 a 31 según el período. Con muchas barras,
 * los números encima y todos los rótulos del eje se pisan, así que:
 *
 *   hasta 14 barras   cada barra lleva su valor encima
 *   más               la barra seleccionada lleva su valor encima
 *   rótulos del eje   uno cada `paso`, para que nunca haya más de 8
 *   pie del gráfico   muestra la fecha exacta y los pedidos de la barra activa
 *                     (por defecto el pico) y permite tocar cualquier columna
 */

const ANCHO = 320;
const ALTO = 150;
const TOPE_GUIA_Y = 20;
const BASE_Y = 118;
const ALTO_MAX_BARRA = 84;
const MARGEN_X = 8;
const ANCHO_MAX_BARRA = 22;
const RADIO_BARRA = 3;
const MAX_VALORES_VISIBLES = 14;
const MAX_ROTULOS = 8;
const FUENTE_REGULAR = 'PlusJakartaSans_500Medium';
const FUENTE_NEGRITA = 'PlusJakartaSans_700Bold';

interface Colores {
  primario?: string;
  borde?: string;
  secundario?: string;
}

function comoColor(valor: unknown): string | undefined {
  return typeof valor === 'string' ? valor : undefined;
}

function indiceSeleccionado(
  serie: readonly PuntoDeSerie[],
  claveElegida: string | null,
  maximo: number,
): number {
  if (claveElegida !== null) {
    const elegido = serie.findIndex((punto) => punto.clave === claveElegida);
    if (elegido >= 0) return elegido;
  }
  return serie.findIndex((punto) => punto.cantidad === maximo);
}

export function GraficoDeEvolucion({
  serie,
  granularidad,
}: {
  serie: readonly PuntoDeSerie[];
  granularidad: GranularidadEvolucion;
}) {
  const [claveElegida, setClaveElegida] = useState<string | null>(null);

  const colores: Colores = {
    primario: comoColor(useResolveClassNames('text-primary').color),
    borde: comoColor(useResolveClassNames('text-border').color),
    secundario: comoColor(useResolveClassNames('text-text-secondary').color),
  };

  const maximo = Math.max(0, ...serie.map((punto) => punto.cantidad));
  const indiceActivo = indiceSeleccionado(serie, claveElegida, maximo);
  const puntoActivo = indiceActivo >= 0 ? serie[indiceActivo] : undefined;
  const resumen = serie
    .map(
      (punto) =>
        `${rotuloAccesibleDeCubo(punto.inicio, granularidad)}: ${TEXTOS_DASHBOARD.pedidosCantidad(punto.cantidad)}`,
    )
    .join('. ');

  return (
    <View className="w-full">
      <View
        accessible
        accessibilityLabel={`${TEXTOS_DASHBOARD.evolucionAccesible}. ${resumen}`}
        accessibilityRole="image"
        className="w-full items-center justify-center py-2"
      >
        <LienzoDeBarras
          colores={colores}
          granularidad={granularidad}
          indiceActivo={indiceActivo}
          maximo={maximo}
          onSeleccionar={setClaveElegida}
          serie={serie}
        />
      </View>

      {puntoActivo ? (
        <DetalleDeCubo
          conAyuda={serie.length > 1}
          granularidad={granularidad}
          punto={puntoActivo}
        />
      ) : null}
    </View>
  );
}

function LienzoDeBarras({
  serie,
  granularidad,
  maximo,
  indiceActivo,
  colores,
  onSeleccionar,
}: {
  serie: readonly PuntoDeSerie[];
  granularidad: GranularidadEvolucion;
  maximo: number;
  indiceActivo: number;
  colores: Colores;
  onSeleccionar: (clave: string) => void;
}) {
  const columna = (ANCHO - MARGEN_X * 2) / Math.max(serie.length, 1);
  const anchoBarra = Math.min(ANCHO_MAX_BARRA, columna * 0.65);
  const pasoDeRotulos = Math.ceil(serie.length / MAX_ROTULOS);
  const valoresEnTodas = serie.length <= MAX_VALORES_VISIBLES;

  return (
    <Svg
      accessibilityElementsHidden
      height={ALTO}
      importantForAccessibility="no-hide-descendants"
      viewBox={`0 0 ${String(ANCHO)} ${String(ALTO)}`}
      width="100%"
    >
      <Line
        stroke={colores.borde}
        strokeWidth={1}
        x1={MARGEN_X}
        x2={ANCHO - MARGEN_X}
        y1={BASE_Y}
        y2={BASE_Y}
      />

      {serie.map((punto, indice) => {
        const seleccionada = indice === indiceActivo;
        // Se cuenta desde el final para que el último cubo —hoy, la referencia
        // de cualquier período que termina ahora— siempre lleve rótulo.
        const llevaRotulo = (serie.length - 1 - indice) % pasoDeRotulos === 0;
        return (
          <Barra
            altura={maximo > 0 ? (punto.cantidad / maximo) * ALTO_MAX_BARRA : 0}
            anchoBarra={anchoBarra}
            anchoColumna={columna}
            centro={MARGEN_X + (indice + 0.5) * columna}
            colores={colores}
            conValor={seleccionada || (punto.cantidad > 0 && valoresEnTodas)}
            key={punto.clave}
            onPress={() => {
              onSeleccionar(punto.clave);
            }}
            rotulo={
              llevaRotulo ? rotuloDeCubo(punto.inicio, granularidad) : null
            }
            seleccionada={seleccionada}
            valor={punto.cantidad}
          />
        );
      })}
    </Svg>
  );
}

/** Un cubo: guía si está activo, valor, barra y rótulo del eje. */
function Barra(props: {
  centro: number;
  altura: number;
  anchoBarra: number;
  anchoColumna: number;
  valor: number;
  conValor: boolean;
  seleccionada: boolean;
  rotulo: string | null;
  colores: Colores;
  onPress: () => void;
}) {
  const { centro, altura, anchoBarra, anchoColumna, valor, onPress } = props;
  const tope = BASE_Y - altura;
  const colorDato = props.seleccionada
    ? props.colores.primario
    : props.colores.secundario;
  const fuente = props.seleccionada ? FUENTE_NEGRITA : FUENTE_REGULAR;

  return (
    <G>
      {props.seleccionada ? (
        <Line
          stroke={props.colores.borde}
          strokeDasharray="2,2"
          strokeWidth={1}
          x1={centro}
          x2={centro}
          y1={TOPE_GUIA_Y}
          y2={BASE_Y}
        />
      ) : null}

      {props.conValor ? (
        <SvgText
          fill={colorDato}
          fontFamily={fuente}
          fontSize={10}
          textAnchor="middle"
          x={centro}
          y={tope - 5}
        >
          {String(valor)}
        </SvgText>
      ) : null}

      {altura > 0 ? (
        <Rect
          fill={colorDato}
          height={altura}
          rx={RADIO_BARRA}
          ry={RADIO_BARRA}
          width={anchoBarra}
          x={centro - anchoBarra / 2}
          y={tope}
        />
      ) : null}

      {props.rotulo === null ? null : (
        <SvgText
          fill={colorDato}
          fontFamily={fuente}
          fontSize={10}
          textAnchor="middle"
          x={centro}
          y={BASE_Y + 16}
        >
          {props.rotulo}
        </SvgText>
      )}

      <Rect
        fill="#000000"
        fillOpacity={0}
        height={ALTO}
        onPress={onPress}
        width={anchoColumna}
        x={centro - anchoColumna / 2}
        y={0}
      />
    </G>
  );
}

/**
 * Pie del gráfico con la fecha exacta y la cantidad de pedidos de la barra
 * seleccionada (por defecto el pico del período).
 */
function DetalleDeCubo({
  punto,
  granularidad,
  conAyuda,
}: {
  punto: PuntoDeSerie;
  granularidad: GranularidadEvolucion;
  conAyuda: boolean;
}) {
  const fecha = rotuloAccesibleDeCubo(punto.inicio, granularidad);

  return (
    <View className="mt-2 items-center justify-center border-t border-border px-3 pt-3">
      <View className="rounded-full bg-primary/10 px-3 py-1">
        <Text className="text-caption font-semibold text-primary">
          {TEXTOS_DASHBOARD.detalleDeCuboEvolucion(fecha, punto.cantidad)}
        </Text>
      </View>
      {conAyuda ? (
        <Text className="mt-1.5 text-caption text-text-secondary">
          {TEXTOS_DASHBOARD.tocarBarraParaDetalle}
        </Text>
      ) : null}
    </View>
  );
}
