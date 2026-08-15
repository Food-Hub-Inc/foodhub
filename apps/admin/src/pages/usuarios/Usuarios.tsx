import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@heroui/react';
import type {
  EstadoCuenta,
  TipoUsuario,
  UsuarioListado,
} from '@foodhub/shared';
import {
  claveListadoUsuarios,
  FILTROS_INICIALES,
  hayFiltrosAplicados,
  listarUsuarios,
  type FiltrosListado,
} from '../../api/usuarios.js';
import { BotonNoDisponible } from '../../components/BotonNoDisponible.js';
import { EncabezadoPantalla } from '../../components/layout/EncabezadoPantalla.js';
import { EsqueletoDeTabla } from '../../components/estados/EsqueletoDeTabla.js';
import { EstadoError } from '../../components/estados/EstadoError.js';
import { EstadoVacio } from '../../components/estados/EstadoVacio.js';
import {
  IconoAgregar,
  IconoDescargar,
  IconoUsuarios,
} from '../../components/iconos/index.js';
import { useValorDebounced } from '../../hooks/useValorDebounced.js';
import { formatearNumero } from '../../lib/formato.js';
import { TEXTOS_USUARIOS } from '../../lib/textos.js';
import { BarraDeFiltros } from './BarraDeFiltros.js';
import { DialogosDeUsuarios } from './DialogosDeUsuarios.js';
import { PieDelListado } from './PieDelListado.js';
import { TablaDeUsuarios } from './TablaDeUsuarios.js';
import { SIN_DIALOGOS, type DialogosAbiertos } from './dialogos/estado.js';

/**
 * PAN-ADM-01 · Gestión de usuarios — US-GURP-05 a US-GURP-09.
 *
 * La pantalla coordina; no implementa ninguna operación. Cada diálogo se hace
 * cargo de la suya de punta a punta (validar, llamar a la API, refrescar el
 * listado y avisar), y acá solo se decide cuál está abierto y sobre qué fila.
 */
export function Usuarios() {
  const [filtros, setFiltros] = useState<FiltrosListado>(FILTROS_INICIALES);
  const [dialogos, setDialogos] = useState<DialogosAbiertos>(SIN_DIALOGOS);

  /**
   * La búsqueda se difiere; el resto de los filtros no. Un desplegable produce
   * un cambio por elección deliberada, mientras que un input produce uno por
   * tecla: solo el segundo necesita esperar.
   */
  const busquedaDiferida = useValorDebounced(filtros.busqueda);
  const filtrosEfectivos: FiltrosListado = {
    ...filtros,
    busqueda: busquedaDiferida,
  };

  const consulta = useQuery({
    queryKey: claveListadoUsuarios(filtrosEfectivos),
    queryFn: () => listarUsuarios(filtrosEfectivos),
  });

  /** Cambiar un filtro vuelve a la página 1: la 7 puede no existir con el filtro nuevo. */
  function aplicarFiltro(cambio: Partial<FiltrosListado>) {
    setFiltros((previo) => ({ ...previo, ...cambio, pagina: 1 }));
  }

  const total = consulta.data?.total ?? 0;
  const usuarios = consulta.data?.datos ?? [];

  return (
    <>
      <EncabezadoPantalla
        acciones={
          <AccionesDelEncabezado
            alCrear={() => {
              setDialogos({ ...SIN_DIALOGOS, alta: true });
            }}
          />
        }
        notificacionesPendientes={null}
        subtitulo={
          consulta.isPending
            ? ' '
            : `${formatearNumero(total)} usuarios registrados`
        }
        titulo={TEXTOS_USUARIOS.titulo}
      />

      <div className="p-8">
        <section className="overflow-hidden rounded-lg border border-border bg-surface">
          <BarraDeFiltros
            alCambiarBusqueda={(busqueda) => {
              aplicarFiltro({ busqueda });
            }}
            alCambiarEstado={(estadoCuenta: EstadoCuenta | null) => {
              aplicarFiltro({ estadoCuenta });
            }}
            alCambiarTipo={(tipo: TipoUsuario | null) => {
              aplicarFiltro({ tipo });
            }}
            busqueda={filtros.busqueda}
            estadoCuenta={filtros.estadoCuenta}
            tipo={filtros.tipo}
          />

          <Contenido
            alAbrirDialogo={setDialogos}
            alLimpiarFiltros={() => {
              setFiltros(FILTROS_INICIALES);
            }}
            consulta={consulta}
            filtros={filtrosEfectivos}
            usuarios={usuarios}
          />

          <PieDelListado
            alCambiarPagina={(pagina) => {
              setFiltros((previo) => ({ ...previo, pagina }));
            }}
            cantidadEnPagina={usuarios.length}
            pagina={filtros.pagina}
            porPagina={filtros.porPagina}
            total={total}
          />
        </section>
      </div>

      <DialogosDeUsuarios
        alCerrar={() => {
          setDialogos(SIN_DIALOGOS);
        }}
        dialogos={dialogos}
      />
    </>
  );
}

