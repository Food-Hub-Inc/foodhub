import { Text, View } from 'react-native';
import { MENSAJES_DASHBOARD, type FranjaHorariaDetalle } from '@foodhub/shared';
import { TEXTOS_DASHBOARD } from '../../lib/textos';

/**
 * Distribución de pedidos por franja horaria (métrica ampliada de PAN-DASH-01).
 *
 * SEIS FRANJAS DE CUATRO HORAS. Antes la última iba de 23 a 11 -doce horas- y
 * además se comía la mañana: con demanda uniforme se llevaba la mitad de los
 * pedidos y el "turno pico" terminaba midiendo el ancho del cubo. Ahora todas
 * son comparables entre sí.
 *
 * El porcentaje sale del reparto por resto mayor del paquete compartido, así
 * las seis filas suman 100 y no 99 o 101.
 *
 * Cada fila es texto -nombre, horario, cantidad y porcentaje-, de modo que el
 * lector de pantalla no depende de la barra para entender el dato.
 */
export function FranjasHorarias({
  franjas,
}: {
  franjas: readonly FranjaHorariaDetalle[];
}) {
  const pico = franjas.find((franja) => franja.esPico);

  return (
    <View className="overflow-hidden rounded-md border border-border bg-surface p-4">
      {pico ? <BadgeDePico franja={pico} /> : null}

      <View className="gap-3.5">
        {franjas.map((franja) => (
          <FilaDeFranja franja={franja} key={franja.franja} />
        ))}
      </View>
    </View>
  );
}

/** Una franja: rótulos, cantidad, porcentaje y barra proporcional. */
function FilaDeFranja({ franja }: { franja: FranjaHorariaDetalle }) {
  return (
    <View>
      <View className="mb-1 flex-row items-center justify-between">
        <View className="flex-row items-baseline gap-1.5">
          <Text
            className={`text-body font-semibold ${
              franja.esPico ? 'text-primary' : 'text-text-primary'
            }`}
          >
            {franja.etiqueta}
          </Text>
          <Text className="text-caption text-text-secondary">
            {`(${franja.horario})`}
          </Text>
        </View>

        <View className="flex-row items-center gap-1.5">
          <Text className="text-body font-bold text-text-primary">
            {String(franja.cantidad)}
          </Text>
          <Text className="text-caption text-text-secondary">
            {TEXTOS_DASHBOARD.porcentaje(franja.porcentaje)}
          </Text>
        </View>
      </View>

      <View className="h-2 w-full overflow-hidden rounded-full bg-border">
        <View
          className={`h-full rounded-full ${
            franja.esPico ? 'bg-primary' : 'bg-text-secondary/50'
          }`}
          style={{ width: `${franja.porcentaje}%` as const }}
        />
      </View>
    </View>
  );
}

/** La franja pico, en singular: el contrato garantiza que hay una sola. */
function BadgeDePico({ franja }: { franja: FranjaHorariaDetalle }) {
  return (
    <View className="mb-4 rounded-md bg-primary/10 p-2.5">
      <Text className="text-caption font-bold text-primary">
        {MENSAJES_DASHBOARD.franjaPicoBadge(franja.etiqueta)}
      </Text>
      <Text className="text-caption text-text-secondary">
        {`${franja.horario} · ${TEXTOS_DASHBOARD.pedidosCantidad(franja.cantidad)} (${TEXTOS_DASHBOARD.porcentaje(franja.porcentaje)})`}
      </Text>
    </View>
  );
}
