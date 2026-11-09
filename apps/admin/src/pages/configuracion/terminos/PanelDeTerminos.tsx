import { useState } from 'react';
import { Tabs } from '@heroui/react';
import type { TipoVersionTerminos } from '@foodhub/shared';
import { TEXTOS_TERMINOS } from '../../../lib/textos.js';
import { SeccionTerminos } from './SeccionTerminos.js';

/**
 * "Términos y condiciones" de PAN-ADM-04 — US-CFG-04. Dos pestañas
 * ("Términos y condiciones" / "Política de privacidad"), literales del
 * primer criterio de aceptación.
 */
export function PanelDeTerminos() {
  const [tipo, setTipo] = useState<TipoVersionTerminos>('TERMINOS');

  return (
    <section className="aparece overflow-hidden rounded-lg border border-border bg-surface p-4">
      <Tabs
        onSelectionChange={(clave) => {
          setTipo(String(clave) as TipoVersionTerminos);
        }}
        selectedKey={tipo}
      >
        <Tabs.ListContainer>
          <Tabs.List aria-label={TEXTOS_TERMINOS.solapaTerminos}>
            <Tabs.Tab id="TERMINOS">
              {TEXTOS_TERMINOS.solapaTerminos}
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="PRIVACIDAD">
              {TEXTOS_TERMINOS.solapaPrivacidad}
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        <Tabs.Panel className="pt-4" id="TERMINOS">
          <SeccionTerminos tipo="TERMINOS" />
        </Tabs.Panel>

        <Tabs.Panel className="pt-4" id="PRIVACIDAD">
          <SeccionTerminos tipo="PRIVACIDAD" />
        </Tabs.Panel>
      </Tabs>
    </section>
  );
}
