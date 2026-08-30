import type { EstadoVersionTerminos } from '@foodhub/shared';

/**
 * Versiones de los terminos y condiciones y de la politica de privacidad
 * (US-CFG-04, US-AYU-04).
 *
 * PROCEDENCIA DEL CONTENIDO
 *
 * El texto de TERMINOS v2 es el que estaba cargado y VIGENTE en foodhub-dev
 * antes de este dataset: se rescato de la base para no perderlo con el reset.
 * El resto -TERMINOS v1 y las dos versiones de PRIVACIDAD- es TEXTO DE
 * EJEMPLO redactado para la seed, no un documento legal revisado. Antes de
 * cargar la plataforma en produccion hay que reemplazarlo.
 *
 * POR QUE HAY VERSIONES ARCHIVADAS
 *
 * `version_terminos` conserva todas las versiones porque el usuario queda
 * vinculado a la que efectivamente leyo. Sin una archivada, el historial de
 * PAN-ADM-04 y el dialogo de comparacion de versiones no tienen nada que
 * mostrar y esa parte de US-CFG-04 no se puede probar.
 *
 * Las fechas son anteriores a `INICIO_VENTANA`: los usuarios del dataset se
 * registran despues y aceptan la version vigente al momento de su alta.
 */

export interface SemillaVersionTerminos {
  tipo: 'TERMINOS' | 'PRIVACIDAD';
  numeroVersion: number;
  estado: EstadoVersionTerminos;
  fechaPublicacion: Date;
  contenidoHtml: string;
}

const TERMINOS_V1 = [
  '<h1>Términos y Condiciones</h1>',
  '<p><strong>Última actualización:</strong> 2 de febrero de 2026</p>',
  '<h2>1. Aceptación de los términos</h2>',
  '<p>Al utilizar <strong>FoodHub</strong>, el usuario acepta estos Términos y Condiciones.</p>',
  '<h2>2. Uso del servicio</h2>',
  '<p>FoodHub permite explorar publicaciones de cocineros caseros y realizar pedidos dentro de la plataforma.</p>',
  '<h2>3. Pedidos</h2>',
  '<p>Los pedidos están sujetos a la disponibilidad del plato y a la confirmación del cocinero.</p>',
  '<h2>4. Contacto</h2>',
  '<p>Ante cualquier duda, el usuario puede comunicarse por el canal de soporte.</p>',
].join('');

/** Rescatado de foodhub-dev antes del reset. Era la version VIGENTE. */
const TERMINOS_V2 = [
  '<h1>Términos y Condiciones</h1>',
  '<p><strong>Última actualización:</strong> 20 de agosto de 2026</p>',
  '<h2>1. Aceptación de los términos</h2>',
  '<p>Al utilizar <strong>Foodhub</strong>, el usuario acepta estos Términos y Condiciones. Si no está de acuerdo con alguno de ellos, deberá abstenerse de utilizar la plataforma.</p>',
  '<h2>2. Uso del servicio</h2>',
  '<p>Foodhub permite a los usuarios consultar restaurantes, explorar platos y realizar pedidos a través de la plataforma.</p>',
  '<p>El usuario se compromete a:</p>',
  '<ul><li><p>Proporcionar información verdadera y actualizada.</p></li><li><p>Utilizar la plataforma de manera responsable.</p></li><li><p>No utilizar el servicio con fines ilegales o fraudulentos.</p></li><li><p>Mantener la seguridad de sus credenciales de acceso.</p></li></ul>',
  '<h2>3. Pedidos y pagos</h2>',
  '<p>Los pedidos realizados a través de Foodhub están sujetos a la disponibilidad de los productos y a la confirmación del restaurante.</p>',
  '<p>Los precios mostrados en la plataforma pueden estar sujetos a cambios. El importe final será informado antes de confirmar el pedido.</p>',
  '<h2>4. Cancelaciones</h2>',
  '<p>Un pedido podrá ser cancelado de acuerdo con las condiciones establecidas por el restaurante y las políticas de Foodhub.</p>',
  '<p>En determinados casos, una cancelación puede generar cargos o impedir el reembolso del importe abonado.</p>',
  '<h2>5. Modificaciones</h2>',
  '<p>Foodhub podrá modificar estos Términos y Condiciones cuando sea necesario. Cuando se publique una nueva versión, se indicará la fecha de actualización correspondiente.</p>',
  '<p>El uso continuado de la plataforma después de la publicación de cambios implica la aceptación de los nuevos términos.</p>',
  '<h2>6. Contacto</h2>',
  '<p>Si tenés alguna duda sobre estos términos, podés contactarnos a través de nuestro canal de soporte.</p>',
  '<p><strong>Foodhub — Todos los derechos reservados.</strong></p>',
].join('');

