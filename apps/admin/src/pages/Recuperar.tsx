import { useState, type FormEvent } from 'react';
import { solicitarRecuperacionSchema } from '@foodhub/shared';
import { solicitarRecuperacion } from '../api/auth.js';
import { MarcoDeAcceso } from '../components/MarcoDeAcceso.js';
import { mensajeDeError } from '../lib/api.js';
import { TEXTOS_RECUPERAR } from '../lib/textos.js';
import { FormularioDeRecuperacion } from './recuperar/FormularioDeRecuperacion.js';

/**
 * Recuperación de contraseña del administrador — US-AUT-04, adaptada al panel.
 *
 * POR QUÉ ESTA PANTALLA EXISTE
 * ---------------------------------------------------------------------------
 * US-AUT-04 tiene como actor al cliente y al cocinero, y se resuelve en
 * PAN-AUT-04, que es una pantalla de la app móvil. El administrador quedaba
 * afuera: el alcance del proyecto le da como única interfaz el panel web —"un
 * panel web destinado exclusivamente a las tareas de administración"— y ahí no
 * había ningún camino para recuperar la contraseña. Si la olvidaba, quedaba
 * fuera del sistema sin más salida que tocar la base a mano.
 *
 * Es la misma decisión de equipo que ya se tomó para la invitación del
 * administrador, y se resuelve con el mismo mecanismo: la API elige el destino
 * del enlace según el rol de la cuenta (`DESTINO_RECUPERACION` en
 * `auth.service.ts`), sin que el cliente tenga que saber nada de eso.
 *
 * Es pública por el mismo motivo que `/nueva-password`: quien la abre no puede
 * acreditar que es administrador, justamente porque no puede iniciar sesión.
 */
export function Recuperar() {
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [errorDeCampo, setErrorDeCampo] = useState<string | undefined>();
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [resultado, setResultado] = useState<string | null>(null);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    const validacion = solicitarRecuperacionSchema.safeParse({ email });
    if (!validacion.success) {
      setErrorDeCampo(validacion.error.issues[0]?.message);
      return;
    }

    setErrorDeCampo(undefined);
    setErrorGeneral(null);
    setResultado(null);
    setEnviando(true);

    try {
      const respuesta = await solicitarRecuperacion(validacion.data);
      setResultado(respuesta.mensaje);
    } catch (error) {
      // Incluye el 404 de correo no registrado, cuyo literal exige US-AUT-04.
      setErrorGeneral(mensajeDeError(error));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <MarcoDeAcceso
      descripcion={TEXTOS_RECUPERAR.descripcion}
      titulo={TEXTOS_RECUPERAR.titulo}
    >
      <FormularioDeRecuperacion
        alCambiarCorreo={setEmail}
        alEnviar={(evento) => void enviar(evento)}
        correo={email}
        enviando={enviando}
        error={errorGeneral}
        errorDeCampo={errorDeCampo}
        resultado={resultado}
      />
    </MarcoDeAcceso>
  );
}
