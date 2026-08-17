import { useState } from 'react';
import type { PerfilUsuario } from '@foodhub/shared';
import {
  abrirSesionProvisoria,
  adoptarSesion,
  type SesionProvisoria,
} from '../api/auth';
import { editarMiPerfil } from '../api/perfil';
import { esErrorApi, mensajeDeError } from '../lib/api';
import { subirFotoDePerfil } from '../lib/subirFotoDePerfil';
import { TEXTOS_REGISTRO } from '../lib/textos';
import type { FotoElegida } from '../components/ui/SelectorDeFoto';

/**
 * El envío de PAN-AUT-01 y PAN-AUT-02 — US-AUT-01 y US-AUT-02.
 *
 * SON CUATRO PASOS Y NINGUNO SE PUEDE ADELANTAR:
 *
 *   1. la API crea la cuenta de GoTrue y la fila de `usuario` en una sola
 *      operación;
 *   2. la app autentica con las mismas credenciales que el usuario tipeó, pero
 *      SIN abrir todavía la sesión de la aplicación;
 *   3. con ese token sube la foto de perfil a Supabase Storage y la guarda en
 *      el perfil;
 *   4. recién ahí adopta la sesión, y el quinto criterio de aceptación de las
 *      dos historias —"inicie sesión automáticamente"— queda cumplido.
 *
 * POR QUÉ LA FOTO NO VIAJA EN EL ALTA. El endpoint que firma la URL de carga
 * exige sesión, y cuando el usuario toca "Registrarme" todavía no hay cuenta ni
 * token. La alternativa —un endpoint público que firme antes del alta— dejaría
 * escribir en el bucket a cualquiera sin cuenta.
 *
 * POR QUÉ LA SESIÓN SE ABRE AL FINAL. Apenas Supabase abre la sesión,
 * `GateDeSesion` redirige y esta pantalla desaparece. Si la subida corriera
 * después, el usuario entraría sin foto y sin manera de enterarse de que algo
 * falló, porque el feed y "Mis publicaciones" pertenecen a módulos que todavía
 * no están codificados y no tienen dónde mostrarlo.
 *
 * No hay `router.push` al terminar. Cuando la sesión se adopta, `GateDeSesion`
 * consulta el perfil y manda al cliente al feed y al cocinero a sus
 * publicaciones. Navegar también desde acá produciría dos redirecciones
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
  const [avisoDeFoto, setAvisoDeFoto] = useState<string | null>(null);
  /**
   * Sesión lista para adoptar con la cuenta YA creada. Mientras tenga valor, el
   * formulario no se puede reenviar: el alta no es idempotente y un segundo
   * intento chocaría contra su propio correo duplicado.
   */
  const [sesionPendiente, setSesionPendiente] =
    useState<SesionProvisoria | null>(null);

  /**
   * La foto es opcional en las dos historias, así que su fallo NO invalida el
   * registro: la cuenta ya existe y el usuario tiene que poder entrar. Se
   * devuelve `false` para que el llamador muestre el aviso y ofrezca continuar,
   * en lugar de propagar el error y hacer parecer que el alta falló.
   */
  async function adjuntarFoto(
    foto: FotoElegida,
    sesion: SesionProvisoria,
  ): Promise<boolean> {
    try {
      const fotoPerfilUrl = await subirFotoDePerfil(foto, sesion.accessToken);
      await editarMiPerfil({ fotoPerfilUrl }, sesion.accessToken);
      return true;
    } catch {
      return false;
    }
  }

  async function enviar(
    datos: TDatos,
    foto: FotoElegida | null,
  ): Promise<void> {
    setErrorGeneral(null);
    setErrorCorreo(undefined);
    setAvisoDeFoto(null);
    setEnviando(true);

    try {
      await registrar(datos);
      const sesion = await abrirSesionProvisoria(datos.email, datos.password);

      if (foto !== null && !(await adjuntarFoto(foto, sesion))) {
        setSesionPendiente(sesion);
        setAvisoDeFoto(TEXTOS_REGISTRO.fotoNoSubida);
        return;
      }

      await adoptarSesion(sesion);
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

  /** Entra a la app con la cuenta ya creada, después de un fallo de la foto. */
  async function continuar(): Promise<void> {
    if (sesionPendiente === null) return;

    setErrorGeneral(null);
    setEnviando(true);
    try {
      await adoptarSesion(sesionPendiente);
    } catch (fallo) {
      setErrorGeneral(mensajeDeError(fallo));
    } finally {
      setEnviando(false);
    }
  }

  return {
    enviando,
    errorGeneral,
    errorCorreo,
    avisoDeFoto,
    /** `true` cuando la cuenta ya existe y solo queda entrar. */
    cuentaCreada: sesionPendiente !== null,
    enviar,
    continuar,
  };
}
