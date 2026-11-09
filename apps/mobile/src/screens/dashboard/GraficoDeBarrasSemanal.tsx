import { Text, View } from 'react-native';
import { G, Line, Rect, Svg, Text as SvgText } from 'react-native-svg';
import { useResolveClassNames } from 'uniwind';
import { MENSAJES_DASHBOARD, type DiaDeSemanaDetalle } from '@foodhub/shared';
import { TEXTOS_DASHBOARD } from '../../lib/textos';

/**
 * Gráfico de pedidos por día de la semana (métrica ampliada de PAN-DASH-01).
 *
 * Dibujado a mano con `react-native-svg`, sin librería de gráficos, igual que
 * `GraficoDeDona.tsx`: son siete barras y una dependencia más pesaría sobre
 * toda la app.
 *
 * EL CERO NO DIBUJA BARRA. Una barra mínima de 4 px para los días sin pedidos
 * se lee como si hubiera ventas; acá el día queda con su rótulo y nada más.
 *
 * EL GRÁFICO ESTÁ OCULTO PARA EL LECTOR DE PANTALLA, pero el contenedor resume
 * los siete valores en su `accessibilityLabel`. A diferencia de la dona, acá no
 * hay un listado de texto debajo que diga lo mismo: sin ese resumen, los
 * números no existirían para quien no ve el dibujo.
 *
 * LAS ETIQUETAS USAN PLUS JAKARTA SANS EXPLÍCITAMENTE. En React Native cada
 * peso es una familia distinta y `SvgText` no hereda la tipografía de la app;
 * sin `fontFamily` caería en la fuente del sistema.
 */

const ANCHO = 320;
const ALTO = 145;
const BASE_Y = 114;
const ALTO_MAX_BARRA = 74;
const ANCHO_BARRA = 22;
const RADIO_BARRA = 4;
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

export function GraficoDeBarrasSemanal({
  dias,
}: {
  dias: readonly DiaDeSemanaDetalle[];
}) {
  const primario = useResolveClassNames('text-primary');
  const borde = useResolveClassNames('text-border');
  const secundario = useResolveClassNames('text-text-secondary');

  const colores: Colores = {
    primario: comoColor(primario.color),
    borde: comoColor(borde.color),
    secundario: comoColor(secundario.color),
  };
  const maximo = Math.max(0, ...dias.map((dia) => dia.cantidad));
  const pico = dias.find((dia) => dia.esPico);
  const resumen = dias
    .map(
      (dia) =>
        `${dia.nombre}: ${TEXTOS_DASHBOARD.pedidosCantidad(dia.cantidad)}`,
    )
    .join('. ');

  return (
    <View className="w-full">
      <View
        accessible
        accessibilityLabel={`${TEXTOS_DASHBOARD.pedidosPorDiaSemanaAccesible}. ${resumen}`}
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
            stroke={colores.borde}
            strokeWidth={1}
            x1={10}
            x2={ANCHO - 10}
            y1={BASE_Y}
            y2={BASE_Y}
          />

          {dias.map((dia, indice) => (
            <Columna
              colores={colores}
              dia={dia}
              indice={indice}
              key={dia.diaNumero}
              maximo={maximo}
            />
          ))}
        </Svg>
      </View>

      {pico ? <BadgeDePico dia={pico} /> : null}
    </View>
  );
}

/** Una columna: valor, barra (si hay pedidos) y abreviatura del día. */
function Columna({
  dia,
  indice,
  maximo,
  colores,
}: {
  dia: DiaDeSemanaDetalle;
  indice: number;
  maximo: number;
  colores: Colores;
}) {
  const paso = ANCHO / 7;
  const centro = (indice + 0.5) * paso;
  const altura = maximo > 0 ? (dia.cantidad / maximo) * ALTO_MAX_BARRA : 0;
  const tope = BASE_Y - altura;
  const colorDato = dia.esPico ? colores.primario : colores.secundario;
  const fuente = dia.esPico ? FUENTE_NEGRITA : FUENTE_REGULAR;

  return (
    <G>
      {dia.cantidad > 0 ? (
        <SvgText
          fill={colorDato}
          fontFamily={fuente}
          fontSize={11}
          textAnchor="middle"
          x={centro}
          y={tope - 6}
        >
          {String(dia.cantidad)}
        </SvgText>
      ) : null}

      {altura > 0 ? (
        <Rect
          fill={dia.esPico ? colores.primario : colores.secundario}
          height={altura}
          rx={RADIO_BARRA}
          ry={RADIO_BARRA}
          width={ANCHO_BARRA}
          x={centro - ANCHO_BARRA / 2}
          y={tope}
        />
      ) : null}

      <SvgText
        fill={colorDato}
        fontFamily={fuente}
        fontSize={12}
        textAnchor="middle"
        x={centro}
        y={BASE_Y + 18}
      >
        {dia.corto}
      </SvgText>
    </G>
  );
}

/** El día pico, en singular: el contrato garantiza que hay uno solo. */
function BadgeDePico({ dia }: { dia: DiaDeSemanaDetalle }) {
  return (
    <View className="mt-2 flex-row items-center justify-center border-t border-border px-3 pt-3">
      <View className="rounded-full bg-primary/10 px-3 py-1">
        <Text className="text-caption font-semibold text-primary">
          {MENSAJES_DASHBOARD.diaPicoBadge(
            `${dia.nombre} (${TEXTOS_DASHBOARD.pedidosCantidad(dia.cantidad)})`,
          )}
        </Text>
      </View>
    </View>
  );
}
