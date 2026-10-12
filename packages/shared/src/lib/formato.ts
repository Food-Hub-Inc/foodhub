/**
 * Utilidades de formato compartidas entre la API, la app movil y el panel.
 *
 * Viven en `@foodhub/shared` -y no en el modulo `lib/formato` de cada app-
 * cuando el texto que producen esta comprometido por un criterio de aceptacion
 * Y lo arma el servidor: la notificacion de US-NOT-06 se redacta en la API, se
 * verifica letra por letra en la Etapa 6 y tiene que decir exactamente lo mismo
 * que veria la app. El formateo de cada app es para pantallas cuyo texto NO
 * esta comprometido, y por eso puede diferir (ver la nota de
 * `formatearPrecioArs`).
 */

/**
 * Se construye una vez a nivel de modulo: `Intl.NumberFormat` es caro de
 * instanciar. Mismo criterio que el modulo de formato de la app movil.
 */
const formatoNumeroArs = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Precio en pesos argentinos: separador de miles con punto, decimales con
 * coma, y el signo pegado al numero.
 *
 *   "1500.00" -> "$1.500,00"   ·   "150.5" -> "$150,50"
 *
 * NO usa `style: 'currency'` de `Intl` a proposito: ese modo intercala un
 * espacio fino despues del signo (`"$ 1.500,00"`), y el criterio de US-NOT-06
 * escribe el precio como `$[Precio]`, sin separacion. El formateo de precios de
 * cada app si usa el modo `currency` porque ahi el texto no esta comprometido
 * con ninguna prueba.
 *
 * `precio` llega como string porque la columna `numeric` de PostgreSQL se
 * serializa asi (ver `precioSchema`): se convierte a numero aca, no en el
 * contrato.
 */
export function formatearPrecioArs(precio: string | number): string {
  return `$${formatoNumeroArs.format(Number(precio))}`;
}

/**
 * Recorta un texto para que ocupe `maximo` caracteres COMO MAXIMO, agregando
 * el caracter de puntos suspensivos (U+2026) solo cuando efectivamente sobro
 * algo.
 *
 * El resultado nunca supera `maximo`: si hay que recortar, se corta a
 * `maximo - 1` y los puntos suspensivos ocupan el ultimo lugar. Lo usan las
 * notificaciones de chat (US-NOT-02) y de resena (US-NOT-05), cuyos criterios
 * fijan "truncado a 80 caracteres si supera ese limite".
 */
export function truncarTexto(texto: string, maximo: number): string {
  if (texto.length <= maximo) return texto;
  return `${texto.slice(0, Math.max(0, maximo - 1))}…`;
}
