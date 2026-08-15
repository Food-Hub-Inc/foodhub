import type { ReactNode } from 'react';
import { Input, Label, TextField } from '@heroui/react';
import { esUuid } from '../../api/auditoria.js';
import { TEXTOS_AUDITORIA } from '../../lib/textos.js';

/**
 * Filtros que comparten las dos solapas de PAN-AUD-01: rango de fechas, IP de
 * origen e identificador de usuario.
 *
 * El tercer criterio de US-AUD-02 enumera exactamente esos filtros más el tipo
 * de operación. No se agregan otros: cada filtro de más es una columna que hay
 * que indexar y una opción más que el administrador tiene que descartar.
 */
export function FiltrosComunes({
  desde,
  hasta,
  ipOrigen,
  usuarioId,
  alCambiar,
  rangoInvalido,
}: {
  desde: string;
  hasta: string;
  ipOrigen: string;
  usuarioId: string;
  alCambiar: (cambio: {
    desde?: string;
    hasta?: string;
    ipOrigen?: string;
    usuarioId?: string;
  }) => void;
  rangoInvalido: boolean;
}) {
  /**
   * El filtro solo se aplica con el identificador completo, porque el contrato
   * lo valida con `z.uuid()`. Mientras se escribe, el campo avisa que todavía
   * no está filtrando en vez de dejar creer que sí.
   */
  const idIncompleto = usuarioId.trim() !== '' && !esUuid(usuarioId);

  return (
    <>
      <CampoDeFiltro
        alCambiar={(valor) => {
          alCambiar({ desde: valor });
        }}
        etiqueta={TEXTOS_AUDITORIA.desde}
        invalido={rangoInvalido}
        tipo="date"
        valor={desde}
      />

      <CampoDeFiltro
        alCambiar={(valor) => {
          alCambiar({ hasta: valor });
        }}
        etiqueta={TEXTOS_AUDITORIA.hasta}
        invalido={rangoInvalido}
        tipo="date"
        valor={hasta}
      />

      <CampoDeFiltro
        alCambiar={(valor) => {
          alCambiar({ ipOrigen: valor });
        }}
        etiqueta={TEXTOS_AUDITORIA.ipEtiqueta}
        placeholder={TEXTOS_AUDITORIA.ip}
        valor={ipOrigen}
      />

      <CampoDeFiltro
        alCambiar={(valor) => {
          alCambiar({ usuarioId: valor });
        }}
        ancho="w-[228px]"
        ayuda={
          idIncompleto ? (
            <p className="mt-1 text-caption text-warning">
              {TEXTOS_AUDITORIA.usuarioIdInvalido}
            </p>
          ) : null
        }
        claseInput="font-mono"
        etiqueta={TEXTOS_AUDITORIA.usuarioIdEtiqueta}
        invalido={idIncompleto}
        placeholder={TEXTOS_AUDITORIA.usuarioId}
        valor={usuarioId}
      />
    </>
  );
}

/**
 * Campo de una barra de filtros: etiqueta arriba, input debajo y, si hace
 * falta, una nota al pie.
 *
 * La etiqueta es visible y no un `placeholder`: el texto de sugerencia
 * desaparece al escribir, y con cuatro filtros seguidos nadie recuerda cuál era
 * cuál al volver a la pantalla.
 */
function CampoDeFiltro({
  etiqueta,
  valor,
  alCambiar,
  tipo = 'text',
  placeholder,
  invalido = false,
  ancho = 'w-[168px]',
  claseInput = '',
  ayuda = null,
}: {
  etiqueta: string;
  valor: string;
  alCambiar: (valor: string) => void;
  tipo?: 'text' | 'date';
  placeholder?: string | undefined;
  invalido?: boolean;
  ancho?: string;
  claseInput?: string;
  ayuda?: ReactNode;
}) {
  return (
    <TextField
      className={ancho}
      isInvalid={invalido}
      onChange={alCambiar}
      type={tipo}
      value={valor}
    >
      <Label className="text-label text-text-secondary">{etiqueta}</Label>
      <Input
        className={`w-full ${claseInput}`}
        {...(placeholder === undefined ? {} : { placeholder })}
      />
      {ayuda}
    </TextField>
  );
}
