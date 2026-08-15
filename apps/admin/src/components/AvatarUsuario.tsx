import { Avatar } from '@heroui/react';
import { clases } from '../lib/clases.js';
import { iniciales, nombreCompleto } from '../lib/formato.js';

/**
 * Avatar de una persona en el panel.
 *
 * Cuando no hay foto muestra las iniciales, que es lo que define la guía
 * visual (capítulo 2, "avatares con iniciales"). Se apoya en el `Avatar` de
 * HeroUI porque ya resuelve el caso de la imagen que no carga: sin eso, una URL
 * de Storage caída deja un cuadro roto en cada fila de la tabla.
 */
export function AvatarUsuario({
  nombre,
  apellido,
  fotoUrl,
  className,
}: {
  nombre: string;
  apellido: string;
  fotoUrl: string | null;
  className?: string | undefined;
}) {
  const completo = nombreCompleto(nombre, apellido);

  return (
    <Avatar className={clases('size-9', className)}>
      {fotoUrl ? <Avatar.Image alt={completo} src={fotoUrl} /> : null}
      <Avatar.Fallback className="bg-primary/12 text-caption font-bold text-primary">
        {iniciales(nombre, apellido)}
      </Avatar.Fallback>
    </Avatar>
  );
}
