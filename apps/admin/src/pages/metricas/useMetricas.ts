import { useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  agruparSerieDePedidos,
  PERIODO_METRICAS_POR_DEFECTO,
} from '@foodhub/shared';
import { CLAVE_METRICAS, obtenerMetricas } from '../../api/metricas.js';
import { TEXTOS_METRICAS } from '../../lib/textos.js';
import { resolverRango, type SeleccionDePeriodo } from './periodo.js';

/**
 * Estado de PAN-ADM-03: el período elegido, su rango y la consulta.
 *
 * La clave de caché lleva las FECHAS de la selección y no el rango calculado:
 * "Mes" termina "ahora", y un `Date` nuevo por render haría una consulta nueva
 * por render.
 */
export function useMetricas(
  seleccionInicial: SeleccionDePeriodo = {
    periodo: PERIODO_METRICAS_POR_DEFECTO,
    desde: '',
    hasta: '',
  },
) {
  const [seleccion, setSeleccion] = useState(seleccionInicial);
  const rango = useMemo(() => resolverRango(seleccion), [seleccion]);

  const consulta = useQuery({
    queryKey: [...CLAVE_METRICAS, seleccion],
    queryFn: () => {
      if (!rango.valido) throw new Error('rango inválido');
      return obtenerMetricas(rango);
    },
    enabled: rango.valido,
    // Cambiar de período no vacía la pantalla: quedan los números anteriores
    // hasta que llegan los nuevos.
    placeholderData: keepPreviousData,
  });

  const tramos = useMemo(
    () =>
      consulta.data && rango.valido
        ? agruparSerieDePedidos(
            consulta.data.serie,
            seleccion.periodo,
            rango.desde,
            rango.hasta,
          )
        : [],
    [consulta.data, rango, seleccion.periodo],
  );

  return {
    seleccion,
    setSeleccion,
    rango,
    consulta,
    tramos,
    actualizado: useHaceCuanto(consulta.dataUpdatedAt),
  };
}

/**
 * "Última actualización: hace 5 min" del mockup. Se recalcula cada medio
 * minuto para que el texto no quede congelado mientras la pantalla está
 * abierta.
 */
function useHaceCuanto(instante: number): string {
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    const intervalo = window.setInterval(() => {
      setAhora(Date.now());
    }, 30_000);
    return () => {
      window.clearInterval(intervalo);
    };
  }, []);

  if (instante === 0) return '';
  const minutos = Math.floor(Math.max(ahora - instante, 0) / 60_000);
  return minutos < 1
    ? TEXTOS_METRICAS.recienActualizado
    : TEXTOS_METRICAS.haceMinutos(minutos);
}
