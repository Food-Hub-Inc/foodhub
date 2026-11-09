import { Linking, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  MENSAJES_AYUDA,
  type DiaHorario,
  type HorarioAtencionSemana,
} from '@foodhub/shared';
import { IconoSobre } from '../../../components/iconos';
import { SafeAreaView } from '../../../components/SafeAreaView';
import { Boton } from '../../../components/ui/Boton';
import { EncabezadoPantalla } from '../../../components/ui/EncabezadoPantalla';
import { Esqueleto } from '../../../components/ui/Esqueleto';
import { EstadoDeError } from '../../../components/ui/EstadoDeError';
import { useInformacionDeContacto } from '../../../hooks/useLegal';
import { mensajeDeError } from '../../../lib/api';
import { TEXTOS_LEGAL } from '../../../lib/textos';

const DIAS_ORDEN: DiaHorario[] = [
  'LUNES',
  'MARTES',
  'MIERCOLES',
  'JUEVES',
  'VIERNES',
  'SABADO',
  'DOMINGO',
];

const NOMBRE_DIA: Record<DiaHorario, string> = {
  LUNES: 'Lunes',
  MARTES: 'Martes',
  MIERCOLES: 'Miércoles',
  JUEVES: 'Jueves',
  VIERNES: 'Viernes',
  SABADO: 'Sábado',
  DOMINGO: 'Domingo',
};

interface GrupoDeHorario {
  desde: string;
  hasta: string;
  rango: { inicio: string; fin: string };
}

/**
 * Agrupa días consecutivos que comparten el mismo tramo horario: "Lunes a
 * viernes: 09:00 a 18:00" en vez de cinco líneas repetidas. Los días sin
 * atención no aparecen.
 */
function lineasDeHorario(horario: HorarioAtencionSemana): string[] {
  const grupos: GrupoDeHorario[] = [];
  let desde: string | null = null;
  let hasta: string | null = null;
  let rango: { inicio: string; fin: string } | null = null;

  const volcar = () => {
    if (desde && hasta && rango) {
      grupos.push({ desde, hasta, rango });
    }
  };

  for (const dia of DIAS_ORDEN) {
    const tramo = horario[dia];
    const nombre = NOMBRE_DIA[dia];

    if (tramo === null) {
      volcar();
      desde = null;
      hasta = null;
      rango = null;
      continue;
    }

    if (rango?.inicio === tramo.inicio && rango?.fin === tramo.fin) {
      hasta = nombre;
    } else {
      volcar();
      desde = nombre;
      hasta = nombre;
      rango = tramo;
    }
  }

  volcar();

  return grupos.map((grupo) => {
    const etiqueta =
      grupo.desde === grupo.hasta
        ? grupo.desde
        : `${grupo.desde} a ${grupo.hasta}`;
    return `${etiqueta}: ${grupo.rango.inicio} a ${grupo.rango.fin}`;
  });
}

/**
 * PAN-AYU-04 - Datos de contacto del soporte (CA4).
 *
 * Muestra el correo electronico oficial y los horarios de atencion que el
 * administrador configura desde PAN-ADM-04. El correo se abre con un
 * `Linking.openURL('mailto:...')` para que el usuario elija su app de
 * correo; los horarios son texto plano.
 *
 * Al pie va un acceso directo al formulario de contacto interno
 * (US-AYU-03) que hoy es un placeholder honesto: el boton navega a
 * `/ayuda/contacto` y ahi el usuario ve "EN CONSTRUCCION" hasta que
 * US-AYU-03 se codee en otro sprint.
 */
export function Contacto() {
  const contacto = useInformacionDeContacto();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <EncabezadoPantalla
        destinoAlternativo="/ayuda/legal"
        titulo={TEXTOS_LEGAL.pantallaContacto.titulo}
      />

      {contacto.isError ? (
        <EstadoDeError
          mensaje={mensajeDeError(contacto.error)}
          onReintentar={() => {
            void contacto.refetch();
          }}
        />
      ) : (
        <ScrollView
          contentContainerClassName="px-4 pt-4 pb-8"
          keyboardShouldPersistTaps="handled"
        >
          {contacto.data ? (
            <>
              <Bloque
                etiqueta={MENSAJES_AYUDA.contacto.correoTitulo}
                icono={<IconoSobre className="text-primary" size={20} />}
              >
                <Text
                  accessibilityRole="link"
                  accessibilityLabel={contacto.data.correo}
                  className="text-body font-medium text-primary"
                  onPress={() => {
                    void Linking.openURL(`mailto:${contacto.data.correo}`);
                  }}
                >
                  {contacto.data.correo}
                </Text>
              </Bloque>

              <Bloque
                etiqueta={MENSAJES_AYUDA.contacto.horarioTitulo}
                icono={<IconoSobre className="text-primary" size={20} />}
              >
                {(() => {
                  const lineas = lineasDeHorario(contacto.data.horarioAtencion);
                  return lineas.length > 0 ? (
                    lineas.map((linea) => (
                      <Text className="text-body text-text-primary" key={linea}>
                        {linea}
                      </Text>
                    ))
                  ) : (
                    <Text className="text-body text-text-secondary">
                      {MENSAJES_AYUDA.contacto.horarioVacio}
                    </Text>
                  );
                })()}
              </Bloque>

              <View className="mt-6">
                <Boton
                  onPress={() => {
                    router.push('/ayuda/contacto');
                  }}
                  variante="primario"
                >
                  {MENSAJES_AYUDA.contacto.irAlFormulario}
                </Boton>
              </View>
            </>
          ) : (
            <EsqueletoContacto />
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Bloque({
  etiqueta,
  icono,
  children,
}: {
  etiqueta: string;
  icono: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View className="mb-4 overflow-hidden rounded-md border border-border bg-surface px-4 py-4">
      <View className="mb-2 flex-row items-center gap-2">
        {icono}
        <Text className="text-label font-semibold uppercase text-text-secondary">
          {etiqueta}
        </Text>
      </View>
      {children}
    </View>
  );
}

function EsqueletoContacto() {
  return (
    <View aria-hidden>
      <Esqueleto className="h-3 w-1/3" />
      <Esqueleto className="mt-3 h-16 w-full" />
      <Esqueleto className="mt-3 h-3 w-1/4" />
      <Esqueleto className="mt-3 h-10 w-full" />
    </View>
  );
}
