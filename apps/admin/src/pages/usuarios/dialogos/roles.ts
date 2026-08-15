/**
 * Roles que un administrador puede asignar desde el panel.
 *
 * `COCINERO` no está, y no es un olvido: la base exige ubicación para ese rol
 * (CHECK `usuario_cocinero_con_ubicacion`) y el criterio de US-AUT-02 la define
 * como "detectada por el GPS del dispositivo". El alta de cocinero ocurre desde
 * la aplicación móvil. `crearUsuarioPanelSchema` y `editarUsuarioPanelSchema`
 * codifican la misma restricción del lado del servidor.
 */
export const ROLES_DEL_PANEL = ['CLIENTE', 'ADMINISTRADOR'] as const;

export type RolDelPanel = (typeof ROLES_DEL_PANEL)[number];
