import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { loginSchema, MENSAJES_AUTH, type LoginInput } from '@foodhub/shared';
import { iniciarSesion } from '../../src/api/auth';
import { reportarLoginFallido } from '../../src/api/seguridad';
import { MarcaFoodHub, PinFoodHub } from '../../src/components/Marca';
import { SafeAreaView } from '../../src/components/SafeAreaView';
import { IconoSobre } from '../../src/components/iconos';
import { Aviso } from '../../src/components/ui/Aviso';
import { Boton, BotonDeTexto } from '../../src/components/ui/Boton';
import { CampoContrasena } from '../../src/components/ui/CampoContrasena';
import { CampoTexto } from '../../src/components/ui/CampoTexto';
import { EncabezadoPantalla } from '../../src/components/ui/EncabezadoPantalla';
import { useFormulario, type Formulario } from '../../src/hooks/useFormulario';
import { useSesion } from '../../src/hooks/useSesion';
import { TEXTOS_LOGIN } from '../../src/lib/textos';

/**
 * PAN-AUT-03 · Inicio de sesión — US-AUT-03.
 *
 * El ingreso va DIRECTO a Supabase Auth con el SDK: la API no emite tokens,
 * solo los verifica después. Por eso acá no hay ninguna llamada a `/auth/login`;
 * no existe.
 *
 * A dónde entra el usuario NO se decide en esta pantalla. Apenas Supabase
 * devuelve la sesión, `GateDeSesion` consulta el perfil y redirige según el rol
 * —incluido el caso del administrador, que queda fuera de la app—. Decidirlo
 * acá duplicaría esa lógica en dos lugares que se desincronizarían.
 *
 * El mensaje de credenciales inválidas no dice cuál de los dos datos falló:
 * distinguirlos permitiría averiguar qué correos tienen cuenta.
 */
export default function Login() {
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const avisoDeSesion = useSesion((estado) => estado.aviso);
  const fijarAviso = useSesion((estado) => estado.fijarAviso);

  const formulario = useFormulario(loginSchema, { email: '', password: '' });

  async function ingresar() {
    formulario.revelarErrores();
    const datos = formulario.datos;
    if (!datos) return;

    setError(null);
    setEnviando(true);

    try {
      await iniciarSesion(datos.email, datos.password);
      // No se navega: el gate redirige solo cuando cambia el estado de sesión.
    } catch {
      /**
       * US-AUD-01, segundo criterio. El intento fallido no pasa por la API
       * —el login va contra Supabase— así que lo reporta el cliente. Es "fire
       * and forget": no se espera ni se reintenta, y un fallo del registro no
       * puede cambiar lo que ve el usuario.
       */
      reportarLoginFallido(datos.email);
      setError(MENSAJES_AUTH.credencialesInvalidas);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <EncabezadoPantalla destinoAlternativo="/bienvenida" titulo="" />

      <ScrollView
        contentContainerClassName="grow justify-center px-6 pb-10"
        keyboardShouldPersistTaps="handled"
      >
        <Encabezado />

        {/* El aviso de expulsión del administrador lo deja el gate al cerrarle
            la sesión, y se limpia al primer intento para no quedar pegado. */}
        {avisoDeSesion === null ? null : (
          <Aviso className="mb-5" mensaje={avisoDeSesion} tono="informativo" />
        )}
        {error === null ? null : (
          <Aviso className="mb-5" mensaje={error} tono="error" />
        )}

        <CamposDeIngreso
          formulario={formulario}
          onEscribirCorreo={() => {
            fijarAviso(null);
          }}
        />

        <Boton
          cargando={enviando}
          className="mt-6"
          onPress={() => void ingresar()}
          textoCargando={TEXTOS_LOGIN.ingresando}
        >
          {TEXTOS_LOGIN.ingresar}
        </Boton>

        <PieDeIngreso />
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * Los dos campos del ingreso más el acceso a la recuperación.
 *
 * `onEscribirCorreo` sirve para limpiar el aviso que dejó el gate al expulsar a
 * un administrador: en cuanto el usuario corrige el correo, ese cartel dejó de
 * describir lo que está pasando.
 */
function CamposDeIngreso({
  formulario,
  onEscribirCorreo,
}: {
  formulario: Formulario<{ email: string; password: string }, LoginInput>;
  onEscribirCorreo: () => void;
}) {
  return (
    <>
      <CampoTexto
        autoCompletar="email"
        error={formulario.mensajeDe('email')}
        etiqueta={TEXTOS_LOGIN.correo}
        icono={<IconoSobre className="text-text-disabled" size={20} />}
        nombre="email"
        obligatorio
        onChange={(valor) => {
          onEscribirCorreo();
          formulario.fijar('email', valor);
        }}
        placeholder={TEXTOS_LOGIN.correoPlaceholder}
        tipoTeclado="email-address"
        valor={formulario.valores.email}
      />

      <CampoContrasena
        className="mt-4"
        error={formulario.mensajeDe('password')}
        etiqueta={TEXTOS_LOGIN.contrasena}
        nombre="password"
        onChange={(valor) => {
          formulario.fijar('password', valor);
        }}
        placeholder={TEXTOS_LOGIN.contrasenaPlaceholder}
        valor={formulario.valores.password}
      />

      <View className="mt-3 items-end">
        <BotonDeTexto
          onPress={() => {
            router.push('/recuperar');
          }}
        >
          {TEXTOS_LOGIN.olvidaste}
        </BotonDeTexto>
      </View>
    </>
  );
}

/** Marca y saludo de PAN-AUT-03, centrados sobre el formulario. */
function Encabezado() {
  return (
    <View className="mb-8 items-center">
      <PinFoodHub size={72} />
      <View className="mt-5">
        <MarcaFoodHub size={30} />
      </View>
      <Text className="mt-5 text-body text-text-secondary">
        {TEXTOS_LOGIN.bienvenida}
      </Text>
    </View>
  );
}

/**
 * «¿No tenés cuenta? Registrate» lleva a la bienvenida y no a un registro
 * concreto: hay dos, y el rol se elige ahí.
 */
function PieDeIngreso() {
  return (
    <View className="mt-7 flex-row justify-center">
      <Text className="text-body text-text-secondary">
        {TEXTOS_LOGIN.sinCuenta}
      </Text>
      <BotonDeTexto
        onPress={() => {
          router.push('/bienvenida');
        }}
      >
        {TEXTOS_LOGIN.registrate}
      </BotonDeTexto>
    </View>
  );
}
