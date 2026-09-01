import { DialogoExito } from '../ui/DialogoExito';
import { DialogoSevero } from '../ui/DialogoSevero';
import { router } from 'expo-router';
import { MENSAJES_AYUDA } from '@foodhub/shared';
import type { useBorradorDeConsulta } from '../../hooks/useBorradorDeConsulta';
import type { useSelectorDeAdjuntos } from '../../hooks/useSelectorDeAdjuntos';

/**
 * Dialogos de la pantalla "Contactar al soporte" (US-AYU-03).
 *
 * Un unico componente agrupa los cuatro: confirmacion de envio,
 * exito, error de red y pregunta sobre el borrador guardado. El
 * padre (`Contacto.tsx`) controla cual esta abierto via la prop
 * `dialogo` y aporta los handlers de cada accion.
 */
export function DialogosConsulta({
  dialogo,
  cerrar,
  correo,
  enviarConsulta,
  enviando,
  onConfirmarError,
  reiniciarFormulario,
  borrador,
  selector,
}: {
  dialogo: null | 'borrador' | 'confirmar' | 'exito' | 'error';
  cerrar: () => void;
  correo: string;
  enviarConsulta: () => void;
  enviando: boolean;
  onConfirmarError: () => void;
  reiniciarFormulario: () => void;
  borrador: ReturnType<typeof useBorradorDeConsulta>;
  selector: ReturnType<typeof useSelectorDeAdjuntos>;
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

      <DialogoSevero
        abierto={dialogo === 'borrador'}
        onCancelar={cerrar}
        onConfirmar={async () => {
          cerrar();
          await borrador.descartar();
          selector.acciones.limpiar();
          reiniciarFormulario();
        }}
        textoCancelar={MENSAJES_AYUDA.consulta.borradorBotonContinuar}
        textoConfirmar={MENSAJES_AYUDA.consulta.borradorBotonNuevo}
        titulo={MENSAJES_AYUDA.consulta.borradorTitulo}
      />
    </>
  );
}
