import type { FormEvent, ReactNode } from 'react';
import { Alert, Modal } from '@heroui/react';
import { IconoAlerta } from './iconos/index.js';

/**
 * Diálogo modal del panel.
 *
 * Concentra la estructura compuesta de `Modal` (backdrop, contenedor, diálogo,
 * encabezado, cuerpo y pie) para que las cinco operaciones sobre usuarios no
 * repitan seis niveles de anidamiento cada una.
 *
 * Cuando recibe `alEnviar` envuelve cuerpo y pie en un `<form>`: así el diálogo
 * se confirma con Enter, que es lo que espera quien está cargando datos con el
 * teclado.
 *
 * El manejo de foco, el `aria-modal` y el cierre con Escape los aporta React
 * Aria a través de `Modal`; no se reimplementan.
 */
export function Dialogo({
  abierto,
  alCambiarApertura,
  titulo,
  children,
  pie,
  alEnviar,
  error,
  tamano = 'sm',
}: {
  abierto: boolean;
  alCambiarApertura: (abierto: boolean) => void;
  titulo: string;
  children: ReactNode;
  pie: ReactNode;
  alEnviar?: (evento: FormEvent<HTMLFormElement>) => void;
  /** Mensaje de error de la operación, sobre el formulario. */
  error?: string | null;
  tamano?: 'xs' | 'sm' | 'md' | 'lg';
}) {
  const cuerpo = (
    <>
      <Modal.Body className="space-y-4">
        {error ? (
          <Alert status="danger">
            <Alert.Indicator>
              <IconoAlerta className="size-5" />
            </Alert.Indicator>
            <Alert.Content>
              <Alert.Description>{error}</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}
        {children}
      </Modal.Body>
      <Modal.Footer>{pie}</Modal.Footer>
    </>
  );

  return (
    <Modal.Backdrop isOpen={abierto} onOpenChange={alCambiarApertura}>
      <Modal.Container size={tamano}>
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>{titulo}</Modal.Heading>
          </Modal.Header>

          {alEnviar ? (
            <form noValidate onSubmit={alEnviar}>
              {cuerpo}
            </form>
          ) : (
            cuerpo
          )}
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
