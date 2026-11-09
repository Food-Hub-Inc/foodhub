import { useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  MENSAJES_PEDIDO,
  motivoDeRechazoSuficiente,
  type PedidoDetalle,
} from '@foodhub/shared';
import { SafeAreaView } from '../../components/SafeAreaView';
import { Aviso } from '../../components/ui/Aviso';
import { Boton } from '../../components/ui/Boton';
import { EncabezadoPantalla } from '../../components/ui/EncabezadoPantalla';
import { Esqueleto } from '../../components/ui/Esqueleto';
import { EstadoDeError } from '../../components/ui/EstadoDeError';
import { PantallaConTeclado } from '../../components/ui/PantallaConTeclado';
import { usePedido, useRechazarPedido } from '../../hooks/usePedidos';
import { mensajeDeError } from '../../lib/api';
import { TEXTOS_PEDIDOS } from '../../lib/textos';
import { FichaDeParticipante } from './Piezas';
import { SelectorDeMotivo } from './SelectorDeMotivo';

/**
 * Rechazo de un pedido — PAN-PED-04.5 · US-PED-04.
 *
 * "Muestre el listado de motivos rápidos habilitados con aplicabilidad
 * 'Cancelación por cocinero' o 'Ambos' (US-CFG-02 / RF056), un campo de texto
 * libre opcional con el placeholder 'Contale al cliente el motivo del
 * rechazo...' y un botón 'Confirmar rechazo'. El botón permanece deshabilitado
 * hasta que el cocinero seleccione al menos un motivo rápido o ingrese al menos
 * 5 palabras en el campo de texto libre."
 *
 * ACÁ SÍ SE DESHABILITA EL BOTÓN, al revés que "Aceptar" en PAN-PED-04.4: el
 * criterio lo pide con esas palabras. La diferencia entre los dos casos no es
 * una inconsistencia de la interfaz sino de los criterios, y se respeta cada uno
 * como está escrito.
 *
 * LA MAQUETACIÓN NO DIBUJA LOS MOTIVOS RÁPIDOS -PAN-PED-04.5 muestra solo el
 * campo de texto con "Mínimo 5 palabras"-, pero el criterio de aceptación los
 * exige. Cuando los dos difieren gana el documento (decisión del equipo,
 * 14/08/2026), así que la pantalla los incluye.
 *
 * ES PANTALLA COMPLETA y no un diálogo, como la dibuja la maquetación: el
 * rechazo es irreversible y merece una pantalla propia, a diferencia de la
 * cancelación del cliente, que sí va en una hoja (PAN-PED-03.0.1).
 */
export function RechazarPedido() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const consulta = usePedido(id);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <EncabezadoPantalla
        destinoAlternativo="/(cocinero)/pedidos"
        titulo={MENSAJES_PEDIDO.rechazarPedidoTitulo}
      />

      {consulta.isError ? (
        <EstadoDeError
          mensaje={mensajeDeError(consulta.error)}
          onReintentar={() => {
            void consulta.refetch();
          }}
        />
      ) : consulta.isPending ? (
        <View className="px-4 pt-3">
          <Esqueleto className="mb-3 h-16 rounded-md" />
          <Esqueleto className="h-40 rounded-md" />
        </View>
      ) : (
        <Formulario pedido={consulta.data} />
      )}
    </SafeAreaView>
  );
}

function Formulario({ pedido }: { pedido: PedidoDetalle }) {
  const [motivoId, setMotivoId] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const rechazar = useRechazarPedido();

  /*
   * La MISMA función que usa la API para decidir si el motivo alcanza
   * (`motivoDeRechazoSuficiente`, en @foodhub/shared). Contar las palabras acá
   * por separado abriría la puerta a que el botón se habilite con un texto que
   * el servidor después rechaza.
   */
  const puedeConfirmar = motivoDeRechazoSuficiente({
    ...(motivoId ? { motivoCancelacionId: motivoId } : {}),
    motivoTexto: texto,
  });

  return (
    <>
      <PantallaConTeclado contentContainerClassName="px-4 py-4 gap-4">
        <Text className="text-caption text-text-secondary">
          {pedido.numeroPedido}
        </Text>

        <FichaDeParticipante
          participante={pedido.participante}
          rotulo={`${String(pedido.primerItem.cantidad)}× ${pedido.primerItem.nombre}`}
        />

        <SelectorDeMotivo
          ayuda={MENSAJES_PEDIDO.motivoRechazoMinimo}
          etiquetaTexto={TEXTOS_PEDIDOS.motivoDelRechazo}
          motivoId={motivoId}
          onCambiarMotivo={setMotivoId}
          onCambiarTexto={setTexto}
          placeholder={MENSAJES_PEDIDO.motivoRechazoPlaceholder}
          texto={texto}
        />

        {/* Advertencia de PAN-PED-04.5: el rechazo no se puede deshacer y el
            cliente va a leer lo que se escriba acá. */}
        <Aviso mensaje={MENSAJES_PEDIDO.rechazoIrreversible} tono="error" />

        {rechazar.isError ? (
          <Aviso mensaje={mensajeDeError(rechazar.error)} tono="error" />
        ) : null}
      </PantallaConTeclado>

      <View className="border-t border-border bg-surface px-4 pb-2 pt-3">
        <Boton
          cargando={rechazar.isPending}
          deshabilitado={!puedeConfirmar}
          onPress={() => {
            rechazar.mutate(
              {
                pedidoId: pedido.id,
                ...(motivoId ? { motivoCancelacionId: motivoId } : {}),
                ...(texto.trim() ? { motivoTexto: texto.trim() } : {}),
              },
              {
                onSuccess: () => {
                  router.replace('/(cocinero)/pedidos');
                },
              },
            );
          }}
          variante="destructivo"
        >
          {MENSAJES_PEDIDO.confirmarRechazo}
        </Boton>
      </View>
    </>
  );
}
