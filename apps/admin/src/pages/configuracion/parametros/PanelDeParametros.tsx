import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Skeleton, Tabs } from '@heroui/react';
import {
  CLAVE_PARAMETROS_SISTEMA,
  obtenerParametrosSistema,
} from '../../../api/parametrosSistema.js';
import { EstadoError } from '../../../components/estados/EstadoError.js';
import { TEXTOS_PARAMETROS } from '../../../lib/textos.js';
import { SeccionBusqueda } from './SeccionBusqueda.js';
import { SeccionInstitucional } from './SeccionInstitucional.js';
import { SeccionPedidos } from './SeccionPedidos.js';
import { SeccionResenas } from './SeccionResenas.js';

/**
 * "Configuración general" de PAN-ADM-04 — US-CFG-03. Cuatro subsecciones en
 * pestañas, mismo patrón de estado local que `Auditoria.tsx`: los cuatro
 * paneles se montan juntos (Tabs solo oculta los inactivos, no los
 * desmonta), así que cambiar de pestaña no pierde una edición en curso.
 */
export function PanelDeParametros() {
  const [solapa, setSolapa] = useState<
    'busqueda' | 'pedidos' | 'resenas' | 'institucional'
  >('busqueda');

  const consulta = useQuery({
    queryKey: CLAVE_PARAMETROS_SISTEMA,
    queryFn: obtenerParametrosSistema,
  });

  if (consulta.isError) {
    return (
      <div className="p-4">
        <EstadoError
          alReintentar={() => {
            void consulta.refetch();
          }}
          error={consulta.error}
        />
      </div>
    );
  }

  if (!consulta.data) {
    return (
      <div aria-hidden="true" className="space-y-4 p-4">
        <Skeleton className="h-9 w-full max-w-md rounded-sm" />
        <Skeleton className="h-9 w-full max-w-md rounded-sm" />
        <Skeleton className="h-9 w-full max-w-xs rounded-sm" />
      </div>
    );
  }

  const { busqueda, pedidos, resenas, institucional } = consulta.data;

  return (
    <div className="p-4">
      <Tabs
        onSelectionChange={(clave) => {
          setSolapa(
            String(clave) as
              'busqueda' | 'pedidos' | 'resenas' | 'institucional',
          );
        }}
        selectedKey={solapa}
      >
        <Tabs.ListContainer>
          <Tabs.List aria-label={TEXTOS_PARAMETROS.titulo}>
            <Tabs.Tab id="busqueda">
              {TEXTOS_PARAMETROS.solapaBusqueda}
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="pedidos">
              {TEXTOS_PARAMETROS.solapaPedidos}
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="resenas">
              {TEXTOS_PARAMETROS.solapaResenas}
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="institucional">
              {TEXTOS_PARAMETROS.solapaInstitucional}
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        <Tabs.Panel className="max-w-lg pt-4" id="busqueda">
          <SeccionBusqueda valorInicial={busqueda} />
        </Tabs.Panel>

        <Tabs.Panel className="max-w-lg pt-4" id="pedidos">
          <SeccionPedidos valorInicial={pedidos} />
        </Tabs.Panel>

        <Tabs.Panel className="max-w-lg pt-4" id="resenas">
          <SeccionResenas valorInicial={resenas} />
        </Tabs.Panel>

        <Tabs.Panel className="pt-4" id="institucional">
          <SeccionInstitucional valorInicial={institucional} />
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}
