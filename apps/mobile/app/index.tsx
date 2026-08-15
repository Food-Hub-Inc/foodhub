/**
 * Ruta raíz de la aplicación.
 *
 * No dibuja nada a propósito: quien decide adónde va el usuario es
 * `GateDeSesion`, montado en el layout raíz, y lo hace después de resolver dos
 * preguntas que no se pueden adelantar —si hay sesión y qué rol tiene—.
 *
 * Mientras tanto el splash sigue arriba. Dibujar algo acá produciría el
 * parpadeo que el gate justamente evita: una pantalla intermedia que aparece
 * por un frame y salta a otra.
 */
export default function Raiz() {
  return null;
}
