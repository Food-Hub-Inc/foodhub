import { useState } from 'react';
import type { TramoDeSerie } from '@foodhub/shared';
import { formatearNumero } from '../../lib/formato.js';
import { TEXTOS_METRICAS } from '../../lib/textos.js';

/**
 * Barras agrupadas "Pedidos vs Completados" del mockup de PAN-ADM-03.
 *
 * COLOR: pedidos en `--color-primary` y completados en `--color-success`,
 * los dos de la guía visual. El validador de paleta da una separación CVD de
 * 6,9 (protan) entre ambos, legal solo con codificación secundaria; por eso la
 * leyenda está siempre, las barras llevan su valor rotulado cuando entran y
 * cada par tiene un tooltip con los dos números.
 *
 * SVG a mano y no una librería: son dos series y una docena de barras, y una
 * dependencia de gráficos pesaría más que toda la pantalla.
 */
const ALTO = 220;
const MARGEN_SUPERIOR = 22;
const MARGEN_INFERIOR = 26;
const ANCHO_BARRA = 18;
const SEPARACION_ENTRE_BARRAS = 2;
const LINEAS_DE_GUIA = 3;

/** Con más tramos que esto los rótulos de valor se pisan: queda el tooltip. */
const MAXIMO_CON_ROTULOS = 12;

export function GraficoDePedidos({
  tramos,
}: {
  tramos: readonly TramoDeSerie[];
}) {
  const [activo, setActivo] = useState<number | null>(null);

  const maximo = Math.max(1, ...tramos.map((tramo) => tramo.pedidos));
  const altoUtil = ALTO - MARGEN_SUPERIOR - MARGEN_INFERIOR;
  const escala = (valor: number) => (valor / maximo) * altoUtil;
  const anchoDeGrupo = 100 / Math.max(tramos.length, 1);
  const conRotulos = tramos.length <= MAXIMO_CON_ROTULOS;
  const base = ALTO - MARGEN_INFERIOR;

  return (
    <div className="relative">
      <Leyenda />

      <svg
        aria-label={TEXTOS_METRICAS.graficoPedidos}
        className="mt-3 w-full overflow-visible"
        height={ALTO}
        role="img"
      >
        {Array.from({ length: LINEAS_DE_GUIA }, (_, indice) => {
          const y = MARGEN_SUPERIOR + (altoUtil / LINEAS_DE_GUIA) * indice;
          return (
            <line
              className="stroke-border"
              key={indice}
              strokeDasharray="2 4"
              x1="0"
              x2="100%"
              y1={y}
              y2={y}
            />
          );
        })}
        <line className="stroke-border" x1="0" x2="100%" y1={base} y2={base} />

        {tramos.map((tramo, indice) => (
          <GrupoDeBarras
            activo={activo === indice}
            anchoDeGrupo={anchoDeGrupo}
            base={base}
            conRotulos={conRotulos}
            escala={escala}
            indice={indice}
            // El `key` es la posición: dos semanas pueden tener la misma
            // etiqueta en un personalizado largo ("Sem 1" no se repite, pero
            // meses de años distintos sí: "Oct").
            key={indice}
            alSalir={() => {
              setActivo(null);
            }}
            alEntrar={() => {
              setActivo(indice);
            }}
            tramo={tramo}
          />
        ))}
      </svg>

      {activo === null || !tramos[activo] ? null : (
        <Tooltip
          anchoDeGrupo={anchoDeGrupo}
          indice={activo}
          tramo={tramos[activo]}
        />
      )}
    </div>
  );
}

