import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { MENSAJES_USUARIO } from '@foodhub/shared';
import { cerrarSesion } from '../../api/auth';
import {
  IconoCampana,
  IconoCandado,
  IconoAyuda,
  IconoEstrella,
  IconoSalir,
  IconoTacho,
} from '../../components/iconos';
import { Boton, BotonDeTexto } from '../../components/ui/Boton';
import { DialogoSevero } from '../../components/ui/DialogoSevero';
import { FilaDeNavegacion } from '../../components/ui/FilaDeNavegacion';
import { FondoTenue } from '../../components/ui/FondoTenue';
import { HojaInferior } from '../../components/ui/HojaInferior';
import { useEliminarCuenta, usePerfil } from '../../hooks/usePerfil';
import {
  TEXTOS_AYUDA,
  TEXTOS_CERRAR_SESION,
  TEXTOS_PERFIL,
  TEXTOS_RESENA,
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
      <FilaDeContrasena />

      <FilaDeMisResenas />
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

/**
 * Puerta de entrada a PAN-RES-02 (US-RES-03).
 *
 * SOLO PARA EL COCINERO: es el listado de las resenas que EL recibio. El
 * cliente llega a las resenas de un cocinero por la solapa de su perfil
 * publico, no por aca.
 *
 * El rol sale de la consulta ya cacheada por React Query y no de una prop: la
 * pantalla que monta este bloque ya la pidio, y agregarla al contrato
 * obligaria a propagarla por un nivel que no la necesita para nada mas.
 */
/**
 * "Cambiar contrasena" (US-GURP-03) y el formulario que despliega.
 *
 * Se extrae con su propio estado porque nadie mas lo usa: mantenerlo en
 * `AccionesDeCuenta` obligaba a esa funcion a cargar con el `useState` y las
 * dieciseis lineas del bloque, y la dejaba por encima del limite de longitud
 * que fija el proyecto.
 */
function FilaDeContrasena() {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <FilaDeNavegacion
        etiqueta={TEXTOS_PERFIL.cambiarContrasena}
        expandible
        expandida={abierto}
        icono={<IconoCandado className="text-text-secondary" size={20} />}
        onPress={() => {
          setAbierto((previo) => !previo);
        }}
      />
      {abierto ? (
        <CambiarContrasena
          onListo={() => {
            setAbierto(false);
          }}
        />
      ) : null}
    </>
  );
}

function FilaDeMisResenas() {
  const esCocinero = usePerfil().data?.tipo === 'COCINERO';
  if (!esCocinero) return null;

  return (
    <FilaDeNavegacion
      etiqueta={TEXTOS_RESENA.tituloMisResenas}
      icono={<IconoEstrella className="text-text-secondary" size={20} />}
      onPress={() => {
        router.push('/resenas/mis-resenas');
      }}
    />
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
      <View className="items-center px-6 pt-2 pb-8">
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
