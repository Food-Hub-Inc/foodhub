import { Text, View } from 'react-native';
import { MENSAJES_AYUDA } from '@foodhub/shared';

/**
 * Bloque de solo lectura con el correo del usuario autenticado
 * (US-AYU-03, primer criterio: "El correo electronico de contacto del
 * soporte se completa automaticamente como solo lectura").
 *
 * El correo identifica la cuenta y se usa como destino del acuse de
 * recibo que envia la API al confirmar el envio. Mostrarlo en la
 * pantalla evita que el usuario dude de adonde llegara la respuesta.
 */
export function BloqueDeCorreo({ correo }: { correo: string }) {
  return (
    <View className="rounded-md border border-border bg-surface px-4 py-3">
      <Text className="text-label font-semibold uppercase text-text-secondary">
        {MENSAJES_AYUDA.consulta.correoTitulo}
      </Text>
      <Text
        accessibilityLabel={`${MENSAJES_AYUDA.consulta.correoTitulo}: ${correo}`}
        className="mt-1 text-body text-text-primary"
      >
        {correo}
      </Text>
    </View>
  );
}
