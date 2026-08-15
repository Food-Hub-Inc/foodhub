import type { ReactNode } from 'react';
import { Button, Spinner } from '@heroui/react';

/**
 * Botón de envío de las pantallas de acceso.
 *
 * Mientras la operación está en curso el botón queda deshabilitado y cambia su
 * texto: en una pantalla sin datos previos, el estado de carga tiene que vivir
 * en el propio control que se presionó, porque no hay ningún otro lugar de la
 * pantalla donde el usuario esté mirando.
 *
 * Deshabilitarlo no es solo una señal visual: evita el doble envío, que en el
 * ingreso dispara dos intentos contra Supabase y suma un evento de seguridad
 * falso si las credenciales son incorrectas.
 */
export function BotonDeEnvio({
  enviando,
  textoEnviando,
  isDisabled = false,
  children,
}: {
  enviando: boolean;
  textoEnviando: string;
  isDisabled?: boolean;
  children: ReactNode;
}) {
  return (
    <Button fullWidth isDisabled={enviando || isDisabled} type="submit">
      {enviando ? <Spinner className="size-4" /> : null}
      {enviando ? textoEnviando : children}
    </Button>
  );
}