const PRIVACIDAD_V1 = [
  '<h1>Política de Privacidad</h1>',
  '<p><strong>Última actualización:</strong> 2 de febrero de 2026</p>',
  '<h2>1. Datos que recolectamos</h2>',
  '<p>FoodHub almacena el nombre, el apellido, el correo electrónico y la ubicación declarada por el usuario.</p>',
  '<h2>2. Uso de los datos</h2>',
  '<p>Los datos se usan para mostrar publicaciones cercanas y para poner en contacto al cliente con el cocinero.</p>',
  '<h2>3. Contacto</h2>',
  '<p>El usuario puede solicitar la baja de su cuenta desde la aplicación o por el canal de soporte.</p>',
].join('');

const PRIVACIDAD_V2 = [
  '<h1>Política de Privacidad</h1>',
  '<p><strong>Última actualización:</strong> 20 de agosto de 2026</p>',
  '<p>Este documento describe qué datos personales trata <strong>FoodHub</strong>, con qué finalidad y qué derechos tiene el usuario sobre ellos. Se aplica a la aplicación móvil y al panel de administración.</p>',
  '<h2>1. Datos que recolectamos</h2>',
  '<ul>',
  '<li><p><strong>Datos de la cuenta:</strong> nombre, apellido, correo electrónico y foto de perfil.</p></li>',
  '<li><p><strong>Ubicación:</strong> el punto que el usuario declara al registrarse. En el cocinero es obligatorio, porque sin él sus publicaciones no pueden aparecer en el feed por cercanía. En el cliente es opcional.</p></li>',
  '<li><p><strong>Actividad en la plataforma:</strong> pedidos, reseñas, favoritos y mensajes intercambiados con la otra parte.</p></li>',
  '<li><p><strong>Datos técnicos:</strong> dirección IP y token del dispositivo, necesarios para el envío de notificaciones y para el registro de eventos de seguridad.</p></li>',
  '</ul>',
  '<h2>2. Para qué usamos los datos</h2>',
  '<ul>',
  '<li><p>Mostrar publicaciones y cocineros cercanos a la ubicación del usuario.</p></li>',
  '<li><p>Gestionar el ciclo de vida de los pedidos y notificar cada cambio de estado.</p></li>',
  '<li><p>Habilitar la mensajería entre cliente y cocinero.</p></li>',
  '<li><p>Calcular la reputación pública a partir de las reseñas y calificaciones.</p></li>',
  '<li><p>Registrar operaciones y eventos de seguridad con fines de auditoría.</p></li>',
  '</ul>',
  '<h2>3. Con quién se comparten</h2>',
  '<p>FoodHub no vende ni cede datos personales a terceros con fines publicitarios. El cocinero ve el nombre y las instrucciones de entrega del cliente que le hizo un pedido, y el cliente ve el nombre, la descripción pública y la ubicación aproximada del cocinero. Los proveedores de infraestructura que alojan la plataforma acceden a los datos únicamente para prestar ese servicio.</p>',
  '<h2>4. Conservación</h2>',
  '<p>Los datos de la cuenta se conservan mientras la cuenta esté activa. Al darse de baja, el perfil deja de ser visible y las conversaciones quedan bloqueadas, pero el historial de pedidos y los registros de auditoría se conservan por el plazo necesario para resolver reclamos.</p>',
  '<h2>5. Derechos del usuario</h2>',
  '<p>El usuario puede acceder a sus datos, rectificarlos desde su perfil y solicitar la baja de su cuenta desde la aplicación. Para cualquier otro pedido relacionado con sus datos personales puede escribir al canal de soporte.</p>',
  '<h2>6. Cambios en esta política</h2>',
  '<p>Cuando se publique una versión nueva se indicará la fecha de actualización y, si los cambios son sustanciales, se pedirá al usuario que la acepte antes de seguir usando la plataforma.</p>',
  '<h2>7. Contacto</h2>',
  '<p>Consultas sobre esta política: canal de soporte de la aplicación.</p>',
  '<p><strong>FoodHub — Todos los derechos reservados.</strong></p>',
].join('');

export const VERSIONES_TERMINOS: readonly SemillaVersionTerminos[] = [
  {
    tipo: 'TERMINOS',
    numeroVersion: 1,
    estado: 'ARCHIVADA',
    fechaPublicacion: new Date('2026-02-02T13:00:00.000Z'),
    contenidoHtml: TERMINOS_V1,
  },
  {
    tipo: 'TERMINOS',
    numeroVersion: 2,
    estado: 'VIGENTE',
    fechaPublicacion: new Date('2026-08-20T13:00:00.000Z'),
    contenidoHtml: TERMINOS_V2,
  },
  {
    tipo: 'PRIVACIDAD',
    numeroVersion: 1,
    estado: 'ARCHIVADA',
    fechaPublicacion: new Date('2026-02-02T13:00:00.000Z'),
    contenidoHtml: PRIVACIDAD_V1,
  },
  {
    tipo: 'PRIVACIDAD',
    numeroVersion: 2,
    estado: 'VIGENTE',
    fechaPublicacion: new Date('2026-08-20T13:00:00.000Z'),
    contenidoHtml: PRIVACIDAD_V2,
  },
];
