import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from '../SafeAreaView';
import { TEXTOS_PENDIENTE } from '../../lib/textos';
import { FondoTenue } from './FondoTenue';

/**
 * Pantalla todavía no codificada.
 *
 * Dice su código PAN, su módulo y qué va a hacer. Un placeholder que solo pone
 * "próximamente" obliga a abrir la documentación para saber qué falta; con
 * estos tres datos, quien revisa el avance del sprint lo lee desde el teléfono
 * y quien la codifique después sabe qué tiene que quedar acá.
 */
export function PantallaPendiente({
  codigo,
  modulo,
  titulo,
  descripcion,
  icono,
}: {
  /** Código de la maquetación, por ejemplo `PAN-EXP-01`. */
  codigo: string;
  /** Módulo funcional al que pertenece. */
  modulo: string;
  titulo: string;
  /** Una línea sobre qué va a hacer la pantalla. */
  descripcion: string;
  icono: ReactNode;
}) {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center px-8">
        <View className="mb-5 h-20 w-20 items-center justify-center overflow-hidden rounded-full">
          <FondoTenue />
          {icono}
        </View>

        <View className="mb-3 overflow-hidden rounded-full px-3 py-1">
          <FondoTenue />
          <Text className="text-caption font-bold text-warning">
            {TEXTOS_PENDIENTE.etiqueta} · {codigo}
          </Text>
        </View>

        <Text
          className="text-center text-h1 font-extrabold text-text-primary"
          accessibilityRole="header"
        >
          {titulo}
        </Text>
        <Text className="mt-1 text-center text-label font-semibold text-primary">
          {modulo}
        </Text>
        <Text className="mt-3 text-center text-body text-text-secondary">
          {descripcion}
        </Text>
        <Text className="mt-6 text-center text-caption text-text-disabled">
          {TEXTOS_PENDIENTE.nota}
        </Text>
      </View>
    </SafeAreaView>
  );
}
