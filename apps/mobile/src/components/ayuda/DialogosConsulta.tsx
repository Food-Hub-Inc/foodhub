import { DialogoExito } from '../ui/DialogoExito';
import { DialogoSevero } from '../ui/DialogoSevero';
import { router } from 'expo-router';
import { MENSAJES_AYUDA } from '@foodhub/shared';

/**
 * Dialogos de la pantalla "Contactar al soporte" (US-AYU-03).
 *
 * Un unico componente agrupa los tres: confirmacion de envio, exito y
 * error de red. El padre (`Contacto.tsx`) controla cual esta abierto via
 * la prop `dialogo` y aporta los handlers de cada accion.
 *
 * El dialogo de "borrador guardado" se elimino: el borrador se carga
 * automaticamente al entrar y hay un boton "Limpiar" para empezar de
 * cero, asi que no hace falta preguntarle nada al usuario.
 */
export function DialogosConsulta({
  dialogo,
  cerrar,
  correo,
  enviarConsulta,
  enviando,
  onConfirmarError,
}: {
  dialogo: null | 'confirmar' | 'exito' | 'error';
  cerrar: () => void;
  correo: string;
  enviarConsulta: () => void;
  enviando: boolean;
  onConfirmarError: () => void;
}) {
  return (
    <>
      <DialogoSevero
        abierto={dialogo === 'confirmar'}
        mensaje={MENSAJES_AYUDA.consulta.confirmarEnvioTitulo}
        onCancelar={cerrar}
        onConfirmar={enviarConsulta}
        procesando={enviando}
        textoCancelar={MENSAJES_AYUDA.consulta.confirmarEnvioBotonNo}
        textoConfirmar={MENSAJES_AYUDA.consulta.confirmarEnvioBotonSi}
        titulo={MENSAJES_AYUDA.consulta.confirmarEnvioTitulo}
      />

      <DialogoExito
        abierto={dialogo === 'exito'}
        mensaje={MENSAJES_AYUDA.consulta.envioExitoso(correo)}
        onCerrar={() => {
          cerrar();
          router.back();
        }}
        textoBoton="Aceptar"
      />

      <DialogoSevero
        abierto={dialogo === 'error'}
        mensaje={MENSAJES_AYUDA.consulta.errorEnvio}
        onCancelar={cerrar}
        onConfirmar={onConfirmarError}
        textoCancelar={MENSAJES_AYUDA.consulta.errorEnvioBotonBorrador}
        textoConfirmar={MENSAJES_AYUDA.consulta.errorEnvioBotonReintentar}
        titulo={MENSAJES_AYUDA.consulta.errorEnvio}
      />
    </>
  );
}
