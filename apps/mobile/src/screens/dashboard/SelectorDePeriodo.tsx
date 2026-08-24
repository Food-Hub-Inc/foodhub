import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { MENSAJES_DASHBOARD, type PeriodoPredefinido } from '@foodhub/shared';
import { IconoChevronIzquierda, IconoTilde } from '../../components/iconos';
import { Boton } from '../../components/ui/Boton';
import { HojaInferior } from '../../components/ui/HojaInferior';
import { MensajeDeCampo } from '../../components/ui/MensajeDeCampo';
import {
  describirFecha,
  finDelDia,
  inicioDelDia,
  seleccionPredefinida,
  type SeleccionDePeriodo,
} from '../../lib/periodos';
import { TEXTOS_DASHBOARD } from '../../lib/textos';
import { CalendarioDeRango } from './CalendarioDeRango';
import { ETIQUETA_DE_PERIODO } from './estados';

/**
 * Selector de período de US-DASH-05.
 *
 * DOS PANELES EN LA MISMA HOJA. Primero las cinco opciones; "Personalizado"
 * cambia el contenido por el calendario en lugar de abrir una segunda hoja
 * encima. Apilar hojas deja al cocinero con dos gestos de cierre distintos y sin
 * saber a cuál vuelve.
 *
 * LAS CUATRO PREDEFINIDAS APLICAN Y CIERRAN DE UNA. El criterio dice que al
 * seleccionar una opción predefinida el dashboard se actualiza "de forma
 * inmediata": pedir una confirmación después de elegir "Este mes" sería un toque
 * de más sin nada que decidir. "Personalizado" sí necesita "Aplicar", porque el
 * rango no está completo hasta que se eligen las dos fechas.
 *
 * EL BORRADOR SE REINICIA CON UNA `key` Y NO CON UN EFECTO. La hoja queda
 * montada siempre, así que sin reiniciarlo la apertura siguiente mostraría las
 * fechas a medio elegir de la anterior. `apertura` cambia en el mismo toque que
 * abre la hoja: React descarta el panel viejo y el nuevo arranca de `seleccion`
 * en su propio `useState`, sin la cascada de renders que provoca llamar a
 * `setState` dentro de un `useEffect`.
 */
export function SelectorDePeriodo({
  abierto,
  apertura,
  onCerrar,
  seleccion,
  onSeleccionar,
}: {
  abierto: boolean;
  /** Cambia en cada apertura. Es la `key` que reinicia el borrador. */
  apertura: number;
  onCerrar: () => void;
  seleccion: SeleccionDePeriodo;
  onSeleccionar: (nueva: SeleccionDePeriodo) => void;
}) {
  return (
    <HojaInferior
      abierta={abierto}
      etiquetaAccesible={TEXTOS_DASHBOARD.opcionesDePeriodo}
      onCerrar={onCerrar}
    >
      <Panel
        key={String(apertura)}
        onCerrar={onCerrar}
        onSeleccionar={onSeleccionar}
        seleccion={seleccion}
      />
    </HojaInferior>
  );
}

/** Decide qué panel se ve. Arranca en el calendario si el período ya era propio. */
function Panel({
  seleccion,
  onSeleccionar,
  onCerrar,
}: {
  seleccion: SeleccionDePeriodo;
  onSeleccionar: (nueva: SeleccionDePeriodo) => void;
  onCerrar: () => void;
}) {
  const eraPersonalizado = seleccion.periodo === 'PERSONALIZADO';
  const [personalizando, setPersonalizando] = useState(eraPersonalizado);

  const aplicar = (nueva: SeleccionDePeriodo) => {
    onSeleccionar(nueva);
    onCerrar();
  };

  if (personalizando) {
    return (
      <PanelPersonalizado
        onAplicar={aplicar}
        onVolver={() => {
          setPersonalizando(false);
        }}
        seleccion={eraPersonalizado ? seleccion : null}
      />
    );
  }

  return (
    <ListaDePeriodos
      onElegirPersonalizado={() => {
        setPersonalizando(true);
      }}
      onElegirPredefinido={(periodo) => {
        aplicar(seleccionPredefinida(periodo));
      }}
      periodoVigente={seleccion.periodo}
    />
  );
}

/** Las cuatro que se calculan solas, en el orden en que las lista el criterio. */
const PREDEFINIDOS: PeriodoPredefinido[] = [
  'SEMANA',
  'MES',
  'TRIMESTRE',
  'ANIO',
];

function ListaDePeriodos({
  periodoVigente,
  onElegirPredefinido,
  onElegirPersonalizado,
}: {
  periodoVigente: SeleccionDePeriodo['periodo'];
  onElegirPredefinido: (periodo: PeriodoPredefinido) => void;
  onElegirPersonalizado: () => void;
}) {
  return (
    <View>
      {PREDEFINIDOS.map((periodo) => (
        <Opcion
          key={periodo}
          elegida={periodoVigente === periodo}
          etiqueta={ETIQUETA_DE_PERIODO[periodo]}
          onPress={() => {
            onElegirPredefinido(periodo);
          }}
        />
      ))}
      <Opcion
        elegida={periodoVigente === 'PERSONALIZADO'}
        etiqueta={MENSAJES_DASHBOARD.periodoPersonalizado}
        onPress={onElegirPersonalizado}
      />
    </View>
  );
}