function AccionesDelEncabezado({ alCrear }: { alCrear: () => void }) {
  return (
    <>
      <BotonNoDisponible motivo={TEXTOS_USUARIOS.exportarNoDisponible}>
        <IconoDescargar className="size-4" />
        {TEXTOS_USUARIOS.exportar}
      </BotonNoDisponible>

      <Button onPress={alCrear}>
        <IconoAgregar className="size-4" />
        {TEXTOS_USUARIOS.nuevo}
      </Button>
    </>
  );
}

/**
 * Los cuatro estados de la tabla, en el orden en que hay que evaluarlos:
 * primero el error, que invalida todo lo demás; después la carga; después el
 * vacío; al final, los datos.
 */
function Contenido({
  consulta,
  usuarios,
  filtros,
  alAbrirDialogo,
  alLimpiarFiltros,
}: {
  consulta: {
    isPending: boolean;
    isError: boolean;
    error: unknown;
    refetch: () => unknown;
  };
  usuarios: readonly UsuarioListado[];
  filtros: FiltrosListado;
  alAbrirDialogo: (dialogos: DialogosAbiertos) => void;
  alLimpiarFiltros: () => void;
}) {
  if (consulta.isError) {
    return (
      <EstadoError
        alReintentar={() => {
          void consulta.refetch();
        }}
        error={consulta.error}
      />
    );
  }

  if (consulta.isPending) return <EsqueletoDeTabla columnas={7} conAvatar />;

  if (usuarios.length === 0) {
    return (
      <ListadoVacio
        alLimpiarFiltros={alLimpiarFiltros}
        conFiltros={hayFiltrosAplicados(filtros)}
      />
    );
  }

  return (
    <TablaDeUsuarios
      acciones={{
        editar: (usuario) => {
          alAbrirDialogo({ ...SIN_DIALOGOS, edicion: usuario });
        },
        suspender: (usuario) => {
          alAbrirDialogo({ ...SIN_DIALOGOS, suspension: usuario });
        },
        rehabilitar: (usuario) => {
          alAbrirDialogo({ ...SIN_DIALOGOS, rehabilitacion: usuario });
        },
        eliminar: (usuario) => {
          alAbrirDialogo({ ...SIN_DIALOGOS, baja: usuario });
        },
      }}
      usuarios={usuarios}
    />
  );
}

/**
 * "No hay usuarios" y "ningún usuario coincide con estos filtros" son dos
 * situaciones distintas y se explican distinto: solo la segunda tiene una
 * salida, que es limpiar los filtros.
 */
function ListadoVacio({
  conFiltros,
  alLimpiarFiltros,
}: {
  conFiltros: boolean;
  alLimpiarFiltros: () => void;
}) {
  return (
    <EstadoVacio
      {...(conFiltros
        ? {
            accion: {
              etiqueta: TEXTOS_USUARIOS.limpiarFiltros,
              alPresionar: alLimpiarFiltros,
            },
          }
        : {})}
      icono={<IconoUsuarios className="size-7" />}
      mensaje={
        conFiltros
          ? TEXTOS_USUARIOS.vacioConFiltros
          : TEXTOS_USUARIOS.vacioSinFiltros
      }
    />
  );
}
