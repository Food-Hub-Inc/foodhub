import { Text, View } from 'react-native';
import { MENSAJES_RESENA, type ResumenResenas } from '@foodhub/shared';
import { IconoEstrella, IconoEstrellaRellena } from '../../components/iconos';
import { TEXTOS_RESENA } from '../../lib/textos';

/**
 * Cabecera de la sección de reseñas — US-RES-03 (RF082), maquetación PAN-RES-02.
 *
 * "Promedio de estrellas con un decimal, cantidad total de reseñas entre
 * paréntesis, distribución porcentual de cada nivel de calificación (5, 4, 3, 2
 * y 1 estrella) representada con barras horizontales, y la cantidad de reseñas
 * que contienen foto adjunta."
 *
 * EL RESUMEN NO SE RECALCULA CON LOS FILTROS DEL LISTADO, y viene así del
 * servidor a propósito: describe la reputación completa del cocinero. Si se
 * recalculara, marcar "4 estrellas" mostraría un promedio de 4,0 y la barra al
 * 100% en ese nivel, que no es información sino un espejo del filtro.
 *
 * EL PROMEDIO PUEDE SER `null` CON RESEÑAS CARGADAS. Pasa cuando todavía no se
 * alcanzó `resena_minimo_para_promedio`: con dos opiniones un promedio no
 * describe a nadie. `alcanzaMinimoParaPromedio` distingue ese caso del de un
 * cocinero que directamente no tiene reseñas.
 */
export function ResumenDeResenas({ resumen }: { resumen: ResumenResenas }) {
  return (
    <View className="rounded-md border border-border bg-surface p-4">
      <Cifra resumen={resumen} />

      {resumen.total === 0 ? null : (
        <>
          <View className="mt-4 gap-1.5">
            {[5, 4, 3, 2, 1].map((nivel) => (
              <BarraDeNivel
                cantidad={resumen.distribucion[String(nivel)] ?? 0}
                key={nivel}
                nivel={nivel}
                total={resumen.total}
              />
            ))}
          </View>

          {resumen.conFoto > 0 ? (
            <Text className="mt-3 text-caption text-text-secondary">
              {TEXTOS_RESENA.conFoto(resumen.conFoto)}
            </Text>
          ) : null}
        </>
      )}
    </View>
  );
}

/** El número grande con sus estrellas y el total entre paréntesis. */
function Cifra({ resumen }: { resumen: ResumenResenas }) {
  if (resumen.promedio === null) {
    return (
      <View className="items-center">
        <Text className="text-body text-text-secondary">
          {resumen.total === 0
            ? MENSAJES_RESENA.cocineroSinResenasTitulo
            : TEXTOS_RESENA.promedioInsuficiente}
        </Text>
        {resumen.total > 0 ? (
          <Text className="mt-1 text-caption text-text-secondary">
            {TEXTOS_RESENA.resenasRecibidas(resumen.total)}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View className="items-center">
      <Text className="text-h1 font-extrabold text-text-primary">
        {resumen.promedio.toFixed(1)}
      </Text>
      <EstrellasDelPromedio promedio={resumen.promedio} />
      <Text className="mt-1 text-caption text-text-secondary">
        {TEXTOS_RESENA.resenasRecibidas(resumen.total)}
      </Text>
    </View>
  );
}

/**
 * Cinco estrellas rellenas hasta el promedio redondeado.
 *
 * Redondea al entero más cercano en lugar de dibujar medias estrellas: la guía
 * visual no define un ícono de media estrella y aproximarlo con recortes daría
 * un resultado distinto en cada tamaño.
 */
function EstrellasDelPromedio({ promedio }: { promedio: number }) {
  const llenas = Math.round(promedio);

  return (
    <View className="mt-1 flex-row">
      {[1, 2, 3, 4, 5].map((n) => {
        const Estrella = n <= llenas ? IconoEstrellaRellena : IconoEstrella;
        return (
          <Estrella
            className={n <= llenas ? 'text-warning' : 'text-text-disabled'}
            key={n}
            size={16}
          />
        );
      })}
    </View>
  );
}

/** Una fila de la distribución: "5 ★ ▓▓▓▓▓░░ 78%". */
function BarraDeNivel({
  nivel,
  cantidad,
  total,
}: {
  nivel: number;
  cantidad: number;
  total: number;
}) {
  const porcentaje = total === 0 ? 0 : Math.round((cantidad / total) * 100);

  return (
    <View
      accessibilityLabel={TEXTOS_RESENA.nivelAccesible(nivel, porcentaje)}
      accessibilityRole="text"
      className="flex-row items-center gap-2"
    >
      <Text className="w-3 text-caption text-text-secondary">
        {String(nivel)}
      </Text>
      <IconoEstrella className="text-text-disabled" size={12} />

      <View className="h-1.5 flex-1 overflow-hidden rounded-full bg-background">
        <View
          className="h-full rounded-full bg-warning"
          style={{ width: `${porcentaje}%` }}
        />
      </View>

      <Text className="w-9 text-right text-caption text-text-secondary">
        {`${String(porcentaje)}%`}
      </Text>
    </View>
  );
}
