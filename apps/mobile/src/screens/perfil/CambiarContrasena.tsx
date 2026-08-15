import { useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import {
  cambiarPasswordSchema,
  MENSAJES_USUARIO,
  type CambiarPasswordInput,
} from '@foodhub/shared';
import { Aviso } from '../../components/ui/Aviso';
import { Boton } from '../../components/ui/Boton';
import { CampoContrasena } from '../../components/ui/CampoContrasena';
import { useCambiarPassword } from '../../hooks/usePerfil';
import { useDuracion } from '../../hooks/useMovimientoReducido';
import {
  useFormulario,
  type Formulario as FormularioDe,
} from '../../hooks/useFormulario';
import { esErrorApi, mensajeDeError } from '../../lib/api';
import { TEXTOS_PERFIL } from '../../lib/textos';

/**
 * Formulario desplegable de cambio de contraseña — US-GURP-03.
 *
 * Pide la contraseña actual aunque la sesión ya esté abierta. No es una
 * formalidad: sin ese paso, cualquiera que agarre el teléfono desbloqueado se
 * queda con la cuenta. La verificación real la hace el servidor reautenticando
 * con ese valor.
 *
 * El error de contraseña actual incorrecta aparece debajo de SU campo y no como
 * cartel general: es el único dato que hay que corregir.
 */
export function CambiarContrasena({ onListo }: { onListo: () => void }) {
  const [errorActual, setErrorActual] = useState<string | undefined>(undefined);
  const cambio = useCambiarPassword();
  const duracion = useDuracion(200);

  const formulario = useFormulario(
    cambiarPasswordSchema,
    { passwordActual: '', password: '', confirmPassword: '' },
    errorActual === undefined ? undefined : { passwordActual: errorActual },
  );

  function guardar() {
    formulario.revelarErrores();
    const datos = formulario.datos;
    if (!datos) return;

    setErrorActual(undefined);
    cambio.mutate(datos, {
      onSuccess: () => {
        formulario.reiniciar();
        onListo();
      },
      onError: (error) => {
        if (
          esErrorApi(error) &&
          error.codigo === 'PASSWORD_ACTUAL_INCORRECTA'
        ) {
          setErrorActual(MENSAJES_USUARIO.contrasenaActualIncorrecta);
        }
      },
    });
  }

  const errorGeneral =
    cambio.error && errorActual === undefined
      ? mensajeDeError(cambio.error)
      : null;

  return (
    <Animated.View
      className="border-b border-border bg-background px-4 py-5"
      entering={FadeIn.duration(duracion)}
    >
      {errorGeneral === null ? null : (
        <Aviso className="mb-4" mensaje={errorGeneral} tono="error" />
      )}

      <Campo
        etiqueta={TEXTOS_PERFIL.contrasenaActual}
        formulario={formulario}
        nombre="passwordActual"
        onEscribir={() => {
          setErrorActual(undefined);
        }}
      />
      <Campo
        etiqueta={TEXTOS_PERFIL.contrasenaNueva}
        formulario={formulario}
        nombre="password"
        nueva
      />
      <Campo
        etiqueta={TEXTOS_PERFIL.contrasenaConfirmar}
        formulario={formulario}
        nombre="confirmPassword"
        nueva
      />

      <Boton
        cargando={cambio.isPending}
        className="mt-5"
        deshabilitado={!formulario.esValido}
        onPress={guardar}
        tamano="sm"
        textoCargando={TEXTOS_PERFIL.guardando}
      >
        {TEXTOS_PERFIL.actualizarContrasena}
      </Boton>
    </Animated.View>
  );
}

interface ValoresDeCambio {
  passwordActual: string;
  password: string;
  confirmPassword: string;
}

/**
 * Un campo del formulario. Los tres se dibujan igual y solo cambian su rótulo y
 * la clave que tocan: escribirlos tres veces sería copiar y pegar.
 *
 * `nueva` distingue la contraseña que se está creando de la actual, para que el
 * gestor de contraseñas del teléfono ofrezca lo que corresponde en cada una.
 */
function Campo({
  formulario,
  nombre,
  etiqueta,
  nueva = false,
  onEscribir,
}: {
  formulario: FormularioDe<ValoresDeCambio, CambiarPasswordInput>;
  nombre: keyof ValoresDeCambio;
  etiqueta: string;
  nueva?: boolean;
  onEscribir?: () => void;
}) {
  return (
    <View className="mt-4 first:mt-0">
      <CampoContrasena
        error={formulario.mensajeDe(nombre)}
        etiqueta={etiqueta}
        nombre={nombre}
        nueva={nueva}
        onChange={(valor) => {
          onEscribir?.();
          formulario.fijar(nombre, valor);
        }}
        valor={formulario.valores[nombre]}
      />
    </View>
  );
}
