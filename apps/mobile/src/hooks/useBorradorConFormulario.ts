import { useEffect } from 'react';
import type { useBorradorDeConsulta } from './useBorradorDeConsulta';

/**
 * Sincroniza el formulario de "Contactar al soporte" con el borrador
 * persistido (US-AYU-03, noveno criterio).
 *
 * Alcance de este hook:
 *
 *   1. Al cargar el borrador, copia sus valores al state del form
 *      (auto-carga sin preguntar).
 *   2. En cada cambio, persiste el state en AsyncStorage.
 *
 * La carga del borrador es AUTOMATICA: el formulario se hidrata con lo
 * guardado al entrar, sin dialogo de confirmacion. Si el usuario quiso
 * empezar de cero, usa el boton "Limpiar" (ver `FlujoDeEnvio`), que
 * reinicia el formulario, vacia los adjuntos y descarta el borrador.
 *
 * Las dependencias de los `useEffect` son las referencias ESTABLES
 * (`set` de `useState`, `borrador.guardar` y los primitivos
 * `borrador.cargado`/`borrador.hayBorrador`). Si se dependiera del
 * objeto `borrador` completo o de un `fijar` construidos inline, cada
 * render los recrearia y el efecto correria en bucle infinito.
 */
export function useBorradorConFormulario({
  borrador,
  tipoConsultaId,
  asunto,
  descripcion,
  fijarTipoConsultaId,
  fijarAsunto,
  fijarDescripcion,
}: {
  borrador: ReturnType<typeof useBorradorDeConsulta>;
  tipoConsultaId: string | null;
  asunto: string;
  descripcion: string;
  fijarTipoConsultaId: (v: string) => void;
  fijarAsunto: (v: string) => void;
  fijarDescripcion: (v: string) => void;
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
}
