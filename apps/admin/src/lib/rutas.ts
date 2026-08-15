/**
 * Direcciones del panel, en un solo lugar.
 *
 * Están acá y no escritas a mano en cada archivo porque dos módulos las
 * necesitan por motivos distintos y no pueden desalinearse: el ruteo las
 * declara y la barra lateral las enlaza. Un typo en una de las dos versiones
 * sería una redirección a ninguna parte.
 *
 * `nuevaPassword` además es un contrato con el backend: la API la usa como
 * destino del correo de invitación de un administrador (`URL_INVITACION_PANEL`).
 * Cambiarla acá exige cambiarla también en el ambiente de la API.
 */
export const RUTAS = {
  login: '/login',
  nuevaPassword: '/nueva-password',
  inicio: '/',
  usuarios: '/usuarios',
  moderacion: '/moderacion',
  metricas: '/metricas',
  auditoria: '/auditoria',
  configuracion: '/configuracion',
} as const;
