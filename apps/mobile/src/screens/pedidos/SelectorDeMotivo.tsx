import { Pressable, Text, View } from 'react-native';
import type { MotivoCancelacionRapido } from '@foodhub/shared';
import { AreaTexto } from '../../components/ui/AreaTexto';
import { Esqueleto } from '../../components/ui/Esqueleto';
import { FondoTenue } from '../../components/ui/FondoTenue';
import { useMotivosDeCancelacion } from '../../hooks/useCategorias';
import { TEXTOS_PEDIDOS } from '../../lib/textos';

/**
 * Motivos rápidos + texto libre, la pieza que comparten el rechazo del cocinero
 * (US-PED-04, PAN-PED-04.5) y la cancelación del cliente (US-PED-09,
 * PAN-PED-03.0.1).
 *
 * Las dos historias piden exactamente lo mismo -"el listado de motivos rápidos
 * habilitados con aplicabilidad ... y un campo de texto"- y la única diferencia
 * es si el resultado es obligatorio. Esa decisión NO vive acá: este componente
 * recoge lo que el usuario elige y quien lo usa decide si alcanza. Así el mismo
 * selector sirve para el rechazo (obligatorio) y para la cancelación (opcional).
 *
 * LA LISTA VIENE FILTRADA DEL SERVIDOR por el rol de la sesión (US-CFG-02): el
 * cliente nunca ve "No tengo ingredientes" ni el cocinero "Ya no lo necesito".
 * La app no elige qué mostrar.
 *
 * EL MOTIVO RÁPIDO ES UNO SOLO. `pedido.motivo_cancelacion_id` es una sola
 * columna, así que tocar otro chip reemplaza al anterior; volver a tocar el
 * elegido lo deselecciona, que es lo que permite cancelar sin motivo del
 * catálogo después de haber tocado uno por error.
 */
export function SelectorDeMotivo({
  motivoId,
  onCambiarMotivo,
  texto,
  onCambiarTexto,
  etiquetaTexto,
  placeholder,
  ayuda,
  maximo = 300,
}: {
  motivoId: string | null;
  onCambiarMotivo: (motivoId: string | null) => void;
  texto: string;
  onCambiarTexto: (texto: string) => void;
  etiquetaTexto: string;
  placeholder: string;
  /** Texto de apoyo bajo el campo, por ejemplo "Mínimo 5 palabras". */
  ayuda?: string;
  maximo?: number;
}) {
  const consulta = useMotivosDeCancelacion();

  return (
    <View className="gap-4">
      <View className="gap-2">
        <Text className="text-label font-semibold text-text-primary">
          {TEXTOS_PEDIDOS.motivosRapidos}
        </Text>

        {consulta.isPending ? (
          <Esqueleto className="h-10 rounded-full" />
        ) : (
          <View className="flex-row flex-wrap gap-2">
            {(consulta.data ?? []).map((motivo) => (
              <ChipDeMotivo
                key={motivo.id}
                motivo={motivo}
                seleccionado={motivo.id === motivoId}
                onPress={() => {
                  onCambiarMotivo(motivo.id === motivoId ? null : motivo.id);
                }}
              />
            ))}
          </View>
        )}
      </View>

      <View>
        <AreaTexto
          etiqueta={etiquetaTexto}
          maximo={maximo}
          nombre="motivo-libre"
          onChange={onCambiarTexto}
          placeholder={placeholder}
          valor={texto}
        />
        {ayuda !== undefined ? (
          <Text className="mt-1 text-caption text-text-secondary">{ayuda}</Text>
        ) : null}
      </View>
    </View>
  );
}

/**
 * Un motivo rápido.
 *
 * `accessibilityRole="radio"` y no `button`: los motivos son excluyentes entre
 * sí, y un lector de pantalla tiene que anunciar que elegir uno descarta el
 * anterior.
 */
function ChipDeMotivo({
  motivo,
  seleccionado,
  onPress,
}: {
  motivo: MotivoCancelacionRapido;
  seleccionado: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: seleccionado }}
      className={`min-h-11 justify-center overflow-hidden rounded-full border px-3 ${
        seleccionado ? 'border-primary' : 'border-border'
      }`}
      onPress={onPress}
    >
      {seleccionado ? <FondoTenue className="bg-primary" /> : null}
      <Text
        className={`text-body ${
          seleccionado ? 'font-semibold text-primary' : 'text-text-secondary'
        }`}
      >
        {motivo.nombre}
      </Text>
    </Pressable>
  );
}
