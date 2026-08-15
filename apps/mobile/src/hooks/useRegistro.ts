import { useState } from 'react';
import type { PerfilUsuario } from '@foodhub/shared';
import { iniciarSesion } from '../api/auth';
import { esErrorApi, mensajeDeError } from '../lib/api';

/**
 * El envío de PAN-AUT-01 y PAN-AUT-02 — US-AUT-01 y US-AUT-02.
 *
 * SON DOS PASOS Y NO UNO. El alta la resuelve la API, que crea la cuenta de
 * GoTrue y la fila de `usuario` en una sola operación; recién después la app
 * inicia sesión con las mismas credenciales que el usuario acaba de tipear.
 * Ese segundo paso no es opcional: el quinto criterio de aceptación de las dos
 * historias pide que el registro "inicie sesión automáticamente".
 *
 * No hay `router.push` al terminar. Cuando Supabase abre la sesión,
 * `GateDeSesion` consulta el perfil y manda al cliente al feed y al cocinero a
 * sus publicaciones. Navegar también desde acá produciría dos redirecciones
 * encimadas.
 *
 * EL CORREO DUPLICADO SE MUESTRA DEBAJO DEL CAMPO, no como error general: es el
 * único dato que el usuario tiene que corregir, y un cartel arriba de un
 * formulario largo lo obliga a buscar cuál de los siete campos falló. Los
 * literales son distintos para cliente y cocinero —así los fija la
 * documentación— y los manda el servidor, así que la app no los replica.
 */
export function useRegistro<TDatos extends { email: string; password: string }>(
  registrar: (datos: TDatos) => Promise<PerfilUsuario>,
) {
  const [enviando, setEnviando] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [errorCorreo, setErrorCorreo] = useState<string | undefined>(undefined);

  async function enviar(datos: TDatos): Promise<void> {
    setErrorGeneral(null);
    setErrorCorreo(undefined);
    setEnviando(true);

    try {
      await registrar(datos);
      await iniciarSesion(datos.email, datos.password);
    } catch (fallo) {
      if (esErrorApi(fallo) && fallo.codigo === 'CORREO_DUPLICADO') {
        setErrorCorreo(fallo.message);
      } else {
        setErrorGeneral(mensajeDeError(fallo));
      }
    } finally {
      setEnviando(false);
    }
  }

  return { enviando, errorGeneral, errorCorreo, enviar };
}
