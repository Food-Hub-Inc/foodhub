import { useState } from 'react';
import { Tabs } from '@heroui/react';
import { EncabezadoPantalla } from '../../components/layout/EncabezadoPantalla.js';
import {
  TEXTOS_MODERACION,
  TEXTOS_MODERACION_PUBLICACIONES,
} from '../../lib/textos.js';
import { PanelDeResenas } from './PanelDeResenas.js';
import { PanelDePublicaciones } from './publicaciones/PanelDePublicaciones.js';

/**
 * PAN-ADM-02 · Moderación de contenido.
 *
 * Dos pestañas sobre la misma pantalla (decisión del equipo): "Publicaciones"
 * (US-ADM-04, lo que publican los cocineros) y "Reseñas reportadas" (US-RES-06
 * y RF086, lo que denuncian los usuarios). Mismo patrón de pestañas con estado
 * local que `Configuracion.tsx` y `Ayuda.tsx`.
 */
type Solapa = 'publicaciones' | 'resenas';

export function Moderacion() {
  const [solapa, setSolapa] = useState<Solapa>('publicaciones');

  return (
    <>
      <EncabezadoPantalla
        notificacionesPendientes={null}
        subtitulo={TEXTOS_MODERACION_PUBLICACIONES.subtitulo}
        titulo={TEXTOS_MODERACION.titulo}
      />

      <div className="p-8">
        <Tabs
          onSelectionChange={(clave) => {
            setSolapa(String(clave) as Solapa);
          }}
          selectedKey={solapa}
        >
          <Tabs.ListContainer>
            <Tabs.List aria-label={TEXTOS_MODERACION.titulo}>
              <Tabs.Tab id="publicaciones">
                {TEXTOS_MODERACION_PUBLICACIONES.pestanaPublicaciones}
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="resenas">
                {TEXTOS_MODERACION_PUBLICACIONES.pestanaResenas}
                <Tabs.Indicator />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>

          <Tabs.Panel className="pt-4" id="publicaciones">
            <PanelDePublicaciones />
          </Tabs.Panel>

          <Tabs.Panel className="pt-4" id="resenas">
            <PanelDeResenas />
          </Tabs.Panel>
        </Tabs>
      </div>
    </>
  );
}
