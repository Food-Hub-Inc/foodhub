/**
 * Formato legible de un tamano en bytes.
 *
 * Convierte 5242880 → "5 MB", 1024 → "1 KB", 0 → "0 B". Es la misma idea que
 * `Intl.NumberFormat` con `unit: 'bytes'`, pero esa API de RN no siempre
 * esta disponible en versiones viejas de Hermes: preferimos el calculo
 * manual a un polyfill condicional.
 *
 * La unidad maxima es MB: FoodHub no maneja archivos de GB (la subida
 * maxima son 5 MB por el criterio de US-AYU-03), asi que el redondeo a
 * una sola cifra decimal es suficiente.
 */
export function formatearTamano(bytes: number): string {
  if (bytes < 1024) return `${String(bytes)} B`;
  if (bytes < 1024 * 1024) {
    const kb = bytes / 1024;
    return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  }
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
}
