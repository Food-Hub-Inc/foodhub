import { useCallback, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { QueryKey } from '@tanstack/react-query';
import { useValorDebounced } from './useValorDebounced.js';

/** Lo mínimo que toda tabla paginada del módulo de auditoría necesita saber. */
interface FiltrosPaginados {
  pagina: number;
  porPagina: number;
}

/** Envoltorio de las respuestas paginadas del contrato. */
interface Pagina<T> {
  datos: T[];
  total: number;
  pagina: number;
  porPagina: number;
}

/**
 * Estado y consulta de una de las dos solapas de PAN-AUD-01.
 *
 * Las dos se comportan igual —filtros en tiempo real, orden fijo por fecha
 * descendente, paginación que conserva los filtros— y solo cambian las
 * columnas y el endpoint. Se resuelve una vez.
 *
 * DOS DECISIONES QUE VAN JUNTAS
 *
 * 1. Se difiere el objeto de filtros COMPLETO, no cada campo por separado. Es
 *    lo único que hace falta: cambiar de página o de desplegable también pasa
 *    por el retraso, pero nadie lo percibe gracias al punto 2.
 * 2. `keepPreviousData` deja la tabla anterior en pantalla mientras llega la
 *    nueva. Sin eso, cada tecla del filtro de IP reemplazaría la tabla por un
 *    esqueleto y la pantalla parpadearía sin parar.
 */
export function useTablaDeAuditoria<F extends FiltrosPaginados, T>({
  filtrosIniciales,
  clave,
  consultar,
}: {
  filtrosIniciales: F;
  clave: (filtros: F) => QueryKey;
  consultar: (filtros: F) => Promise<Pagina<T>>;
}) {
  const [filtros, setFiltros] = useState<F>(filtrosIniciales);
  const filtrosDiferidos = useValorDebounced(filtros);

  const consulta = useQuery({
    queryKey: clave(filtrosDiferidos),
    queryFn: () => consultar(filtrosDiferidos),
    placeholderData: keepPreviousData,
  });

  /**
   * Cambiar un filtro vuelve siempre a la primera página. Quedarse en la 7
   * después de acotar la búsqueda a tres resultados muestra una tabla vacía que
   * parece un error del sistema.
   */
  const aplicar = useCallback((cambio: Partial<F>) => {
    setFiltros((previo) => ({ ...previo, ...cambio, pagina: 1 }));
  }, []);

  const irAPagina = useCallback((pagina: number) => {
    setFiltros((previo) => ({ ...previo, pagina }));
  }, []);

  const limpiar = useCallback(() => {
    setFiltros(filtrosIniciales);
    // `filtrosIniciales` es una constante de módulo en las dos solapas: no
    // cambia entre renders y la dependencia no reinstancia nada.
  }, [filtrosIniciales]);

  return {
    /** Valores que se muestran en los controles: siempre al día. */
    filtros,
    /** Valores con los que se consultó: pueden ir un instante atrás. */
    filtrosDiferidos,
    consulta,
    aplicar,
    irAPagina,
    limpiar,
  };
}
