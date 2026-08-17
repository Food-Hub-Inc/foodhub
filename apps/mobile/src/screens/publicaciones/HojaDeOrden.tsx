import { Pressable, Text } from 'react-native';
import type { OrdenPublicacion } from '@foodhub/shared';
import { IconoTilde } from '../../components/iconos';
import { HojaInferior } from '../../components/ui/HojaInferior';
import { TEXTOS_PUBLICACIONES } from '../../lib/textos';
import { OPCIONES_ORDEN } from './listado';

/**
 * Desplegable "Ordenar por" (US-PUB-05). Elegir una opción distinta a la
 * actual reordena el listado de inmediato y cierra la hoja: a diferencia de
 * `HojaDeFiltros`, el criterio de aceptación no pide un botón de confirmación
 * adicional para el orden.
 */
export function HojaDeOrden({
  abierta,
  valor,
  onCerrar,
  onSeleccionar,
}: {
  abierta: boolean;
  valor: OrdenPublicacion;
  onCerrar: () => void;
  onSeleccionar: (orden: OrdenPublicacion) => void;
}) {
  return (
    <HojaInferior
      abierta={abierta}
      etiquetaAccesible={TEXTOS_PUBLICACIONES.ordenarPor}
      onCerrar={onCerrar}
    >
      <Text className="mb-4 text-center text-h2 font-bold text-text-primary">
        {TEXTOS_PUBLICACIONES.ordenarPor}
      </Text>

      {OPCIONES_ORDEN.map((opcion) => {
        const seleccionada = opcion.valor === valor;
        return (
          <Pressable
            key={opcion.valor}
            onPress={() => {
              onSeleccionar(opcion.valor);
            }}
            className="min-h-14 flex-row items-center justify-between px-1"
            accessibilityRole="radio"
            accessibilityState={{ checked: seleccionada }}
            accessibilityLabel={opcion.etiqueta}
          >
            <Text
              className={`text-body ${seleccionada ? 'font-bold text-primary' : 'text-text-primary'}`}
            >
              {opcion.etiqueta}
            </Text>
            {seleccionada ? (
              <IconoTilde size={18} className="text-primary" />
            ) : null}
          </Pressable>
        );
      })}
    </HojaInferior>
  );
}