/**
 * El rango a medida: dos campos, el calendario y "Aplicar".
 *
 * El primer toque fija "Desde" y pasa el foco a "Hasta"; el segundo fija
 * "Hasta". El cocinero puede volver a cualquiera de los dos tocando su campo, y
 * de ahí sale el rango invertido que el criterio pide contemplar: el mensaje
 * aparece y "Aplicar" queda apagado hasta que el rango vuelva a ser válido.
 */
function PanelPersonalizado({
  seleccion,
  onAplicar,
  onVolver,
}: {
  /** El rango vigente si ya era personalizado; si no, se arranca en blanco. */
  seleccion: SeleccionDePeriodo | null;
  onAplicar: (nueva: SeleccionDePeriodo) => void;
  onVolver: () => void;
}) {
  const [desde, setDesde] = useState<Date | null>(seleccion?.desde ?? null);
  const [hasta, setHasta] = useState<Date | null>(seleccion?.hasta ?? null);
  const [extremo, setExtremo] = useState<'desde' | 'hasta'>('desde');

  const rangoInvertido =
    desde !== null && hasta !== null && desde.getTime() > hasta.getTime();
  const puedeAplicar = desde !== null && hasta !== null && !rangoInvertido;

  const elegirFecha = (fecha: Date) => {
    if (extremo === 'desde') {
      setDesde(inicioDelDia(fecha));
      setExtremo('hasta');
      return;
    }
    setHasta(finDelDia(fecha));
  };

  const aplicar = () => {
    if (desde === null || hasta === null || rangoInvertido) return;
    onAplicar({ periodo: 'PERSONALIZADO', desde, hasta });
  };

  return (
    <View>
      <View className="mb-3 flex-row items-center gap-1">
        <Pressable
          onPress={onVolver}
          className="h-11 w-11 items-center justify-center"
          accessibilityRole="button"
          accessibilityLabel={TEXTOS_DASHBOARD.volverALosPeriodos}
        >
          <IconoChevronIzquierda size={20} className="text-text-primary" />
        </Pressable>
        <Text
          className="text-h2 font-bold text-text-primary"
          accessibilityRole="header"
        >
          {MENSAJES_DASHBOARD.periodoPersonalizado}
        </Text>
      </View>

      <CamposDelRango
        desde={desde}
        extremo={extremo}
        hasta={hasta}
        onElegirExtremo={setExtremo}
      />

      <MensajeDeCampo
        idCampo="periodo-desde"
        mensaje={rangoInvertido ? MENSAJES_DASHBOARD.rangoInvertido : undefined}
      />

      <View className="mt-4">
        <CalendarioDeRango
          desde={desde}
          hasta={hasta}
          onElegirFecha={elegirFecha}
        />
      </View>

      <View className="mt-5">
        <Boton deshabilitado={!puedeAplicar} onPress={aplicar}>
          {MENSAJES_DASHBOARD.aplicar}
        </Boton>
      </View>
    </View>
  );
}

/** Los dos campos del rango, uno al lado del otro. El activo lleva el borde. */
function CamposDelRango({
  desde,
  hasta,
  extremo,
  onElegirExtremo,
}: {
  desde: Date | null;
  hasta: Date | null;
  extremo: 'desde' | 'hasta';
  onElegirExtremo: (extremo: 'desde' | 'hasta') => void;
}) {
  return (
    <View className="flex-row gap-3">
      <CampoDeFecha
        activo={extremo === 'desde'}
        fecha={desde}
        onPress={() => {
          onElegirExtremo('desde');
        }}
        rotulo={MENSAJES_DASHBOARD.desde}
      />
      <CampoDeFecha
        activo={extremo === 'hasta'}
        fecha={hasta}
        onPress={() => {
          onElegirExtremo('hasta');
        }}
        rotulo={MENSAJES_DASHBOARD.hasta}
      />
    </View>
  );
}

/** Una fila de la lista de períodos, con el tilde sobre la vigente. */
function Opcion({
  etiqueta,
  elegida,
  onPress,
}: {
  etiqueta: string;
  elegida: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="h-14 flex-row items-center justify-between border-b border-border"
      accessibilityRole="radio"
      accessibilityState={{ checked: elegida }}
    >
      <Text
        className={`text-body ${
          elegida ? 'font-bold text-primary' : 'text-text-primary'
        }`}
      >
        {etiqueta}
      </Text>
      {elegida ? <IconoTilde size={20} className="text-primary" /> : null}
    </Pressable>
  );
}

/**
 * Uno de los dos campos del rango. Muestra la fecha elegida o un guion largo
 * mientras no haya ninguna, el mismo símbolo con el que US-DASH-01 marca un
 * valor ausente.
 */
function CampoDeFecha({
  rotulo,
  fecha,
  activo,
  onPress,
}: {
  rotulo: string;
  fecha: Date | null;
  activo: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`min-h-14 flex-1 justify-center rounded-sm border bg-surface px-3 py-2 ${
        activo ? 'border-primary' : 'border-border'
      }`}
      accessibilityRole="button"
      accessibilityState={{ selected: activo }}
    >
      <Text className="text-label font-semibold text-text-secondary">
        {rotulo}
      </Text>
      <Text className="text-body font-bold text-text-primary">
        {fecha === null ? MENSAJES_DASHBOARD.sinValor : describirFecha(fecha)}
      </Text>
    </Pressable>
  );
}
