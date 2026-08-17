import { useState } from 'react';
import { Tabs } from '@heroui/react';
import { EncabezadoPantalla } from '../../components/layout/EncabezadoPantalla.js';
import { IconoObra } from '../../components/iconos/index.js';
import { TEXTOS_CONFIGURACION, TEXTOS_PROXIMAMENTE } from '../../lib/textos.js';
import { PanelDeCategorias } from './categorias/PanelDeCategorias.js';
import { PanelDeMotivos } from './motivos/PanelDeMotivos.js';
import { PanelDeParametros } from './parametros/PanelDeParametros.js';

/**
 * PAN-ADM-04 · Configuración del sistema — CFG-01 a CFG-04.
 *
 * Cuatro áreas administrables sin desplegar código, en pestañas: categorías
 * de platos (US-CFG-01), motivos de cancelación (US-CFG-02) y parámetros
 * generales (US-CFG-03) ya codificados; términos y condiciones (US-CFG-04)
 * por codificar. Mismo patrón de pestañas con estado local que
 * `Auditoria.tsx`, no sub-rutas: ninguna de las cuatro necesita un enlace
 * profundo propio todavía.
 */
type Solapa = 'categorias' | 'motivos' | 'parametros' | 'terminos';

export function Configuracion() {
  const [solapa, setSolapa] = useState<Solapa>('categorias');

  return (
    <>
      <EncabezadoPantalla
        notificacionesPendientes={null}
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
            <PorCodificar historias="US-CFG-04" />
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

/**
 * Versión reducida de `Proximamente.tsx` para una pestaña en lugar de una
 * pantalla completa: no repite el encabezado, que ya lo puso `Configuracion`.
 */
function PorCodificar({ historias }: { historias: string }) {
  return (
    <section className="aparece flex flex-col items-center gap-4 rounded-lg border border-dashed border-border bg-surface px-8 py-14 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <IconoObra className="size-7" />
      </span>
      <div className="space-y-1">
        <h2 className="text-h3 font-bold text-text-primary">
          {TEXTOS_PROXIMAMENTE.etiqueta}
        </h2>
        <p className="max-w-md text-body text-text-secondary">
          {TEXTOS_PROXIMAMENTE.descripcion}
        </p>
      </div>
      <p className="text-label text-text-secondary">
        {TEXTOS_PROXIMAMENTE.historias}: {historias}
      </p>
    </section>
  );
}
