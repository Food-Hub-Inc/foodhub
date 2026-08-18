import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@heroui/react';
import type { TipoVersionTerminos } from '@foodhub/shared';
import {
  claveEstadoTerminos,
  obtenerEstadoTerminos,
} from '../../../api/terminos.js';
import { EstadoError } from '../../../components/estados/EstadoError.js';
import { DialogoHistorial } from './DialogoHistorial.js';
import { ModoEdicion } from './ModoEdicion.js';
import { useOperacionesTerminos } from './useOperacionesTerminos.js';
import { VistaVigente } from './VistaVigente.js';

/** Una pestaña de PAN-ADM-04 (términos y condiciones, o política de privacidad) — US-CFG-04. */
export function SeccionTerminos({ tipo }: { tipo: TipoVersionTerminos }) {
  const [modo, setModo] = useState<'ver' | 'editar'>('ver');
  const [historialAbierto, setHistorialAbierto] = useState(false);
  const { guardarBorrador, publicar } = useOperacionesTerminos(tipo);

  const estado = useQuery({
    queryKey: claveEstadoTerminos(tipo),
    queryFn: () => obtenerEstadoTerminos(tipo),
  });

  if (estado.isError) {
    return (
      <EstadoError
        alReintentar={() => {
          void estado.refetch();
        }}
        error={estado.error}
      />
    );
  }

  if (!estado.data) {
    return (
      <div aria-hidden="true" className="space-y-3">
        <Skeleton className="h-4 w-1/3 rounded-sm" />
        <Skeleton className="h-48 rounded-sm" />
      </div>
    );
  }

  if (modo === 'editar') {
    return (
      <ModoEdicion
        alCancelar={() => {
          setModo('ver');
        }}
        alTerminar={() => {
          setModo('ver');
        }}
        contenidoInicial={
          estado.data.borrador?.contenidoHtml ??
          estado.data.vigente?.contenidoHtml ??
          ''
        }
        esBorradorPropio={Boolean(estado.data.borrador)}
        guardarBorrador={guardarBorrador}
        publicar={publicar}
      />
    );
  }

  return (
    <>
      <VistaVigente
        alEditar={() => {
          setModo('editar');
        }}
        alVerHistorial={() => {
          setHistorialAbierto(true);
        }}
        estado={estado.data}
      />

      {historialAbierto ? (
        <DialogoHistorial
          alCerrar={() => {
            setHistorialAbierto(false);
          }}
          tipo={tipo}
        />
      ) : null}
    </>
  );
}
