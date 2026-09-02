import { useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { marcarPresencia } from '../api/notificaciones';

/**
 * US-NOT-02 · Mientras la pantalla de una conversación está enfocada, le avisa
 * a la API qué chat mira el usuario, para que un mensaje nuevo de ESE hilo no
 * genere push (el mensaje ya le aparece en pantalla por Realtime).
 *
 * La API guarda la presencia con un TTL de ~40 s, así que se renueva cada 30 s.
 * Al salir de la pantalla se manda `null`. Un fallo no se reintenta ni se
 * muestra: el peor caso es un push de más, nunca un mensaje perdido.
 */
const RENOVACION_MS = 30_000;

export function usePresenciaDeChat(conversacionId: string): void {
  const intervalo = useRef<ReturnType<typeof setInterval> | null>(null);

  useFocusEffect(
    useCallback(() => {
      const avisar = (id: string | null) => {
        void marcarPresencia(id).catch(() => undefined);
      };

      avisar(conversacionId);
      intervalo.current = setInterval(() => {
        avisar(conversacionId);
      }, RENOVACION_MS);

      return () => {
        if (intervalo.current) clearInterval(intervalo.current);
        intervalo.current = null;
        avisar(null);
      };
    }, [conversacionId]),
  );
}
