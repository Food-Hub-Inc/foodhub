import { Text, View } from 'react-native';
import { Circle, Svg } from 'react-native-svg';
import { useResolveClassNames } from 'uniwind';
import { ESTADOS_DISTRIBUCION, type EstadoDistribucion } from '@foodhub/shared';

/**
 * Gráfico de dona de US-DASH-04: "una representación visual (gráfico de torta o
 * barras) con la distribución de pedidos agrupados por estado".
 *
 * DIBUJADO A MANO CON `react-native-svg` Y NO CON UNA LIBRERÍA DE GRÁFICOS. Son
 * cuatro arcos: una librería sería una dependencia más en una app que se
 * distribuye por EAS Build, y todas traen su propia paleta que habría que
 * sobrescribir token por token para no violar la guía visual. El mismo criterio
 * por el que los íconos del sistema son SVG propios sobre `Lienzo`.
 *
 * EL TRUCO DEL RADIO. Con r = 15.915 la circunferencia mide 100 unidades
 * exactas, así que el `strokeDasharray` de cada arco se escribe con el
 * porcentaje tal cual, sin convertir nada. El 25 del desfase rota el comienzo de
 * las 3 a las 12 en punto.
 *
 * EL GRÁFICO ESTÁ OCULTO PARA EL LECTOR DE PANTALLA. Debajo va el listado con el
 * nombre de cada estado, su cantidad y su porcentaje, que dice exactamente lo
 * mismo en palabras; anunciar las dos cosas duplicaría la lectura.
 */

/** Circunferencia = 100: el porcentaje se usa como longitud sin convertirlo. */
const RADIO = 15.915;
const CENTRO = 21;
const GROSOR = 6;

interface Arco {
  estado: EstadoDistribucion;
  porcentaje: number;
  desfase: number;
}

/**
 * Los arcos con su desplazamiento acumulado. Función PURA y fuera del
 * componente: el acumulador es una variable que se reasigna, y hacerlo durante
 * el render es justamente lo que las reglas de React prohíben.
 */
function arcosDe(porcentajes: Record<EstadoDistribucion, number>): Arco[] {
  let acumulado = 0;

  return ESTADOS_DISTRIBUCION.flatMap((estado) => {
    const porcentaje = porcentajes[estado];
    if (porcentaje <= 0) return [];

    const arco: Arco = { estado, porcentaje, desfase: 25 - acumulado };
    acumulado += porcentaje;
    return [arco];
  });
}

export function GraficoDeDona({
  porcentajes,
  total,
  tamano = 156,
}: {
  porcentajes: Record<EstadoDistribucion, number>;
  /** Se muestra en el hueco: es el mismo total sobre el que se calcularon. */
  total: number;
  tamano?: number;
}) {
  // Cuatro llamadas fijas y en orden: los hooks no admiten un bucle sobre el
  // mapa de estados. Son valores y no clases porque `stroke` es una prop de
  // react-native-svg, fuera del alcance de `className`.
  const verde = useResolveClassNames('text-success');
  const rojo = useResolveClassNames('text-error');
  const ambar = useResolveClassNames('text-warning');
  const gris = useResolveClassNames('text-text-disabled');
  const carril = useResolveClassNames('text-border');

  const color: Record<EstadoDistribucion, unknown> = {
    completados: verde.color,
    rechazadosCocinero: rojo.color,
    canceladosCliente: ambar.color,
    expirados: gris.color,
  };

  return (
    <View
      className="items-center justify-center"
      style={{ width: tamano, height: tamano }}
    >
      <Svg
        width={tamano}
        height={tamano}
        viewBox="0 0 42 42"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {/* Carril de fondo: cierra la dona cuando los arcos no llegan a 100 por
            el redondeo, y le da forma al hueco. */}
        <Circle
          cx={CENTRO}
          cy={CENTRO}
          r={RADIO}
          fill="none"
          stroke={comoColor(carril.color)}
          strokeWidth={GROSOR}
        />

        {arcosDe(porcentajes).map((arco) => (
          <Circle
            key={arco.estado}
            cx={CENTRO}
            cy={CENTRO}
            r={RADIO}
            fill="none"
            stroke={comoColor(color[arco.estado])}
            strokeWidth={GROSOR}
            strokeDasharray={`${String(arco.porcentaje)} ${String(100 - arco.porcentaje)}`}
            strokeDashoffset={arco.desfase}
          />
        ))}
      </Svg>

      <View className="absolute items-center">
        <Text className="text-h1 font-extrabold text-text-primary">
          {String(total)}
        </Text>
      </View>
    </View>
  );
}

/** `useResolveClassNames` devuelve `unknown`; solo sirve si resolvió a color. */
function comoColor(valor: unknown): string | undefined {
  return typeof valor === 'string' ? valor : undefined;
}
