import { useState } from 'react';
import { Tabs } from '@heroui/react';
import { EncabezadoPantalla } from '../../components/layout/EncabezadoPantalla.js';
import { TEXTOS_CONFIGURACION } from '../../lib/textos.js';
import { PanelDeCategorias } from './categorias/PanelDeCategorias.js';
import { PanelDeMotivos } from './motivos/PanelDeMotivos.js';
import { PanelDeParametros } from './parametros/PanelDeParametros.js';
import { PanelDeTerminos } from './terminos/PanelDeTerminos.js';

/**
 * PAN-ADM-04 · Configuración del sistema — US-CFG-01 a US-CFG-04.
 *
 * Cuatro áreas administrables sin desplegar código, en pestañas: categorías
 * de platos, motivos de cancelación, parámetros generales y términos y
 * condiciones. Mismo patrón de pestañas con estado local que
 * `Auditoria.tsx`, no sub-rutas: ninguna de las cuatro necesita un enlace
 * profundo propio todavía.
 */
type Solapa = 'categorias' | 'motivos' | 'parametros' | 'terminos';

export function Configuracion() {
  const [solapa, setSolapa] = useState<Solapa>('categorias');

  return (
    <>
      <EncabezadoPantalla
        subtitulo={TEXTOS_CONFIGURACION.subtitulo}
        titulo={TEXTOS_CONFIGURACION.titulo}
      />

      <div className="p-8">
        <Tabs
          onSelectionChange={(clave) => {
            setSolapa(String(clave) as Solapa);
          }}
          selectedKey={solapa}
        >
          <Tabs.ListContainer>
            <Tabs.List aria-label={TEXTOS_CONFIGURACION.titulo}>
              <Tabs.Tab id="categorias">
                {TEXTOS_CONFIGURACION.solapaCategorias}
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="motivos">
                {TEXTOS_CONFIGURACION.solapaMotivos}
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="parametros">
                {TEXTOS_CONFIGURACION.solapaParametros}
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="terminos">
                {TEXTOS_CONFIGURACION.solapaTerminos}
                <Tabs.Indicator />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>

          <Tabs.Panel className="pt-4" id="categorias">
            <Marco>
              <PanelDeCategorias />
            </Marco>
          </Tabs.Panel>

          <Tabs.Panel className="pt-4" id="motivos">
            <Marco>
              <PanelDeMotivos />
            </Marco>
          </Tabs.Panel>

          <Tabs.Panel className="pt-4" id="parametros">
            <Marco>
              <PanelDeParametros />
            </Marco>
          </Tabs.Panel>

          <Tabs.Panel className="pt-4" id="terminos">
            <PanelDeTerminos />
          </Tabs.Panel>
        </Tabs>
      </div>
    </>
  );
}

/** Tarjeta que contiene la tabla de una solapa. */
function Marco({ children }: { children: React.ReactNode }) {
  return (
    <section className="aparece overflow-hidden rounded-lg border border-border bg-surface">
      {children}
    </section>
  );
}
