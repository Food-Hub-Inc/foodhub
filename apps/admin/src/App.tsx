import { Navigate, Route, Routes } from 'react-router-dom';
import { RutaProtegida } from './components/RutaProtegida.js';
import { LayoutPanel } from './components/layout/LayoutPanel.js';
import { RUTAS } from './lib/rutas.js';
import { Auditoria } from './pages/auditoria/Auditoria.js';
import { Avisos } from './pages/avisos/Avisos.js';
import { Ayuda } from './pages/ayuda/Ayuda.js';
import { PaginaDeCapitulo } from './pages/ayuda/manual/PaginaDeCapitulo.js';
import { Configuracion } from './pages/configuracion/Configuracion.js';
import { Login } from './pages/Login.js';
import { NuevaPassword } from './pages/NuevaPassword.js';
import { Inicio } from './pages/Inicio.js';
import { Metricas } from './pages/metricas/Metricas.js';
import { Moderacion } from './pages/moderacion/Moderacion.js';
import { Recuperar } from './pages/Recuperar.js';
import { Usuarios } from './pages/usuarios/Usuarios.js';

/**
 * Ruteo del panel de administración.
 *
 * Hay exactamente tres rutas públicas, y las tres por el mismo motivo: quien las
 * abre todavía no puede acreditar que es administrador. `/login` porque no tiene
 * sesión, `/recuperar` porque justamente no puede iniciarla, y
 * `/nueva-password` porque llega desde el correo con una sesión que abrió GoTrue
 * pero sin contraseña propia. Todo el resto vive detrás de `RutaProtegida`, que
 * exige sesión iniciada Y rol `ADMINISTRADOR` (US-GURP-10).
 *
 * Estado de la Etapa 6:
 *
 *   /login           PAN-AUT-03 · ingreso del administrador       implementada
 *   /recuperar       US-AUT-04 · pedido del enlace                implementada
 *   /nueva-password  definición de contraseña (invitación         implementada
 *                    y recuperación)
 *   /usuarios        PAN-ADM-01 · gestión de cuentas              implementada
 *   /auditoria       PAN-AUD-01 · auditoría y seguridad           implementada
 *   /                inicio del panel (sin código PAN)            implementada
 *   /moderacion      PAN-ADM-02 · moderación de contenido         implementada
 *                    (publicaciones US-ADM-04 y reseñas RF086)
 *   /avisos          US-NOT-04 · avisos generales (sin código PAN) implementada
 *   /metricas        PAN-ADM-03 · métricas generales + REP-02     implementada
 *   /ayuda           US-AYU-05 · gestión del manual y las FAQ     implementada
 *   /configuracion   PAN-ADM-04 · configuración del sistema       implementada
 *                    (categorías, motivos, parámetros, términos)
 */
export function App() {
  return (
    <Routes>
      <Route element={<Login />} path={RUTAS.login} />
      <Route element={<Recuperar />} path={RUTAS.recuperar} />
      <Route element={<NuevaPassword />} path={RUTAS.nuevaPassword} />

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
        <Route element={<Avisos />} path="avisos" />
        <Route element={<Metricas />} path="metricas" />
        <Route element={<Auditoria />} path="auditoria" />
        <Route element={<Ayuda />} path="ayuda" />
        <Route element={<PaginaDeCapitulo />} path="ayuda/capitulos/nuevo" />
        <Route
          element={<PaginaDeCapitulo />}
          path="ayuda/capitulos/:id/editar"
        />
        <Route element={<Configuracion />} path="configuracion" />
      </Route>

      {/* Una dirección inventada no muestra un error: lleva al inicio del
          panel, que es de donde el administrador puede seguir trabajando. */}
      <Route element={<Navigate replace to={RUTAS.inicio} />} path="*" />
    </Routes>
  );
}
