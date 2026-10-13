import { EncabezadoPantalla } from '../components/layout/EncabezadoPantalla.js';
import { IconoObra } from '../components/iconos/index.js';
import { TEXTOS_PROXIMAMENTE } from '../lib/textos.js';

/**
 * Pantalla de un módulo del panel que todavía no se codificó.
 *
 * No es un error ni un hueco: nombra el código de pantalla de la maquetación,
 * el módulo al que pertenece y las historias que va a cubrir. Quien la abre
 * sabe exactamente qué falta y dónde está documentado, en vez de encontrarse
 * una ruta muerta.
 */
export function Proximamente({
  titulo,
  /** Código de la maquetación (PAN-ADM-02, PAN-ADM-03, PAN-ADM-04). */
  pantalla,
  modulo,
  historias,
}: {
  titulo: string;
  pantalla: string | null;
  modulo: string;
  historias: string;
}) {
  return (
    <>
      <EncabezadoPantalla
        subtitulo={TEXTOS_PROXIMAMENTE.etiqueta}
        titulo={titulo}
      />

      <div className="p-8">
        <section className="aparece mx-auto flex max-w-xl flex-col items-center gap-5 rounded-lg border border-dashed border-border bg-surface px-8 py-14 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <IconoObra className="size-7" />
          </span>

          <div className="space-y-1">
            <h2 className="text-h2 font-bold text-text-primary">
              {TEXTOS_PROXIMAMENTE.etiqueta}
            </h2>
            <p className="text-body text-text-secondary">
              {TEXTOS_PROXIMAMENTE.descripcion}
            </p>
          </div>

          <dl className="grid w-full max-w-sm gap-2 text-left">
            {pantalla ? (
              <Dato etiqueta={TEXTOS_PROXIMAMENTE.pantalla} valor={pantalla} />
            ) : null}
            <Dato etiqueta={TEXTOS_PROXIMAMENTE.modulo} valor={modulo} />
            <Dato etiqueta={TEXTOS_PROXIMAMENTE.historias} valor={historias} />
          </dl>
        </section>
      </div>
    </>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 rounded-sm bg-background px-3 py-2">
      <dt className="text-label font-semibold text-text-secondary">
        {etiqueta}
      </dt>
      <dd className="text-label font-bold text-text-primary">{valor}</dd>
    </div>
  );
}
