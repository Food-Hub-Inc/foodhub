import { useState, type ReactElement } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  restablecerPasswordSchema,
  type RestablecerPasswordInput,
} from '@foodhub/shared';
import { SafeAreaView } from '../../src/components/SafeAreaView';
import { Aviso } from '../../src/components/ui/Aviso';
import { Boton, BotonDeTexto } from '../../src/components/ui/Boton';
import { CampoContrasena } from '../../src/components/ui/CampoContrasena';
import { EncabezadoPantalla } from '../../src/components/ui/EncabezadoPantalla';
import { Esqueleto } from '../../src/components/ui/Esqueleto';
import { useEnlaceDeAcceso } from '../../src/hooks/useEnlaceDeAcceso';
import {
  useFormulario,
  type Formulario as FormularioDe,
} from '../../src/hooks/useFormulario';
import { mensajeDeError } from '../../src/lib/api';
import type { MotivoDelEnlace } from '../../src/lib/enlaceDeAcceso';
import { TEXTOS_NUEVA_PASSWORD } from '../../src/lib/textos';

/**
 * PAN-AUT-04.1 · Nueva contraseña — US-AUT-04 y US-GURP-06.
 *
 * Se abre desde el enlace del correo, no desde otra pantalla de la app. Todo lo
 * que decide qué se ve acá vive en `useEnlaceDeAcceso`: la pantalla es un
 * `switch` sobre esa máquina de estados y no calcula nada por su cuenta.
 *
 * Antes preguntaba "¿hay sesión de Supabase?" para decidirlo, y esa pregunta no
 * distingue "el enlace todavía se está validando" de "el enlace no sirve": por
 * eso el cartel rojo aparecía por un instante en cada enlace válido. Los estados
 * `canjeando` e `invalida` son ahora dos cosas distintas y se dibujan distinto.
 *
 * Atiende los DOS enlaces que llegan a esta ruta —recuperación e invitación— y
 * lo único que cambia entre ellos es lo que dicen los textos: el formulario, la
 * validación y el guardado son idénticos.
 *
 * El botón «Guardar nueva contraseña» arranca deshabilitado y solo se habilita
 * cuando las dos contraseñas coinciden y cumplen la política, tal como pide el
 * estado alternativo del mockup.
 */
export default function NuevaPassword() {
  const paso = useEnlaceDeAcceso((estado) => estado.paso);
  const motivo = useEnlaceDeAcceso((estado) => estado.motivo);
  const fijarPassword = useEnlaceDeAcceso((estado) => estado.fijarPassword);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

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
      // El paso a `cambiada` lo hace el store: es un hecho del flujo, no de esta
      // pantalla, y el gate también tiene que enterarse.
      await fijarPassword(datos.password);
    } catch (fallo) {
      setError(mensajeDeError(fallo));
    } finally {
      setGuardando(false);
    }
  }

  function contenido(): ReactElement {
    switch (paso) {
      case 'sinResolver':
      case 'canjeando':
        return <Validando />;
      case 'activa':
        return (
          <Formulario
            error={error}
            formulario={formulario}
            guardando={guardando}
            motivo={motivo}
            onGuardar={() => void guardar()}
          />
        );
      case 'cambiada':
        return <Cerrada motivo={motivo} />;
      // `ocioso` es entrar a la ruta a mano, sin enlace ninguno: para el usuario
      // es el mismo callejón sin salida que un enlace vencido y se resuelve con
      // la misma acción.
      case 'ocioso':
      case 'invalida':
        return <EnlaceInvalido />;
    }
  }

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
        {contenido()}
      </ScrollView>
    </SafeAreaView>
  );
}

interface ValoresDeContrasena {
  password: string;
  confirmPassword: string;
}

/**
 * GoTrue está validando los tokens del enlace.
 *
 * Va un esqueleto con la forma del formulario y no un spinner, como pide la guía
 * de UX: cuando el enlace termina de validarse los campos aparecen donde el
 * usuario ya estaba mirando y nada salta de lugar.
 */
function Validando() {
  return (
    <>
      <Esqueleto className="h-8 w-3/4" />
      <Esqueleto className="mt-3 h-4 w-full" />
      <Esqueleto className="mt-2 mb-8 h-4 w-2/3" />
      <Esqueleto className="h-14 rounded-md" />
      <Esqueleto className="mt-4 h-14 rounded-md" />
      <Esqueleto className="mt-6 h-14 rounded-md" />
    </>
  );
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
  motivo,
  onGuardar,
}: {
  formulario: FormularioDe<ValoresDeContrasena, RestablecerPasswordInput>;
  error: string | null;
  guardando: boolean;
  motivo: MotivoDelEnlace;
  onGuardar: () => void;
}) {
  const esInvitacion = motivo === 'invitacion';

  return (
    <>
      <Text className="text-h2 font-bold text-text-primary">
        {esInvitacion
          ? TEXTOS_NUEVA_PASSWORD.encabezadoInvitacion
          : TEXTOS_NUEVA_PASSWORD.encabezado}
      </Text>
      <Text className="mt-2 mb-6 text-body text-text-secondary">
        {esInvitacion
          ? TEXTOS_NUEVA_PASSWORD.bajadaInvitacion
          : TEXTOS_NUEVA_PASSWORD.bajada}
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

/** La contraseña quedó guardada: hay que entrar con ella desde el login. */
function Cerrada({ motivo }: { motivo: MotivoDelEnlace }) {
  return (
    <View className="grow justify-center">
      <Aviso
        mensaje={
          motivo === 'invitacion'
            ? TEXTOS_NUEVA_PASSWORD.listoInvitacion
            : TEXTOS_NUEVA_PASSWORD.listo
        }
        tono="exito"
      />
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
