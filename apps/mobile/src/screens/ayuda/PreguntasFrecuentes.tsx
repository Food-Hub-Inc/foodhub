import { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import {
  CATEGORIAS_FAQ_CLIENTE,
  CATEGORIAS_FAQ_COCINERO,
  MENSAJES_AYUDA,
  type Faq,
} from '@foodhub/shared';
import { router } from 'expo-router';
import { IconoAyuda, IconoBuscar } from '../../components/iconos';
import { SafeAreaView } from '../../components/SafeAreaView';
import { Boton } from '../../components/ui/Boton';
import { CampoTexto } from '../../components/ui/CampoTexto';
import { EncabezadoPantalla } from '../../components/ui/EncabezadoPantalla';
import { Esqueleto } from '../../components/ui/Esqueleto';
import { EstadoDeError } from '../../components/ui/EstadoDeError';
import { EstadoVacio } from '../../components/ui/EstadoVacio';
import { useFaqs, useFaqsVotadas, useVotarFaq } from '../../hooks/useFaq';
import { usePerfil } from '../../hooks/usePerfil';
import { mensajeDeError } from '../../lib/api';
import { TEXTOS_AYUDA } from '../../lib/textos';
import { TarjetaFaq } from './TarjetaFaq';

interface SeccionFaq {
  categoria: string;
  faqs: Faq[];
}

function agruparPorCategoria(
  faqs: Faq[],
  categoriasOrdenadas: readonly string[],
): SeccionFaq[] {
  const grupos = new Map<string, Faq[]>();
  for (const faq of faqs) {
    const categoria = faq.categoria ?? 'Otras preguntas';
    const grupo = grupos.get(categoria) ?? [];
    grupo.push(faq);
    grupos.set(categoria, grupo);
  }

  const categorias = [
    ...categoriasOrdenadas,
    ...Array.from(grupos.keys()).filter(
      (categoria) => !categoriasOrdenadas.includes(categoria),
    ),
  ];

  return categorias.flatMap((categoria) => {
    const faqsDeCategoria = grupos.get(categoria);
    return faqsDeCategoria ? [{ categoria, faqs: faqsDeCategoria }] : [];
  });
}

function coincideConBusqueda(faq: Faq, consulta: string): boolean {
  const termino = consulta.trim().toLocaleLowerCase('es-AR');
  if (!termino) return true;
  return (
    faq.pregunta.toLocaleLowerCase('es-AR').includes(termino) ||
    faq.respuesta.toLocaleLowerCase('es-AR').includes(termino)
  );
}

function CargandoFaqs() {
  return (
    <View className="px-4 pt-4">
      <Esqueleto className="h-14 rounded-sm" />
      <Esqueleto className="mt-5 h-8 w-40 rounded-xs" />
      <Esqueleto className="mt-3 h-16 rounded-md" />
      <Esqueleto className="mt-3 h-16 rounded-md" />
      <Esqueleto className="mt-5 h-8 w-32 rounded-xs" />
      <Esqueleto className="mt-3 h-16 rounded-md" />
    </View>
  );
}

/** US-AYU-02 · Preguntas frecuentes filtradas por el rol autenticado. */
export function PreguntasFrecuentes() {
  const [consulta, setConsulta] = useState('');
  const perfil = usePerfil();
  const faqs = useFaqs();
  const votar = useVotarFaq();
  const idsVotados = useFaqsVotadas((estado) => estado.ids);
  const categorias =
    perfil.data?.tipo === 'COCINERO'
      ? CATEGORIAS_FAQ_COCINERO
      : CATEGORIAS_FAQ_CLIENTE;

  const faqsFiltradas = useMemo(
    () => faqs.data?.filter((faq) => coincideConBusqueda(faq, consulta)) ?? [],
    [consulta, faqs.data],
  );
  const secciones = useMemo(
    () => agruparPorCategoria(faqsFiltradas, categorias),
    [categorias, faqsFiltradas],
  );
  return (
    <SafeAreaView className="flex-1 bg-background">
      <EncabezadoPantalla
        destinoAlternativo="/ayuda"
        titulo={TEXTOS_AYUDA.preguntasFrecuentes}
      />

      {faqs.isPending ? <CargandoFaqs /> : null}

      {faqs.isError ? (
        <EstadoDeError
          mensaje={mensajeDeError(faqs.error)}
          onReintentar={() => {
            void faqs.refetch();
          }}
        />
      ) : null}

      {faqs.data ? (
        <VistaFaqs
          consulta={consulta}
          datos={faqs.data}
          idsVotados={idsVotados}
          onCambiarConsulta={setConsulta}
          secciones={secciones}
          votar={votar}
        />
      ) : null}
    </SafeAreaView>
  );
}

function VistaFaqs({
  consulta,
  datos,
  idsVotados,
  onCambiarConsulta,
  secciones,
  votar,
}: {
  consulta: string;
  datos: Faq[];
  idsVotados: ReadonlySet<string>;
  onCambiarConsulta: (valor: string) => void;
  secciones: SeccionFaq[];
  votar: ReturnType<typeof useVotarFaq>;
}) {
  const sinResultados = consulta.trim().length > 0 && secciones.length === 0;

  return (
    <View className="flex-1">
      <BusquedaFaqs consulta={consulta} onCambiarConsulta={onCambiarConsulta} />
      {datos.length === 0 ? (
        <EstadoVacio
          icono={<IconoAyuda className="text-primary" size={28} />}
          subtitulo={TEXTOS_AYUDA.sinPreguntasSubtitulo}
          titulo={TEXTOS_AYUDA.sinPreguntasTitulo}
        />
      ) : sinResultados ? (
        <EstadoSinResultados />
      ) : (
        <ListaFaqs
          consulta={consulta}
          idsVotados={idsVotados}
          secciones={secciones}
          votar={votar}
        />
      )}
    </View>
  );
}

function BusquedaFaqs({
  consulta,
  onCambiarConsulta,
}: {
  consulta: string;
  onCambiarConsulta: (valor: string) => void;
}) {
  return (
    <View className="px-4 pt-4">
      <CampoTexto
        className="mb-1"
        etiqueta={TEXTOS_AYUDA.buscar}
        icono={<IconoBuscar className="text-text-secondary" size={20} />}
        nombre="buscar-faq"
        onChange={onCambiarConsulta}
        placeholder={TEXTOS_AYUDA.buscarPlaceholder}
        valor={consulta}
      />
    </View>
  );
}

function EstadoSinResultados() {
  return (
    <EstadoVacio
      accion={
        <Boton
          onPress={() => {
            router.push('/ayuda/contacto');
          }}
          tamano="sm"
        >
          {MENSAJES_AYUDA.contactarSoporte}
        </Boton>
      }
      icono={<IconoBuscar className="text-primary" size={28} />}
      titulo={MENSAJES_AYUDA.sinResultados}
    />
  );
}

function ListaFaqs({
  consulta,
  idsVotados,
  secciones,
  votar,
}: {
  consulta: string;
  idsVotados: ReadonlySet<string>;
  secciones: SeccionFaq[];
  votar: ReturnType<typeof useVotarFaq>;
}) {
  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="px-4 pt-4 pb-10"
      keyboardShouldPersistTaps="handled"
    >
      {secciones.map((seccion) => (
        <View key={seccion.categoria}>
          <Text className="mb-3 mt-2 text-h3 font-bold text-text-primary">
            {seccion.categoria}
          </Text>
          {seccion.faqs.map((faq) => (
            <TarjetaFaq
              consulta={consulta}
              faq={faq}
              key={faq.id}
              onVotar={(util) => {
                votar.mutate({ id: faq.id, util });
              }}
              votada={idsVotados.has(faq.id)}
              votando={votar.isPending}
            />
          ))}
        </View>
      ))}
    </ScrollView>
  );
}
