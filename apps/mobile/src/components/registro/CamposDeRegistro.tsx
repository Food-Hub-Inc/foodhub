import { View } from 'react-native';
import { CampoContrasena } from '../ui/CampoContrasena';
import { CampoTexto } from '../ui/CampoTexto';
import { IconoSobre } from '../iconos';
import { TEXTOS_REGISTRO } from '../../lib/textos';

/**
 * Los campos que PAN-AUT-01 y PAN-AUT-02 tienen en común.
 *
 * Los dos formularios de registro coinciden en cinco campos y difieren en dos
 * (el cocinero agrega ubicación y descripción pública). Escribirlos dos veces
 * garantizaría que en algún momento una corrección entre en uno y no en el
 * otro: los mensajes de error son literales verificados por las pruebas de la
 * Etapa 6 y no pueden divergir.
 *
 * No recibe el objeto `Formulario` entero sino un adaptador acotado a estos
 * campos. Así este componente no puede tocar `ubicacion` ni `terminosAceptados`
 * aunque el formulario que lo invoca los tenga.
 */

/** Los cinco campos de texto comunes a los dos registros. */
export type CampoDeRegistro =
  'nombre' | 'apellido' | 'email' | 'password' | 'confirmPassword';

export interface ControlDeRegistro {
  valores: Readonly<Record<CampoDeRegistro, string>>;
  mensajeDe(campo: CampoDeRegistro): string | undefined;
  fijar(campo: CampoDeRegistro, valor: string): void;
}

export function CamposDeRegistro({ control }: { control: ControlDeRegistro }) {
  return (
    <View>
      {/* Nombre y apellido en dos columnas, como la maquetación. */}
      <View className="flex-row gap-3">
        <CampoTexto
          autoCompletar="name"
          className="flex-1"
          error={control.mensajeDe('nombre')}
          etiqueta={TEXTOS_REGISTRO.nombre}
          mayusculas="words"
          nombre="nombre"
          obligatorio
          onChange={(valor) => {
            control.fijar('nombre', valor);
          }}
          valor={control.valores.nombre}
        />
        <CampoTexto
          autoCompletar="family-name"
          className="flex-1"
          error={control.mensajeDe('apellido')}
          etiqueta={TEXTOS_REGISTRO.apellido}
          mayusculas="words"
          nombre="apellido"
          obligatorio
          onChange={(valor) => {
            control.fijar('apellido', valor);
          }}
          valor={control.valores.apellido}
        />
      </View>

      <CampoTexto
        autoCompletar="email"
        className="mt-4"
        error={control.mensajeDe('email')}
        etiqueta={TEXTOS_REGISTRO.correo}
        icono={<IconoSobre className="text-text-disabled" size={20} />}
        nombre="email"
        obligatorio
        onChange={(valor) => {
          control.fijar('email', valor);
        }}
        placeholder={TEXTOS_REGISTRO.correoPlaceholder}
        tipoTeclado="email-address"
        valor={control.valores.email}
      />

      <CampoContrasena
        className="mt-4"
        error={control.mensajeDe('password')}
        etiqueta={TEXTOS_REGISTRO.contrasena}
        nombre="password"
        nueva
        onChange={(valor) => {
          control.fijar('password', valor);
        }}
        valor={control.valores.password}
      />

      <CampoContrasena
        className="mt-4"
        error={control.mensajeDe('confirmPassword')}
        etiqueta={TEXTOS_REGISTRO.confirmarContrasena}
        nombre="confirmPassword"
        nueva
        onChange={(valor) => {
          control.fijar('confirmPassword', valor);
        }}
        valor={control.valores.confirmPassword}
      />
    </View>
  );
}
