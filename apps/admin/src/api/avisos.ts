import type { AvisoGeneralInput, ResultadoAvisoGeneral } from '@foodhub/shared';
import { api } from '../lib/api.js';

/** US-NOT-04 - Emite un aviso general y devuelve a cuántas cuentas llegó. */
export function enviarAvisoGeneral(
  aviso: AvisoGeneralInput,
): Promise<ResultadoAvisoGeneral> {
  return api.enviar<ResultadoAvisoGeneral>('/avisos', aviso);
}
