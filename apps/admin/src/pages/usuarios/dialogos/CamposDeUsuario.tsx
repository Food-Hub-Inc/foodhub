import { TEXTOS_FORMULARIO } from '../../../lib/textos.js';
import { CampoDeTexto } from './CampoDeTexto.js';
import type { ErroresPorCampo } from './errores.js';

/**
 * Nombre y apellido, la pareja de campos que comparten el alta y la edición de
 * una cuenta (US-GURP-06 y US-GURP-07).
 *
 * Van en la misma fila porque son dos mitades del mismo dato y así los muestra
 * la maquetación; en pantallas angostas la grilla los apila sola.
 */
export function CamposDeNombre({
  nombre,
  apellido,
  errores,
  alCambiarNombre,
  alCambiarApellido,
}: {
  nombre: string;
  apellido: string;
  errores: ErroresPorCampo<'nombre' | 'apellido'>;
  alCambiarNombre: (valor: string) => void;
  alCambiarApellido: (valor: string) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <CampoDeTexto
        alCambiar={alCambiarNombre}
        autoFocus
        error={errores.nombre}
        etiqueta={TEXTOS_FORMULARIO.nombre}
        valor={nombre}
      />
      <CampoDeTexto
        alCambiar={alCambiarApellido}
        error={errores.apellido}
        etiqueta={TEXTOS_FORMULARIO.apellido}
        valor={apellido}
      />
    </div>
  );
}

/**
 * Correo en modo lectura, para la edición desde el panel.
 *
 * NO es editable: es la identidad de la cuenta en Supabase Auth y cambiarlo
 * exige un flujo de verificación propio que la documentación no define. Se
 * muestra igual para que el administrador vea de quién es la cuenta que está
 * tocando.
 */
export function CorreoNoEditable({ correo }: { correo: string }) {
  return (
    <CampoDeTexto
      alCambiar={() => {
        /* Sin efecto: el campo está deshabilitado. */
      }}
      deshabilitado
      etiqueta={TEXTOS_FORMULARIO.correo}
      tipo="email"
      valor={correo}
    />
  );
}
