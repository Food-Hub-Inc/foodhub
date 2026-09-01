import { useEffect } from 'react';
import type { useBorradorDeConsulta } from './useBorradorDeConsulta';

/**
 * Sincroniza el formulario de "Contactar al soporte" con el borrador
 * persistido (US-AYU-03, noveno criterio).
 *
 * Concentra tres responsabilidades chiquitas en un solo hook para que
 * la pantalla quede por debajo del limite de 80 lineas de ESLint:
 *
 *   1. Al cargar el borrador, copia sus valores al state del form.
 *   2. En cada cambio, persiste el state en AsyncStorage.
 *   3. Si hay borrador, abre el dialogo de "borrador guardado".
 *
 * Las dependencias de los `useEffect` son las referencias ESTABLES
 * (`set` de `useState`, `borrador.guardar` y los primitivos
 * `borrador.cargado`/`borrador.hayBorrador`). Si se dependiera del
 * objeto `borrador` completo o de un `fijar`/`abrirDialogoBorrador`
 * construidos inline, cada render los recrearia y el efecto correria
 * en bucle infinito ("Maximum update depth exceeded").
 */
export function useBorradorConFormulario({
  borrador,
  tipoConsultaId,
  asunto,
  descripcion,
  fijarTipoConsultaId,
  fijarAsunto,
  fijarDescripcion,
  abrirDialogoBorrador,
}: {
  borrador: ReturnType<typeof useBorradorDeConsulta>;
  tipoConsultaId: string | null;
  asunto: string;
  descripcion: string;
  fijarTipoConsultaId: (v: string) => void;
  fijarAsunto: (v: string) => void;
  fijarDescripcion: (v: string) => void;
  abrirDialogoBorrador: () => void;
}) {
  // (1) Hidratar el form con el borrador cuando termina de cargar.
  //
  // `fijar*` son los `set` de `useState` (referencias estables). Al
  // escribir un valor identico al actual, React no agenda re-render y el
  // efecto converge; escribir un solo objeto `fijar` inline recrearia
  // la referencia en cada render y haria loop.
  useEffect(() => {
    if (!borrador.cargado) return;
    if (!borrador.hayBorrador) return;
    // El formulario usa `''` para "tipo sin elegir"; el borrador guarda
    // `null`. Al hidratar se normaliza para que el `fijar` reciba string.
    fijarTipoConsultaId(borrador.borrador.tipoConsultaId ?? '');
    fijarAsunto(borrador.borrador.asunto);
    fijarDescripcion(borrador.borrador.descripcion);
  }, [
    borrador.cargado,
    borrador.hayBorrador,
    borrador.borrador,
    fijarTipoConsultaId,
    fijarAsunto,
    fijarDescripcion,
  ]);

  // (2) Persistir cada cambio. El debounce vive en `useBorradorDeConsulta`;
  // aca solo dependemos de `guardar` (estable) y de los primitivos, nunca
  // del objeto `borrador` completo. Se extrae a una variable local para
  // que la dependencia declarada sea la funcion y no todo el objeto.
  const { guardar, cargado } = borrador;
  useEffect(() => {
    if (!cargado) return;
    guardar({ tipoConsultaId, asunto, descripcion });
  }, [asunto, descripcion, tipoConsultaId, cargado, guardar]);

  // (3) Mostrar el dialogo de "borrador guardado" al volver a entrar.
  useEffect(() => {
    if (borrador.cargado && borrador.hayBorrador) {
      abrirDialogoBorrador();
    }
  }, [borrador.cargado, borrador.hayBorrador, abrirDialogoBorrador]);
}