function GrupoDeBarras({
  tramo,
  indice,
  anchoDeGrupo,
  base,
  escala,
  conRotulos,
  activo,
  alEntrar,
  alSalir,
}: {
  tramo: TramoDeSerie;
  indice: number;
  anchoDeGrupo: number;
  base: number;
  escala: (valor: number) => number;
  conRotulos: boolean;
  activo: boolean;
  alEntrar: () => void;
  alSalir: () => void;
}) {
  const centro = `${String(anchoDeGrupo * indice + anchoDeGrupo / 2)}%`;
  const altoPedidos = escala(tramo.pedidos);
  const altoCompletados = escala(tramo.completados);
  const desplazamiento = ANCHO_BARRA + SEPARACION_ENTRE_BARRAS / 2;

  return (
    <g
      onMouseEnter={alEntrar}
      onMouseLeave={alSalir}
      opacity={activo ? 1 : 0.92}
    >
      {/* Zona de impacto más grande que las barras: todo el ancho del grupo. */}
      <rect
        fill="transparent"
        height={base}
        width={`${String(anchoDeGrupo)}%`}
        x={`${String(anchoDeGrupo * indice)}%`}
        y="0"
      />
      <svg overflow="visible" x={centro}>
        <Barra
          alto={altoPedidos}
          base={base}
          clase="fill-primary"
          conRotulo={conRotulos}
          valor={tramo.pedidos}
          x={-desplazamiento}
        />
        <Barra
          alto={altoCompletados}
          base={base}
          clase="fill-success"
          conRotulo={conRotulos}
          valor={tramo.completados}
          x={SEPARACION_ENTRE_BARRAS / 2}
        />
        <text
          className="fill-text-secondary text-caption"
          textAnchor="middle"
          x="0"
          y={base + 17}
        >
          {tramo.etiqueta}
        </text>
      </svg>
    </g>
  );
}

/**
 * Una barra con el extremo superior redondeado (4px) y la base recta, apoyada
 * en el eje. En cero no se dibuja: un rectángulo de alto 0 con esquinas
 * redondeadas deja una mancha.
 */
function Barra({
  x,
  base,
  alto,
  valor,
  clase,
  conRotulo,
}: {
  x: number;
  base: number;
  alto: number;
  valor: number;
  clase: string;
  conRotulo: boolean;
}) {
  const radio = Math.min(4, alto / 2, ANCHO_BARRA / 2);
  const y = base - alto;
  const trazo =
    alto <= 0
      ? ''
      : `M${String(x)},${String(base)} V${String(y + radio)} Q${String(x)},${String(y)} ${String(x + radio)},${String(y)} H${String(x + ANCHO_BARRA - radio)} Q${String(x + ANCHO_BARRA)},${String(y)} ${String(x + ANCHO_BARRA)},${String(y + radio)} V${String(base)} Z`;

  return (
    <>
      {alto > 0 ? <path className={clase} d={trazo} /> : null}
      {conRotulo && valor > 0 ? (
        <text
          className="fill-text-primary text-caption font-semibold"
          textAnchor="middle"
          x={x + ANCHO_BARRA / 2}
          y={y - 5}
        >
          {formatearNumero(valor)}
        </text>
      ) : null}
    </>
  );
}

function Leyenda() {
  return (
    <ul className="flex flex-wrap justify-end gap-4 text-caption text-text-secondary">
      <li className="flex items-center gap-1.5">
        <span aria-hidden="true" className="size-2.5 rounded-xs bg-primary" />
        {TEXTOS_METRICAS.seriePedidos}
      </li>
      <li className="flex items-center gap-1.5">
        <span aria-hidden="true" className="size-2.5 rounded-xs bg-success" />
        {TEXTOS_METRICAS.serieCompletados}
      </li>
    </ul>
  );
}

function Tooltip({
  tramo,
  indice,
  anchoDeGrupo,
}: {
  tramo: TramoDeSerie;
  indice: number;
  anchoDeGrupo: number;
}) {
  return (
    <div
      className="pointer-events-none absolute top-6 z-10 -translate-x-1/2 rounded-sm border border-border bg-surface px-3 py-2 text-caption shadow-md"
      role="status"
      style={{ left: `${String(anchoDeGrupo * indice + anchoDeGrupo / 2)}%` }}
    >
      <p className="font-semibold text-text-primary">{tramo.etiqueta}</p>
      <p className="text-text-secondary">
        {`${TEXTOS_METRICAS.seriePedidos}: ${formatearNumero(tramo.pedidos)}`}
      </p>
      <p className="text-text-secondary">
        {`${TEXTOS_METRICAS.serieCompletados}: ${formatearNumero(tramo.completados)}`}
      </p>
    </div>
  );
}
