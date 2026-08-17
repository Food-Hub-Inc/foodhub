import { useEffect, useState } from 'react';

/**
 * Retrasa la propagación de un valor hasta que deja de cambiar.
 *
 * US-PUB-05 pide que la búsqueda filtre "a medida que se escribe". Aplicado de
 * forma literal, cada tecla de "milanesa napolitana" dispararía trece
 * consultas a la API y el listado parpadearía trece veces. El retraso
 * conserva la sensación de inmediatez y manda una sola consulta por pausa de
 * tipeo.
 *
 * Mismo hook y mismo umbral que `apps/admin/src/hooks/useValorDebounced.ts`:
 * 350 ms es donde por encima se percibe lentitud y por debajo se escapan
 * pulsaciones de quien escribe rápido.
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
