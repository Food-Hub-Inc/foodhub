import { Navigate, Route, Routes } from 'react-router-dom';
import { RutaProtegida } from './components/RutaProtegida.js';
import { LayoutPanel } from './components/layout/LayoutPanel.js';
import { Auditoria } from './pages/auditoria/Auditoria.js';
import { Login } from './pages/Login.js';
import { Proximamente } from './pages/Proximamente.js';
import { Usuarios } from './pages/usuarios/Usuarios.js';

/**
 * Ruteo del panel de administración.
 *
 * `/login` es la única ruta pública. Todo el resto vive detrás de
 * `RutaProtegida`, que exige sesión iniciada Y rol `ADMINISTRADOR`
 * (US-GURP-10): el panel completo es una herramienta de administración.
 *
 * Estado de la Etapa 6:
 *
 *   /login          PAN-AUT-03 · ingreso del administrador       implementada
 *   /usuarios       PAN-ADM-01 · gestión de cuentas              implementada
 *   /auditoria      PAN-AUD-01 · auditoría y seguridad           implementada
 *   /               inicio del panel                             por codificar
 *   /moderacion     PAN-ADM-02 · moderación de contenido         por codificar
 *   /metricas       PAN-ADM-03 · métricas generales              por codificar
 *   /configuracion  PAN-ADM-04 · configuración del sistema       por codificar
 */
export function App() {
  return (
    <Routes>
      <Route element={<Login />} path="/login" />

      <Route
        element={
          <RutaProtegida>
            <LayoutPanel />
          </RutaProtegida>
        }
      >
        <Route element={<Inicio />} index />
        <Route element={<Usuarios />} path="usuarios" />
        <Route element={<Moderacion />} path="moderacion" />
        <Route element={<Metricas />} path="metricas" />
        <Route element={<Auditoria />} path="auditoria" />
        <Route element={<Configuracion />} path="configuracion" />
      </Route>

      {/* Una dirección inventada no muestra un error: lleva al inicio del
          panel, que es de donde el administrador puede seguir trabajando. */}
      <Route element={<Navigate replace to="/" />} path="*" />
    </Routes>
  );
}

/**
 * El inicio del panel no tiene código de pantalla propio en el inventario de la
 * Etapa 5: las cuatro pantallas del administrador son PAN-ADM-01 a PAN-ADM-04
 * más PAN-AUD-01. Su contenido previsto —el resumen de la operación— es el de
 * PAN-ADM-03 (REP-02), así que se declara sin código y se remite a esa
 * pantalla.
 */
function Inicio() {
  return (
    <Proximamente
      historias="US-ADM-05"
      modulo="ADM · Panel de administración"
      pantalla={null}
      titulo="Inicio"
    />
  );
}

function Moderacion() {
  return (
    <Proximamente
      historias="US-ADM-04"
      modulo="ADM · Panel de administración"
      pantalla="PAN-ADM-02"
      titulo="Moderación de contenido"
    />
  );
}

function Metricas() {
  return (
    <Proximamente
      historias="US-ADM-05 · REP-02"
      modulo="ADM · Panel de administración"
      pantalla="PAN-ADM-03"
      titulo="Métricas generales"
    />
  );
}

function Configuracion() {
  return (
    <Proximamente
      historias="US-CFG-01 a US-CFG-04"
      modulo="CFG · Configuración y parámetros"
      pantalla="PAN-ADM-04"
      titulo="Configuración del sistema"
    />
  );
}
