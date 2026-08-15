import { Outlet } from 'react-router-dom';
import { Toast } from '@heroui/react';
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
      <BarraLateral
        /**
         * El módulo de moderación (PAN-ADM-02) todavía no se codificó y el
         * contrato de la API no expone un contador de reportes pendientes. Se
         * pasa `null` para que la insignia no aparezca: mostrar un cero o un
         * número de ejemplo sería inventar información en la herramienta cuyo
         * propósito es justamente ser fuente confiable.
         */
        reportesPendientes={null}
      />

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>

      <Toast.Provider placement="bottom end" />
    </div>
  );
}
