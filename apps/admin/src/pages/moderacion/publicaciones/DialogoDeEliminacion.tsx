import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Description,
  FieldError,
  Label,
  TextArea,
  TextField,
  toast,
} from '@heroui/react';
import {
  eliminarPublicacionAdminSchema,
  MENSAJES_MODERACION,
  type PublicacionAdmin,
} from '@foodhub/shared';
import {
  CLAVE_PUBLICACIONES_ADMIN,
  eliminarPublicacion,
} from '../../../api/moderacionPublicaciones.js';
import { Dialogo } from '../../../components/Dialogo.js';
import { errorGeneralDe } from '../../../hooks/useOperacionDeUsuario.js';
import { TEXTOS_MODERACION_PUBLICACIONES as TEXTOS } from '../../../lib/textos.js';
import {
  conErroresDeApi,
  erroresDeZod,
  type ErroresPorCampo,
} from '../../usuarios/dialogos/errores.js';
import { PieDeFormulario } from '../../usuarios/dialogos/PieDeFormulario.js';

/**
 * Baja por moderación — cuarto criterio de US-ADM-04: "Solicite un motivo
 * obligatorio, realice la baja de la publicación, registre la acción
 * administrativa y quite el contenido de las vistas disponibles para
 * clientes". Mismo esquema que la suspensión de US-GURP-08: el motivo se valida
 * con el schema compartido antes de ir a la red, y la API lo vuelve a validar.
 */

const CAMPOS = ['motivo'] as const;
type CampoDeEliminacion = (typeof CAMPOS)[number];

/** Tope del schema compartido, para el contador bajo el campo. */
const MAXIMO_MOTIVO = 500;

export function DialogoDeEliminacion({
  publicacion,
  alCerrar,
}: {
  publicacion: Pick<PublicacionAdmin, 'id' | 'nombre'>;
  alCerrar: () => void;
}) {
  // Se monta con `key={publicacion.id}`: el motivo arranca vacío por fila.
  const [motivo, setMotivo] = useState('');
  const [erroresLocales, setErroresLocales] = useState<
    ErroresPorCampo<CampoDeEliminacion>
  >({});

  const cliente = useQueryClient();
  const operacion = useMutation({
    mutationFn: eliminarPublicacion,
    onSuccess: () => {
      // El prefijo alcanza al listado en todas sus combinaciones y al detalle.
      void cliente.invalidateQueries({ queryKey: CLAVE_PUBLICACIONES_ADMIN });
      toast.success(MENSAJES_MODERACION.publicacionEliminada);
      alCerrar();
    },
  });

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    const validacion = eliminarPublicacionAdminSchema.safeParse({ motivo });
    if (!validacion.success) {
      setErroresLocales(erroresDeZod(validacion.error.issues, CAMPOS));
      return;
    }
    setErroresLocales({});
    operacion.mutate({ id: publicacion.id, motivo: validacion.data.motivo });
  }

  const errores = conErroresDeApi(erroresLocales, operacion.error, CAMPOS);

  return (
    <Dialogo
      abierto
      alCambiarApertura={(estaAbierto) => {
        if (!estaAbierto) alCerrar();
      }}
      alEnviar={enviar}
      error={errorGeneralDe(operacion.error)}
      pie={
        <PieDeFormulario
          alCancelar={alCerrar}
          destructivo
          enProceso={operacion.isPending}
          etiquetaConfirmar={TEXTOS.eliminar}
        />
      }
      titulo={TEXTOS.dialogoEliminarTitulo}
    >
      {/* La acción destructiva nombra qué elimina (guía de UX, principio 3). */}
      <p className="text-body font-semibold break-words text-text-primary">
        {publicacion.nombre}
      </p>
      <p className="text-body text-text-secondary">
        {TEXTOS.dialogoEliminarAviso}
      </p>

      <TextField
        isInvalid={Boolean(errores.motivo)}
        isRequired
        maxLength={MAXIMO_MOTIVO}
        onChange={setMotivo}
        value={motivo}
      >
        <Label>{TEXTOS.motivo}</Label>
        <TextArea
          autoFocus
          className="w-full"
          placeholder={TEXTOS.motivoPlaceholder}
          rows={4}
        />
        <Description>
          {TEXTOS.caracteres(motivo.length, MAXIMO_MOTIVO)}
        </Description>
        <FieldError>{errores.motivo}</FieldError>
      </TextField>
    </Dialogo>
  );
}
