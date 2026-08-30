import type { EstadoPedido, OrigenTransicion } from '@foodhub/shared';
import type { Aleatorio } from './aleatorio.js';
import type { SemillaUsuario } from '../datos/usuarios.js';
import type { SemillaPlato } from '../datos/platos.js';

/**
 * Estado compartido entre los pasos de la seed.
 *
 * Cada paso lee lo que dejaron los anteriores y agrega lo suyo. Se pasa un
 * unico objeto en lugar de encadenar valores de retorno porque los pasos
 * tardios necesitan datos de varios anteriores a la vez: las resenas necesitan
 * pedidos, publicaciones y usuarios, y las notificaciones necesitan casi todo.
 *
 * Los identificadores se guardan indexados por `slug` y no por posicion: un
 * paso que agregue un cocinero al final del arreglo no puede romper al que
 * busca "ana.lucero".
 */

export interface UsuarioCreado extends SemillaUsuario {
  id: string;
  fechaRegistro: Date;
}

export interface PublicacionCreada {
  id: string;
  cocineroId: string;
  cocineroSlug: string;
  plato: SemillaPlato;
  precio: number;
  imagenUrl: string;
  estado: 'DISPONIBLE' | 'ULTIMAS_UNIDADES' | 'NO_DISPONIBLE';
  fechaCreacion: Date;
}

/**
 * Los cuatro desenlaces posibles de un pedido en el dataset.
 *
 * `estado_pedido` solo distingue COMPLETADO de RECHAZADO; los tres tipos de
 * rechazo se separan por `origen_rechazo`. Este tipo nombra la diferencia para
 * que el codigo no tenga que razonar sobre la combinacion en cada uso.
 */
export type DesenlacePedido =
  | 'COMPLETADO'
  | 'RECHAZADO_POR_COCINERO'
  | 'CANCELADO_POR_CLIENTE'
  | 'TIEMPO_AGOTADO';

export interface ItemPedidoCreado {
  publicacionId: string;
  publicacion: PublicacionCreada;
  cantidad: number;
  precioUnitario: number;
}

export interface PedidoCreado {
  id: string;
  numeroPedido: string;
  clienteId: string;
  clienteSlug: string;
  cocineroId: string;
  cocineroSlug: string;
  estado: EstadoPedido;
  desenlace: DesenlacePedido;
  origenRechazo: OrigenTransicion | null;
  items: ItemPedidoCreado[];
  total: number;
  fechaCreacion: Date;
  fechaUltimaTransicion: Date;
}

export interface ResenaCreada {
  id: string;
  publicacionId: string;
  clienteId: string;
  cocineroId: string;
  calificacion: number;
  fechaPublicacion: Date;
  visible: boolean;
}

export interface ConversacionCreada {
  id: string;
  clienteId: string;
  cocineroId: string;
  ultimoMensaje: Date;
}

export interface ContextoSeed {
  azar: Aleatorio;
  /** Indexado por `slug`. Incluye los tres roles. */
  usuarios: Map<string, UsuarioCreado>;
  cocineros: UsuarioCreado[];
  clientes: UsuarioCreado[];
  administradores: UsuarioCreado[];
  /** `slug` de categoria -> id. */
  categorias: Map<string, string>;
  motivosCancelacion: {
    id: string;
    nombre: string;
    aplicableA: 'COCINERO' | 'CLIENTE' | 'AMBOS';
    activo: boolean;
  }[];
  /** Nombre del tipo de consulta -> id. */
  tiposConsulta: Map<string, string>;
  /** 'CLIENTE' | 'COCINERO' -> id de rol_destino. */
  rolesDestino: Map<string, string>;
  /** Version VIGENTE de los terminos, a la que se vinculan las aceptaciones. */
  versionTerminosVigenteId: string;
  publicaciones: PublicacionCreada[];
  pedidos: PedidoCreado[];
  resenas: ResenaCreada[];
  conversaciones: ConversacionCreada[];
}

export function crearContexto(azar: Aleatorio): ContextoSeed {
  return {
    azar,
    usuarios: new Map(),
    cocineros: [],
    clientes: [],
    administradores: [],
    categorias: new Map(),
    motivosCancelacion: [],
    tiposConsulta: new Map(),
    rolesDestino: new Map(),
    versionTerminosVigenteId: '',
    publicaciones: [],
    pedidos: [],
    resenas: [],
    conversaciones: [],
  };
}

/** Busca un usuario por `slug` y falla fuerte si no existe: es un bug de la seed. */
export function usuarioPorSlug(
  contexto: ContextoSeed,
  slug: string,
): UsuarioCreado {
  const usuario = contexto.usuarios.get(slug);
  if (!usuario) throw new Error(`la seed no creó al usuario "${slug}"`);
  return usuario;
}
