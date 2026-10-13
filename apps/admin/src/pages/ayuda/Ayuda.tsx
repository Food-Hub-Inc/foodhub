import { useState, type ReactNode } from 'react';
import { Tabs } from '@heroui/react';
import { MENSAJES_AYUDA } from '@foodhub/shared';
import { EncabezadoPantalla } from '../../components/layout/EncabezadoPantalla.js';
import { TEXTOS_GESTION_AYUDA } from '../../lib/textos.js';
import { PanelDeFaqs } from './faq/PanelDeFaqs.js';
import { PanelDelManual } from './manual/PanelDelManual.js';

/**
 * Gestión de ayuda — US-AYU-05.
 *
 * Dos pestañas con el contenido gestionable desde el panel: el manual de
 * usuario y las preguntas frecuentes. Mismo patrón de pestañas con estado
 * local que `Configuracion.tsx`.
 */
type Solapa = 'manual' | 'faq';

export function Ayuda() {
  const [solapa, setSolapa] = useState<Solapa>('manual');

  return (
    <>
      <EncabezadoPantalla
        subtitulo={TEXTOS_GESTION_AYUDA.subtitulo}
        titulo={MENSAJES_AYUDA.admin.titulo}
      />

      <div className="p-8">
        <Tabs
          onSelectionChange={(clave) => {
            setSolapa(String(clave) as Solapa);
          }}
          selectedKey={solapa}
        >
          <Tabs.ListContainer>
            <Tabs.List aria-label={MENSAJES_AYUDA.admin.titulo}>
              <Tabs.Tab id="manual">
                {MENSAJES_AYUDA.admin.pestanaManual}
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="faq">
                {MENSAJES_AYUDA.admin.pestanaFaq}
                <Tabs.Indicator />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>

          <Tabs.Panel className="pt-4" id="manual">
            <Marco>
              <PanelDelManual />
            </Marco>
          </Tabs.Panel>

          <Tabs.Panel className="pt-4" id="faq">
            <Marco>
              <PanelDeFaqs />
            </Marco>
          </Tabs.Panel>
        </Tabs>
      </div>
    </>
  );
}

/** Tarjeta que contiene la tabla de una pestaña. */
function Marco({ children }: { children: ReactNode }) {
  return (
    <section className="aparece overflow-hidden rounded-lg border border-border bg-surface">
      {children}
    </section>
  );
}
