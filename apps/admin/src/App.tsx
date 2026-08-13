import { Route, Routes } from 'react-router-dom';

/**
 * Raíz del panel de administración.
 *
 * Scaffold inicial de la Etapa 6: define la estructura de ruteo sobre la que
 * se montan las pantallas del Módulo de panel de administración
 * (alcance 2.2.2.2.3) a medida que avanza la codificación.
 *
 * Rutas previstas:
 *   /login              PAN-AUT-03 (ingreso del administrador)
 *   /usuarios           listado y gestión de cuentas          US-GURP-05..09
 *   /publicaciones      moderación de publicaciones           US-ADM-04
 *   /pedidos            métricas de pedidos por estado        US-ADM-05
 *   /auditoria          registros de auditoría y seguridad    US-AUD-01/02
 *   /configuracion      ABM de parámetros del sistema         US-CFG-01..04
 */
export function App() {
  return (
    <Routes>
      <Route path="/" element={<Inicio />} />
    </Routes>
  );
}

function Inicio() {
  return (
    <main className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-3xl rounded-lg border border-border bg-surface p-8">
        <h1 className="text-h1 font-extrabold text-text-primary">
          FoodHub · Panel de administración
        </h1>
        <p className="mt-2 text-body text-text-secondary">
          Scaffold inicial · Etapa 6 — Desarrollo e Implementación
        </p>

        <div className="mt-6 rounded-md border border-border bg-background p-4">
          <p className="text-body text-text-secondary">
            El entorno está configurado. Las pantallas del panel se incorporan
            en los sprints de la Etapa 6, siguiendo la maquetación aprobada en
            la Etapa 5.
          </p>
        </div>
      </div>
    </main>
  );
}
