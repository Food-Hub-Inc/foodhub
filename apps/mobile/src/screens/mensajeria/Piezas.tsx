import { Text, View } from 'react-native';
import { MENSAJES_MENSAJERIA } from '@foodhub/shared';
import {
  IconoAlerta,
  IconoReloj,
  IconoTilde,
  IconoTildeCirculo,
} from '../../components/iconos';
import type { EstadoVisible } from './formato';

/**
 * Indicador de estado de una burbuja del chat (US-MSG-02 y US-MSG-03).
 *
 * "un indicador de estado: Enviando / Enviado / Entregado / Leído", y al fallar
 * "un ícono de 'Error' sobre la burbuja del mensaje junto al texto 'No se pudo
 * enviar'".
 */

const ROTULO: Record<EstadoVisible, string> = {
  ENVIANDO: MENSAJES_MENSAJERIA.estadoEnviando,
  ENVIADO: MENSAJES_MENSAJERIA.estadoEnviado,
  ENTREGADO: MENSAJES_MENSAJERIA.estadoEntregado,
  LEIDO: MENSAJES_MENSAJERIA.estadoLeido,
  ERROR: MENSAJES_MENSAJERIA.noSePudoEnviar,
};

const COLOR: Record<EstadoVisible, string> = {
  ENVIANDO: 'text-text-secondary',
  ENVIADO: 'text-text-secondary',
  ENTREGADO: 'text-text-secondary',
  LEIDO: 'text-primary',
  ERROR: 'text-error',
};

/** Alineado con el tamaño del texto `caption` que lo acompaña. */
const TAMANO_ICONO = 12;

function IconoDeEstado({
  estado,
  className,
}: {
  estado: EstadoVisible;
  className: string;
}) {
  switch (estado) {
    case 'ERROR':
      return <IconoAlerta className={className} size={TAMANO_ICONO} />;
    case 'ENVIANDO':
      return <IconoReloj className={className} size={TAMANO_ICONO} />;
    case 'ENVIADO':
      return <IconoTilde className={className} size={TAMANO_ICONO} />;
    default:
      return <IconoTildeCirculo className={className} size={TAMANO_ICONO} />;
  }
}

/**
 * EL COLOR NO ES EL ÚNICO CANAL: cada estado lleva ícono Y texto. Un check gris
 * y otro naranja son indistinguibles para buena parte de los usuarios, y la guía
 * de accesibilidad del proyecto lo prohíbe explícitamente.
 */
export function EstadoDelMensaje({ estado }: { estado: EstadoVisible }) {
  const color = COLOR[estado];

  return (
    <View className="flex-row items-center gap-1">
      <IconoDeEstado className={color} estado={estado} />
      <Text className={`text-caption ${color}`}>{ROTULO[estado]}</Text>
    </View>
  );
}
