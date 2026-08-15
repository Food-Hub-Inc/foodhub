import { useEffect, useState } from 'react';

/**
 * Retrasa la propagación de un valor hasta que deja de cambiar.
 *
 * US-AUD-02 pide filtros "en tiempo real". Aplicados literalmente, cada tecla
 * de "190.192.1.4" dispararía once consultas a la API y la tabla parpadearía
 * once veces; además el rate limiting del módulo de seguridad cortaría al
 * administrador a mitad de la búsqueda. El retraso conserva la sensación de
 * inmediatez y manda una sola consulta.
 *
 * 350 ms es el umbral habitual: por encima se percibe lentitud, por debajo se
 * escapan pulsaciones de quien escribe rápido.
 */
export function useValorDebounced<T>(valor: T, milisegundos = 350): T {
  const [valorDiferido, setValorDiferido] = useState(valor);

  useEffect(() => {
    const temporizador = setTimeout(() => {
      setValorDiferido(valor);
    }, milisegundos);

    // Cada cambio cancela el temporizador anterior: solo sobrevive el último.
    return () => {
      clearTimeout(temporizador);
    };
  }, [valor, milisegundos]);

  return valorDiferido;
}
