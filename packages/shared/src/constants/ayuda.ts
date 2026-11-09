/**
 * Ayuda y soporte — constantes compartidas (modulo AYU).
 *
 * El contenido del manual y de las FAQ se segmenta por rol destinatario
 * (US-AYU-01, US-AYU-02). "Ambos" es una tercera opcion de gestion (US-AYU-05)
 * que no existe como rol de usuario: en la base es una fila mas de
 * `rol_destino`, y las lecturas la resuelven como "el rol del usuario o AMBOS".
 */
export const ROL_DESTINO_AYUDA = ['CLIENTE', 'COCINERO', 'AMBOS'] as const;
export type RolDestinoAyuda = (typeof ROL_DESTINO_AYUDA)[number];

/** Etiquetas de presentacion del rol destinatario. */
export const ETIQUETAS_ROL_DESTINO_AYUDA: Record<RolDestinoAyuda, string> = {
  CLIENTE: 'Cliente',
  COCINERO: 'Cocinero',
  AMBOS: 'Ambos',
};

/** Categorías de FAQ visibles para el cliente, en el orden de la maquetación. */
export const CATEGORIAS_FAQ_CLIENTE = [
  'Cuenta y registro',
  'Pedidos',
  'Reseñas y calificaciones',
  'Mensajería',
  'Privacidad y seguridad',
] as const;

/** Categorías de FAQ visibles para el cocinero, en el orden de la maquetación. */
export const CATEGORIAS_FAQ_COCINERO = [
  'Cuenta y registro',
  'Publicaciones',
  'Gestión de pedidos',
  'Reseñas y reputación',
  'Dashboard',
  'Privacidad y seguridad',
] as const;

/**
 * Categorías ofrecidas en el desplegable segun el rol destinatario. Para
 * "Ambos" se ofrece la union, sin repetir "Cuenta y registro" ni "Privacidad y
 * seguridad", que comparten los dos roles.
 */
export const CATEGORIAS_FAQ_POR_ROL: Record<
  RolDestinoAyuda,
  readonly string[]
> = {
  CLIENTE: CATEGORIAS_FAQ_CLIENTE,
  COCINERO: CATEGORIAS_FAQ_COCINERO,
  AMBOS: [
    ...new Set<string>([...CATEGORIAS_FAQ_CLIENTE, ...CATEGORIAS_FAQ_COCINERO]),
  ],
};

/** Categorías disponibles para un rol destinatario. */
export function categoriasFaqDeRol(rol: RolDestinoAyuda): readonly string[] {
  return CATEGORIAS_FAQ_POR_ROL[rol];
}
