import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  restablecerPasswordSchema,
  type RestablecerPasswordInput,
} from '@foodhub/shared';
import { restablecerPassword } from '../../src/api/auth';
import { SafeAreaView } from '../../src/components/SafeAreaView';
import { Aviso } from '../../src/components/ui/Aviso';
import { Boton, BotonDeTexto } from '../../src/components/ui/Boton';
import { CampoContrasena } from '../../src/components/ui/CampoContrasena';
import { EncabezadoPantalla } from '../../src/components/ui/EncabezadoPantalla';
import {
  useFormulario,
  type Formulario as FormularioDe,
} from '../../src/hooks/useFormulario';
import { useSesion } from '../../src/hooks/useSesion';
import { mensajeDeError } from '../../src/lib/api';
import { TEXTOS_NUEVA_PASSWORD } from '../../src/lib/textos';

/**
 * PAN-AUT-04.1 · Nueva contraseña — US-AUT-04.
 *
 * Se abre desde el enlace del correo, no desde otra pantalla de la app. El
 * enlace trae un token de recuperación que el cliente de Supabase canjea por
 * una sesión antes de que esta pantalla se monte; por eso el formulario solo
 * pide la contraseña y no vuelve a pedir el correo.
 *
 * Esa sesión de recuperación es también la razón por la que `GateDeSesion`
 * tiene una excepción para esta ruta: sin ella, "tener sesión" sacaría al
 * usuario de acá justo cuando está por recuperar su cuenta.
 *
 * El botón «Guardar nueva contraseña» arranca deshabilitado y solo se habilita
 * cuando las dos contraseñas coinciden y cumplen la política, tal como pide el
 * estado alternativo del mockup.
 */
export default function NuevaPassword() {
  const sesion = useSesion((estado) => estado.sesion);
  const resuelta = useSesion((estado) => estado.resuelta);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [listo, setListo] = useState(false);

  const formulario = useFormulario(restablecerPasswordSchema, {
    password: '',
    confirmPassword: '',
  });

  async function guardar() {
    formulario.revelarErrores();
    const datos = formulario.datos;
    if (!datos) return;

    setError(null);
    setGuardando(true);

    try {
      await restablecerPassword(datos.password);
      setListo(true);
    } catch (fallo) {
      setError(mensajeDeError(fallo));
    } finally {
      setGuardando(false);
    }
  }

  // Enlace vencido, ya usado, o alguien entró a la ruta a mano. Se espera a que
  // Supabase resuelva antes de decidirlo: preguntarlo antes daría un falso
  // negativo mientras el token todavía se está canjeando.
  const sinEnlaceValido = resuelta && sesion === null && !listo;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <EncabezadoPantalla
        destinoAlternativo="/login"
        titulo={TEXTOS_NUEVA_PASSWORD.titulo}
      />

      <ScrollView
        contentContainerClassName="grow px-6 pt-6 pb-10"
        keyboardShouldPersistTaps="handled"
      >
        {listo ? (
          <Cerrada />
        ) : sinEnlaceValido ? (
          <EnlaceInvalido />
        ) : (
          <Formulario
            error={error}
            formulario={formulario}
            guardando={guardando}
            onGuardar={() => void guardar()}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

interface ValoresDeContrasena {
  password: string;
  confirmPassword: string;
}

/**
 * El formulario en sí. El botón arranca deshabilitado y solo se habilita cuando
 * las dos contraseñas coinciden y cumplen la política, como pide el estado
 * alternativo de PAN-AUT-04.1.
 */
function Formulario({
  formulario,
  error,
  guardando,
  onGuardar,
}: {
  formulario: FormularioDe<ValoresDeContrasena, RestablecerPasswordInput>;
  error: string | null;
  guardando: boolean;
  onGuardar: () => void;
}) {
  return (
    <>
      <Text className="text-h2 font-bold text-text-primary">
        {TEXTOS_NUEVA_PASSWORD.encabezado}
      </Text>
      <Text className="mt-2 mb-6 text-body text-text-secondary">
        {TEXTOS_NUEVA_PASSWORD.bajada}
      </Text>

      {error === null ? null : (
        <Aviso className="mb-5" mensaje={error} tono="error" />
      )}

      <CampoContrasena
        error={formulario.mensajeDe('password')}
        etiqueta={TEXTOS_NUEVA_PASSWORD.nueva}
        nombre="password"
        nueva
        onChange={(valor) => {
          formulario.fijar('password', valor);
        }}
        valor={formulario.valores.password}
      />

      <CampoContrasena
        className="mt-4"
        error={formulario.mensajeDe('confirmPassword')}
        etiqueta={TEXTOS_NUEVA_PASSWORD.confirmar}
        nombre="confirmPassword"
        nueva
        onChange={(valor) => {
          formulario.fijar('confirmPassword', valor);
        }}
        valor={formulario.valores.confirmPassword}
      />

      <Boton
        cargando={guardando}
        className="mt-6"
        deshabilitado={!formulario.esValido}
        onPress={onGuardar}
        textoCargando={TEXTOS_NUEVA_PASSWORD.guardando}
      >
        {TEXTOS_NUEVA_PASSWORD.guardar}
      </Boton>
    </>
  );
}

/** La contraseña se actualizó: se invalidó la anterior y hay que volver a entrar. */
function Cerrada() {
  return (
    <View className="grow justify-center">
      <Aviso mensaje={TEXTOS_NUEVA_PASSWORD.listo} tono="exito" />
      <Boton
        className="mt-6"
        onPress={() => {
          router.replace('/login');
        }}
      >
        {TEXTOS_NUEVA_PASSWORD.titulo}
      </Boton>
    </View>
  );
}

function EnlaceInvalido() {
  return (
    <View className="grow justify-center">
      <Aviso mensaje={TEXTOS_NUEVA_PASSWORD.enlaceInvalido} tono="error" />
      <View className="mt-6 items-center">
        <BotonDeTexto
          onPress={() => {
            router.replace('/recuperar');
          }}
        >
          {TEXTOS_NUEVA_PASSWORD.pedirOtroEnlace}
        </BotonDeTexto>
      </View>
    </View>
  );
}
