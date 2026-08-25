import { useCallback, useEffect, useRef, useState } from 'react';
import type { EnviarMensajeInput, Mensaje } from '@foodhub/shared';
import {
  enviarMensaje,
  solicitarUrlDeCargaDeImagenChat,
} from '../api/mensajeria';
import { subirArchivoFirmado } from '../lib/storage';
import type { FotoElegida } from '../components/ui/SelectorDeFoto';

/**
 * Cola de envío del chat (US-MSG-02 y US-MSG-03).
 *
 * POR QUÉ ESTO NO ES UN `useMutation` Y PUNTO
 *
 * Los criterios piden que la burbuja aparezca "de forma inmediata" con estado
 * "Enviando", que un fallo la deje con un ícono de error y el texto "No se pudo
 * enviar", y que al tocar ese ícono se reintente. Eso es una COLA con estado
 * propio por elemento: varios mensajes pueden estar en vuelo a la vez, uno
 * puede fallar mientras otro sale bien, y el que falló tiene que seguir en
 * pantalla —con su texto y su imagen— hasta que se reintente o el usuario cierre
 * la conversación. Una mutación sola sólo modela el último intento.
 *
 * EL PENDIENTE GUARDA EL BORRADOR, NO EL MENSAJE. Un mensaje de imagen no
 * existe hasta que la imagen está en Storage: mientras sube, lo único que hay es
 * el archivo local. Por eso la burbuja optimista se dibuja desde el borrador y
 * no desde un `Mensaje` a medio construir.
 */

/** Lo que el usuario compuso, antes de que exista como fila en la base. */
export type Borrador =
  | { tipo: 'TEXTO'; contenido: string }
  | { tipo: 'IMAGEN'; foto: FotoElegida; pieDeImagen?: string };

export interface MensajePendiente {
  /**
   * Identidad local del pendiente. NO es el id del mensaje: ese lo asigna la
   * base recién al confirmarse, y hasta entonces la lista necesita una clave
   * estable para no reordenarse en cada render.
   */
  claveLocal: string;
  borrador: Borrador;
  estado: 'ENVIANDO' | 'ERROR';
  /** Marca de tiempo local, sólo para ordenar la burbuja al final del hilo. */
  fechaEnvio: string;
}

let contador = 0;
function siguienteClave(): string {
  contador += 1;
  return `pendiente-${String(contador)}`;
}

/**
 * Sube la imagen si hace falta y arma el cuerpo que espera la API.
 *
 * La subida va del teléfono DIRECTO al bucket contra una URL firmada: la API
 * nunca ve el binario (ver `storage.ts`). El tope de 8 MB y los formatos ya se
 * validaron al elegir la foto, y el servidor los vuelve a comprobar antes de
 * firmar.
 */
async function aCuerpo(
  conversacionId: string,
  borrador: Borrador,
): Promise<EnviarMensajeInput> {
  if (borrador.tipo === 'TEXTO') {
    return { tipo: 'TEXTO', contenido: borrador.contenido };
  }

  const carga = await solicitarUrlDeCargaDeImagenChat(conversacionId, {
    mimeType: borrador.foto.mimeType,
    tamano: borrador.foto.tamano,
  });

  const imagenUrl = await subirArchivoFirmado({
    uri: borrador.foto.uri,
    mimeType: borrador.foto.mimeType,
    carga,
  });

  return {
    tipo: 'IMAGEN',
    imagenUrl,
    ...(borrador.pieDeImagen ? { pieDeImagen: borrador.pieDeImagen } : {}),
  };
}

export function useEnvioDeMensajes(entrada: {
  conversacionId: string;
  /** Se llama con el mensaje ya confirmado por la API. */
  onConfirmado: (mensaje: Mensaje) => void;
}) {
  const { conversacionId, onConfirmado } = entrada;
  const [pendientes, setPendientes] = useState<MensajePendiente[]>([]);

  /**
   * El callback cambia en cada render de la pantalla, pero `despachar` no debe
   * cambiar con él: es la dependencia de `enviar` y de `reintentar`, y una
   * identidad nueva por render volvería inútil el `useCallback` de los dos.
   *
   * El ref se sincroniza dentro de un efecto y no durante el render: escribirlo
   * en el cuerpo del componente es lo que React desaconseja, porque el valor
   * queda actualizado antes de que el render se confirme.
   */
  const confirmar = useRef(onConfirmado);
  useEffect(() => {
    confirmar.current = onConfirmado;
  });

  const marcar = useCallback(
    (claveLocal: string, estado: MensajePendiente['estado']) => {
      setPendientes((actuales) =>
        actuales.map((p) =>
          p.claveLocal === claveLocal ? { ...p, estado } : p,
        ),
      );
    },
    [],
  );

  const despachar = useCallback(
    async (pendiente: MensajePendiente) => {
      try {
        const { mensaje } = await enviarMensaje(
          conversacionId,
          await aCuerpo(conversacionId, pendiente.borrador),
        );

        /**
         * El pendiente se saca ANTES de anunciar el confirmado: al revés, la
         * lista mostraría por un frame la burbuja optimista y la real a la vez.
         */
        setPendientes((actuales) =>
          actuales.filter((p) => p.claveLocal !== pendiente.claveLocal),
        );
        confirmar.current(mensaje);
      } catch {
        /**
         * El pendiente NO se descarta: US-MSG-03 pide que quede en pantalla con
         * "No se pudo enviar" y que el usuario pueda reintentar tocándolo. Un
         * mensaje que desaparece al fallar es un mensaje perdido sin aviso.
         */
        marcar(pendiente.claveLocal, 'ERROR');
      }
    },
    [conversacionId, marcar],
  );

  const enviar = useCallback(
    (borrador: Borrador) => {
      const pendiente: MensajePendiente = {
        claveLocal: siguienteClave(),
        borrador,
        estado: 'ENVIANDO',
        fechaEnvio: new Date().toISOString(),
      };

      setPendientes((actuales) => [...actuales, pendiente]);
      void despachar(pendiente);
    },
    [despachar],
  );

  /** US-MSG-03 · "al tocar el ícono, reintente el envío automáticamente". */
  const reintentar = useCallback(
    (claveLocal: string) => {
      setPendientes((actuales) => {
        const pendiente = actuales.find((p) => p.claveLocal === claveLocal);
        if (pendiente?.estado === 'ERROR') {
          void despachar({ ...pendiente, estado: 'ENVIANDO' });
        }
        return actuales.map((p) =>
          p.claveLocal === claveLocal ? { ...p, estado: 'ENVIANDO' } : p,
        );
      });
    },
    [despachar],
  );

  return { pendientes, enviar, reintentar };
}
