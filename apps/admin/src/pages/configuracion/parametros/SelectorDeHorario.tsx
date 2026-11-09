import { Button, Label, TimeField } from '@heroui/react';
import { parseTime, type Time } from '@internationalized/date';
import {
  DIAS_HORARIO,
  type DiaHorario,
  type HorarioAtencionSemana,
} from '@foodhub/shared';
import { clases } from '../../../lib/clases.js';
import { TEXTOS_PARAMETROS } from '../../../lib/textos.js';

const NOMBRE_DIA: Record<DiaHorario, string> = {
  LUNES: 'Lunes',
  MARTES: 'Martes',
  MIERCOLES: 'Miércoles',
  JUEVES: 'Jueves',
  VIERNES: 'Viernes',
  SABADO: 'Sábado',
  DOMINGO: 'Domingo',
};

/** Horario de fábrica con el que se activa un día recién marcado. */
const FABRICA = { inicio: '09:00', fin: '18:00' } as const;

function aTiempo(hora: string): Time | null {
  try {
    return parseTime(hora);
  } catch {
    return null;
  }
}

function aTexto(tiempo: Time): string {
  const hora = String(tiempo.hour).padStart(2, '0');
  const minuto = String(tiempo.minute).padStart(2, '0');
  return `${hora}:${minuto}`;
}

/** ¿Quedó completo (hora y minutos)? Filtra los valores parciales del TimeField. */
function esTramoCompleto(tiempo: Time | null): tiempo is Time {
  return (
    tiempo !== null &&
    Number.isFinite(tiempo.hour) &&
    Number.isFinite(tiempo.minute)
  );
}

/**
 * US-CFG-03 / US-AYU-04 - Selección del horario de atención del soporte
 * (Información institucional). Se eligen los días con botones alternables y,
 * para cada día activo, el tramo horario con un `TimeField`.
 */
export function SelectorDeHorario({
  valor,
  alCambiar,
  error,
}: {
  valor: HorarioAtencionSemana;
  alCambiar: (valor: HorarioAtencionSemana) => void;
  error?: string | undefined;
}) {
  const diasActivos = DIAS_HORARIO.filter((dia) => valor[dia] !== null);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{TEXTOS_PARAMETROS.campoHorarioAtencionSoporte}</Label>

        <SelectorDeDias alCambiar={alCambiar} valor={valor} />

        <p className="text-caption text-text-secondary">
          {TEXTOS_PARAMETROS.ayudaHorarioAtencion}
        </p>
      </div>

      {diasActivos.length > 0 ? (
        <HorasDeDias
          alCambiar={alCambiar}
          diasActivos={diasActivos}
          valor={valor}
        />
      ) : null}

      {error ? <p className="text-caption text-error">{error}</p> : null}
    </div>
  );
}

/** Botones alternables con los siete días de la semana. */
function SelectorDeDias({
  valor,
  alCambiar,
}: {
  valor: HorarioAtencionSemana;
  alCambiar: (valor: HorarioAtencionSemana) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {DIAS_HORARIO.map((dia) => {
        const activo = valor[dia] !== null;
        return (
          <Button
            aria-pressed={activo}
            key={dia}
            onPress={() => {
              alCambiar({
                ...valor,
                [dia]: activo ? null : FABRICA,
              });
            }}
            size="sm"
            type="button"
            variant={activo ? 'primary' : 'secondary'}
          >
            {NOMBRE_DIA[dia]}
          </Button>
        );
      })}
    </div>
  );
}

/** Tramo horario de cada día activo. */
function HorasDeDias({
  diasActivos,
  valor,
  alCambiar,
}: {
  diasActivos: DiaHorario[];
  valor: HorarioAtencionSemana;
  alCambiar: (valor: HorarioAtencionSemana) => void;
}) {
  function cambiarHora(
    dia: DiaHorario,
    campo: 'inicio' | 'fin',
    tiempo: Time | null,
  ) {
    if (!esTramoCompleto(tiempo)) return;
    const actual = valor[dia];
    if (!actual) return;
    alCambiar({
      ...valor,
      [dia]: { ...actual, [campo]: aTexto(tiempo) },
    });
  }

  return (
    <div className="space-y-3">
      {diasActivos.map((dia) => {
        const rango = valor[dia];
        if (!rango) return null;
        return (
          <div className="flex items-center gap-3" key={dia}>
            <span className="w-24 shrink-0 text-body text-text-primary">
              {NOMBRE_DIA[dia]}
            </span>

            <CampoDeHora
              etiqueta={TEXTOS_PARAMETROS.apertura}
              onChange={(tiempo) => {
                cambiarHora(dia, 'inicio', tiempo);
              }}
              valor={rango.inicio}
            />

            <span className="text-text-secondary">–</span>

            <CampoDeHora
              etiqueta={TEXTOS_PARAMETROS.cierre}
              onChange={(tiempo) => {
                cambiarHora(dia, 'fin', tiempo);
              }}
              valor={rango.fin}
            />
          </div>
        );
      })}
    </div>
  );
}

function CampoDeHora({
  etiqueta,
  valor,
  onChange,
}: {
  etiqueta: string;
  valor: string;
  onChange: (tiempo: Time | null) => void;
}) {
  return (
    <TimeField
      aria-label={etiqueta}
      granularity="minute"
      hourCycle={24}
      onChange={onChange}
      value={aTiempo(valor)}
    >
      <TimeField.Group className={clases('w-28')}>
        <TimeField.Input>
          {(segment) => <TimeField.Segment segment={segment} />}
        </TimeField.Input>
      </TimeField.Group>
    </TimeField>
  );
}
