import { View } from 'react-native';
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
 *   más               solo la barra más alta, para dar la escala
 *   rótulos del eje   uno cada `paso`, para que nunca haya más de 8
 */

const ANCHO = 320;
const ALTO = 150;
const BASE_Y = 118;
const ALTO_MAX_BARRA = 84;
const MARGEN_X = 8;
const ANCHO_MAX_BARRA = 22;
const RADIO_BARRA = 3;
const MAX_VALORES_VISIBLES = 14;
const MAX_ROTULOS = 8;
const FUENTE_REGULAR = 'PlusJakartaSans_500Medium';
const FUENTE_NEGRITA = 'PlusJakartaSans_700Bold';

function comoColor(valor: unknown): string | undefined {
  return typeof valor === 'string' ? valor : undefined;
}

export function GraficoDeEvolucion({
  serie,
  granularidad,
}: {
  serie: readonly PuntoDeSerie[];
  granularidad: GranularidadEvolucion;
}) {
  const primario = comoColor(useResolveClassNames('text-primary').color);
  const borde = comoColor(useResolveClassNames('text-border').color);
  const secundario = comoColor(
    useResolveClassNames('text-text-secondary').color,
  );

  const maximo = Math.max(0, ...serie.map((punto) => punto.cantidad));
  const indiceMaximo = serie.findIndex((punto) => punto.cantidad === maximo);
  const columna = (ANCHO - MARGEN_X * 2) / Math.max(serie.length, 1);
  const anchoBarra = Math.min(ANCHO_MAX_BARRA, columna * 0.65);
  const pasoDeRotulos = Math.ceil(serie.length / MAX_ROTULOS);
  const valoresEnTodas = serie.length <= MAX_VALORES_VISIBLES;

  const resumen = serie
    .map(
      (punto) =>
        `${rotuloAccesibleDeCubo(punto.inicio, granularidad)}: ${TEXTOS_DASHBOARD.pedidosCantidad(punto.cantidad)}`,
    )
    .join('. ');

  return (
    <View
      accessible
      accessibilityLabel={`${TEXTOS_DASHBOARD.evolucionAccesible}. ${resumen}`}
      accessibilityRole="image"
      className="w-full items-center justify-center py-2"
    >
      <Svg
        accessibilityElementsHidden
        height={ALTO}
        importantForAccessibility="no-hide-descendants"
        viewBox={`0 0 ${String(ANCHO)} ${String(ALTO)}`}
        width="100%"
      >
        <Line
          stroke={borde}
          strokeWidth={1}
          x1={MARGEN_X}
          x2={ANCHO - MARGEN_X}
          y1={BASE_Y}
          y2={BASE_Y}
        />

        {serie.map((punto, indice) => (
          <Barra
            altura={maximo > 0 ? (punto.cantidad / maximo) * ALTO_MAX_BARRA : 0}
            anchoBarra={anchoBarra}
            centro={MARGEN_X + (indice + 0.5) * columna}
            colores={{ primario, secundario }}
            conValor={
              punto.cantidad > 0 && (valoresEnTodas || indice === indiceMaximo)
            }
            // Se cuenta desde el final para que el último cubo —hoy, la
            // referencia de cualquier período que termina ahora— siempre
            // lleve rótulo sin quedar pegado al anterior.
            rotulo={
              (serie.length - 1 - indice) % pasoDeRotulos === 0
                ? rotuloDeCubo(punto.inicio, granularidad)
                : null
            }
            key={punto.clave}
            valor={punto.cantidad}
          />
        ))}
      </Svg>
    </View>
  );
}

/** Un cubo: valor (si corresponde), barra (si hubo pedidos) y rótulo del eje. */
function Barra({
  centro,
  altura,
  anchoBarra,
  valor,
  conValor,
  rotulo,
  colores,
}: {
  centro: number;
  altura: number;
  anchoBarra: number;
  valor: number;
  conValor: boolean;
  rotulo: string | null;
  colores: { primario?: string; secundario?: string };
}) {
  const tope = BASE_Y - altura;

  return (
    <G>
      {conValor ? (
        <SvgText
          fill={colores.secundario}
          fontFamily={FUENTE_NEGRITA}
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
          fill={colores.primario}
          height={altura}
          rx={RADIO_BARRA}
          ry={RADIO_BARRA}
          width={anchoBarra}
          x={centro - anchoBarra / 2}
          y={tope}
        />
      ) : null}

      {rotulo === null ? null : (
        <SvgText
          fill={colores.secundario}
          fontFamily={FUENTE_REGULAR}
          fontSize={10}
          textAnchor="middle"
          x={centro}
          y={BASE_Y + 16}
        >
          {rotulo}
        </SvgText>
      )}
    </G>
  );
}
