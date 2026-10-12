import { Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Toast } from '@heroui/react';
import { obtenerReportesPendientes } from '../../api/moderacion.js';
import { BarraLateral } from './BarraLateral.js';

/**
 * Estructura del panel: barra lateral fija a la izquierda y área de contenido
 * scrolleable a la derecha.
 *
 * El scroll vive en el `<main>` y no en el `<body>` para que la barra lateral y
 * el encabezado de cada pantalla queden quietos mientras se recorre una tabla
 * de ochocientas filas.
 *
 * `Toast.Provider` se monta una sola vez acá: es la región donde aparecen las
 * confirmaciones de las operaciones sobre usuarios (US-GURP-06 a US-GURP-09).
 * React Aria la expone como una live region, así que un lector de pantalla
 * anuncia "La cuenta quedó suspendida" sin que el foco se mueva.
 */
export function LayoutPanel() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <BarraLateral reportesPendientes={useReportesPendientes()} />

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>

      <Toast.Provider placement="bottom end" />
    </div>
  );
}

/**
 * Contador de la insignia de Moderación: reseñas reportadas pendientes
 * (RF086), el `total` que ya devuelve la bandeja. Se pide UNA fila porque solo
 * interesa el total.
 *
 * Cuelga de `['moderacion', ...]`, así que resolver un reporte lo invalida
 * junto con la bandeja. Mientras no hay respuesta —o si falla— vale `null` y la
 * insignia no aparece: un cero inventado es peor que no mostrar nada.
 */
function useReportesPendientes(): number | null {
  const consulta = useQuery({
    queryKey: ['moderacion', 'reportes', 'contador'],
    queryFn: () => obtenerReportesPendientes({ pagina: 1, porPagina: 1 }),
  });
  return consulta.data?.total ?? null;
}
