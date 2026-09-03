import { Text, View } from 'react-native';
import { Esqueleto } from '../../components/ui/Esqueleto';
import { useReputacionDeCocinero } from '../../hooks/useResenas';
import { TEXTOS_RESENA } from '../../lib/textos';
import { BarraDeNivel, EstrellasDelPromedio } from './ResumenDeResenas';

/**
 * Bloque de reputación del perfil público — US-RES-03, primer criterio (RF082).
 *
 * "Muestre en la parte superior el bloque de reputación del cocinero,
 * construido con las calificaciones al cocinero (US-RES-07) en estado VISIBLE."
 *
 * NO ES EL MISMO NÚMERO QUE EL DE ABAJO, y esa es toda la razón por la que este
 * componente existe. Este promedia las CALIFICACIONES AL COCINERO, que valoran
 * el servicio del pedido; el `ResumenDeResenas` que va debajo promedia las
 * RESEÑAS DE LOS PLATOS, que valoran el producto. Un cocinero puede cocinar
 * excelente y atender pésimo, y con un solo número eso desaparecía.
 *
 * SIN MÍNIMO PARA MOSTRAR EL PROMEDIO (decisión del equipo, 2026-09-02): se ve
 * desde la primera calificación. Es distinto del `ResumenDeResenas`, que sí
 * aplica `resena_minimo_para_promedio` sobre las reseñas de platos.
 *
 * NO CORTA LA PANTALLA SI FALLA. Un error acá deja al visitante sin el bloque
 * de servicio pero con el listado de reseñas intacto; devolver un estado de
 * error a pantalla completa por una de las dos métricas sería desproporcionado.
 */
export function BloqueDeReputacion({ cocineroId }: { cocineroId: string }) {
  const consulta = useReputacionDeCocinero(cocineroId);

  if (consulta.isError) return null;

  if (!consulta.data) {
    return <Esqueleto className="h-36 rounded-md" />;
  }

  const { promedio, total, distribucion } = consulta.data;

  return (
    <View className="rounded-md border border-border bg-surface p-4">
      <Text className="text-label font-bold text-text-primary">
        {TEXTOS_RESENA.tituloReputacion}
      </Text>
      <Text className="mb-3 text-caption text-text-secondary">
        {TEXTOS_RESENA.subtituloReputacion}
      </Text>

      {promedio === null ? (
        <Text className="text-body text-text-secondary">
          {TEXTOS_RESENA.sinCalificacionesDeServicio}
        </Text>
      ) : (
        <>
          <View className="items-center">
            <Text className="text-h1 font-extrabold text-text-primary">
              {promedio.toFixed(1)}
            </Text>
            <EstrellasDelPromedio promedio={promedio} />
            <Text className="mt-1 text-caption text-text-secondary">
              {TEXTOS_RESENA.calificacionesRecibidas(total)}
            </Text>
          </View>

          <View className="mt-4 gap-1.5">
            {[5, 4, 3, 2, 1].map((nivel) => (
              <BarraDeNivel
                cantidad={distribucion[String(nivel)] ?? 0}
                key={nivel}
                nivel={nivel}
                total={total}
              />
            ))}
          </View>
        </>
      )}
    </View>
  );
}
