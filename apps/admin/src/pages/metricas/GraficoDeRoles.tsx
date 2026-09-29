import { TIPO_USUARIO, type TipoUsuario } from '@foodhub/shared';
import { formatearNumero } from '../../lib/formato.js';
import { TEXTOS_METRICAS } from '../../lib/textos.js';

/**
 * Torta "Usuarios por rol" del mockup de PAN-ADM-03 — primer criterio de
 * US-ADM-05: "total de usuarios registrados diferenciado por rol".
 *
 * Es de las pocas partes-de-un-todo donde una dona se justifica: tres
 * categorías y el total al centro. COLOR: la guía visual no tiene azul (el
 * mockup lo usa para clientes), así que van los tres tonos aprobados más
 * distintos entre sí: gris de apoyo, primario y texto. Dos de ellos son de
 * croma bajo; la leyenda con el nombre Y el número de cada rol es la
 * codificación que no depende del color.
 */
const COLOR: Record<TipoUsuario, { trazo: string; punto: string }> = {
  CLIENTE: { trazo: 'stroke-secondary', punto: 'bg-secondary' },
  COCINERO: { trazo: 'stroke-primary', punto: 'bg-primary' },
  ADMINISTRADOR: { trazo: 'stroke-text-primary', punto: 'bg-text-primary' },
};

const RADIO = 52;
const GROSOR = 22;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;
/** Separación de 2px entre segmentos, del color de la superficie. */
const HUECO = 2;
const CENTRO = RADIO + GROSOR;
const LADO = CENTRO * 2;

export function GraficoDeRoles({
  usuariosPorRol,
}: {
  usuariosPorRol: Record<TipoUsuario, number>;
}) {
  const total = TIPO_USUARIO.reduce(
    (suma, tipo) => suma + usuariosPorRol[tipo],
    0,
  );
  const segmentos = segmentosDe(usuariosPorRol, total);

  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      <svg
        aria-label={TEXTOS_METRICAS.usuariosPorRol}
        className="shrink-0"
        height={LADO}
        role="img"
        viewBox={`0 0 ${String(LADO)} ${String(LADO)}`}
        width={LADO}
      >
        <circle
          className="stroke-border"
          cx={CENTRO}
          cy={CENTRO}
          fill="none"
          r={RADIO}
          strokeWidth={GROSOR}
        />
        {segmentos.map((segmento) => (
          <circle
            className={COLOR[segmento.tipo].trazo}
            cx={CENTRO}
            cy={CENTRO}
            fill="none"
            key={segmento.tipo}
            r={RADIO}
            strokeDasharray={`${String(segmento.visible)} ${String(CIRCUNFERENCIA)}`}
            strokeDashoffset={-segmento.inicio}
            strokeWidth={GROSOR}
            // Arranca a las 12 en punto, no a las 3.
            transform={`rotate(-90 ${String(CENTRO)} ${String(CENTRO)})`}
          />
        ))}
        <text
          className="fill-text-secondary text-caption"
          textAnchor="middle"
          x={CENTRO}
          y={CENTRO - 6}
        >
          {TEXTOS_METRICAS.total}
        </text>
        <text
          className="fill-text-primary text-h2 font-extrabold"
          textAnchor="middle"
          x={CENTRO}
          y={CENTRO + 14}
        >
          {formatearNumero(total)}
        </text>
      </svg>

      <Leyenda usuariosPorRol={usuariosPorRol} />
    </div>
  );
}

/**
 * Dónde empieza y cuánto mide cada segmento, en unidades de la circunferencia.
 * Función pura: el acumulado vive acá y no en el render.
 */
function segmentosDe(
  usuariosPorRol: Record<TipoUsuario, number>,
  total: number,
): { tipo: TipoUsuario; visible: number; inicio: number }[] {
  const presentes = TIPO_USUARIO.filter((tipo) => usuariosPorRol[tipo] > 0);
  const segmentos: { tipo: TipoUsuario; visible: number; inicio: number }[] =
    [];
  let acumulado = 0;

  for (const tipo of presentes) {
    const largo = (usuariosPorRol[tipo] / total) * CIRCUNFERENCIA;
    // Con un solo rol no hay hueco que dejar: el anillo va completo.
    const visible = presentes.length > 1 ? Math.max(largo - HUECO, 0) : largo;
    segmentos.push({ tipo, visible, inicio: acumulado });
    acumulado += largo;
  }

  return segmentos;
}

/** Nombre y número de cada rol: la codificación que no depende del color. */
function Leyenda({
  usuariosPorRol,
}: {
  usuariosPorRol: Record<TipoUsuario, number>;
}) {
  return (
    <ul className="min-w-[140px] space-y-2">
      {TIPO_USUARIO.map((tipo) => (
        <li className="flex items-center gap-2 text-body" key={tipo}>
          <span
            aria-hidden="true"
            className={`size-2.5 rounded-full ${COLOR[tipo].punto}`}
          />
          <span className="flex-1 text-text-secondary">
            {TEXTOS_METRICAS.rol[tipo]}
          </span>
          <span className="font-bold text-text-primary tabular-nums">
            {formatearNumero(usuariosPorRol[tipo])}
          </span>
        </li>
      ))}
    </ul>
  );
}
