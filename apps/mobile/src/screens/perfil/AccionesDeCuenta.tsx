import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { MENSAJES_USUARIO } from '@foodhub/shared';
import { cerrarSesion } from '../../api/auth';
import {
  IconoCampana,
  IconoCandado,
  IconoAyuda,
  IconoSalir,
  IconoTacho,
} from '../../components/iconos';
import { Boton, BotonDeTexto } from '../../components/ui/Boton';
import { DialogoSevero } from '../../components/ui/DialogoSevero';
import { FilaDeNavegacion } from '../../components/ui/FilaDeNavegacion';
import { FondoTenue } from '../../components/ui/FondoTenue';
import { HojaInferior } from '../../components/ui/HojaInferior';
import { useEliminarCuenta } from '../../hooks/usePerfil';
import {
  TEXTOS_AYUDA,
  TEXTOS_CERRAR_SESION,
  TEXTOS_PERFIL,
} from '../../lib/textos';
import { CambiarContrasena } from './CambiarContrasena';

/**
 * Las cuatro acciones del pie de PAN-GURP-01.
 *
 * Cada una usa el patrón de confirmación que le corresponde por su gravedad, y
 * la diferencia es intencional:
 *
 *   CERRAR SESIÓN    bottom sheet (PAN-AUT-05). Es reversible: se vuelve a
 *                    entrar con las mismas credenciales.
 *   ELIMINAR CUENTA  diálogo severo centrado, que interrumpe. No se deshace.
 *
 * Después de eliminar la cuenta se cierra la sesión: el JWT sigue siendo válido
 * hasta que expire, pero la cuenta ya no lo está, y dejarlo abierto dejaría al
 * usuario dentro de una app que le va a rechazar cada request.
 */
export function AccionesDeCuenta() {
  const [cambiandoPassword, setCambiandoPassword] = useState(false);
  const [confirmandoSalida, setConfirmandoSalida] = useState(false);
  const [confirmandoBaja, setConfirmandoBaja] = useState(false);
  const baja = useEliminarCuenta();

  function salir() {
    setConfirmandoSalida(false);
    void cerrarSesion();
  }

  function eliminar() {
    baja.mutate(undefined, {
      onSuccess: () => {
        setConfirmandoBaja(false);
        void cerrarSesion();
      },
    });
  }

  return (
    <View className="mt-6 overflow-hidden rounded-md border border-border bg-surface">
      <FilaDeNavegacion
        etiqueta={TEXTOS_PERFIL.cambiarContrasena}
        expandible
        expandida={cambiandoPassword}
        icono={<IconoCandado className="text-text-secondary" size={20} />}
        onPress={() => {
          setCambiandoPassword((abierto) => !abierto);
        }}
      />
      {cambiandoPassword ? (
        <CambiarContrasena
          onListo={() => {
            setCambiandoPassword(false);
          }}
        />
      ) : null}

      <FilaDeNavegacion
        etiqueta={TEXTOS_PERFIL.configurarNotificaciones}
        icono={<IconoCampana className="text-text-secondary" size={20} />}
        onPress={() => {
          router.push('/preferencias-notificaciones');
        }}
      />

      <FilaDeAyuda />

      <FilaDeNavegacion
        etiqueta={TEXTOS_PERFIL.cerrarSesion}
        icono={<IconoSalir className="text-text-secondary" size={20} />}
        onPress={() => {
          setConfirmandoSalida(true);
        }}
      />

      <FilaDeNavegacion
        destructiva
        etiqueta={TEXTOS_PERFIL.eliminarCuenta}
        icono={<IconoTacho className="text-error" size={20} />}
        onPress={() => {
          setConfirmandoBaja(true);
        }}
      />

      <HojaDeCierre
        abierta={confirmandoSalida}
        onCancelar={() => {
          setConfirmandoSalida(false);
        }}
        onConfirmar={salir}
      />

      <DialogoSevero
        abierto={confirmandoBaja}
        mensaje={MENSAJES_USUARIO.advertenciaEliminarCuenta}
        onCancelar={() => {
          setConfirmandoBaja(false);
        }}
        onConfirmar={eliminar}
        procesando={baja.isPending}
        textoCancelar={TEXTOS_PERFIL.cancelar}
        textoConfirmar={TEXTOS_PERFIL.confirmarEliminar}
        titulo={TEXTOS_PERFIL.tituloEliminarCuenta}
      />
    </View>
  );
}

function FilaDeAyuda() {
  return (
    <FilaDeNavegacion
      etiqueta={TEXTOS_AYUDA.titulo}
      icono={<IconoAyuda className="text-text-secondary" size={20} />}
      onPress={() => {
        router.push('/ayuda');
      }}
    />
  );
}

/** PAN-AUT-05 · Diálogo de cierre de sesión, como bottom sheet. */
function HojaDeCierre({
  abierta,
  onConfirmar,
  onCancelar,
}: {
  abierta: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  return (
    <HojaInferior
      abierta={abierta}
      etiquetaAccesible={TEXTOS_CERRAR_SESION.titulo}
      onCerrar={onCancelar}
    >
      {/* Sin padding horizontal propio: `HojaInferior` ya envuelve a sus
          children en `px-6 pb-10 pt-2`, y repetirlo angostaba el contenido. */}
      <View className="items-center pb-2">
        <View className="mb-4 h-16 w-16 items-center justify-center overflow-hidden rounded-full">
          <FondoTenue className="bg-error" />
          <IconoSalir className="text-error" size={28} />
        </View>

        <Text className="text-h2 font-bold text-text-primary">
          {TEXTOS_CERRAR_SESION.titulo}
        </Text>
        <Text className="mt-2 mb-6 text-center text-body text-text-secondary">
          {TEXTOS_CERRAR_SESION.bajada}
        </Text>

        <Boton className="w-full" onPress={onConfirmar} variante="destructivo">
          {TEXTOS_CERRAR_SESION.confirmar}
        </Boton>

        <View className="mt-4">
          <BotonDeTexto className="text-text-primary" onPress={onCancelar}>
            {TEXTOS_CERRAR_SESION.cancelar}
          </BotonDeTexto>
        </View>
      </View>
    </HojaInferior>
  );
}
