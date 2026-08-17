import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Boton } from '../../components/ui/Boton';
import { CampoTexto } from '../../components/ui/CampoTexto';
import { Casilla } from '../../components/ui/Casilla';
import { HojaInferior } from '../../components/ui/HojaInferior';
import { useCategorias } from '../../hooks/useCategorias';
import { TEXTOS_PUBLICACIONES } from '../../lib/textos';
import { OPCIONES_ESTADO, type FiltrosSeleccionados } from './listado';

function alternar<T>(lista: readonly T[], valor: T): T[] {
  return lista.includes(valor)
    ? lista.filter((elemento) => elemento !== valor)
    : [...lista, valor];
}

/**
 * Hoja de filtros combinables del listado propio (US-PUB-05): categoría
 * (multi-selección), estado de disponibilidad (multi-selección) y rango de
 * precio. Se arma sobre un BORRADOR propio en vez de escribir directo sobre
 * los filtros aplicados: el criterio de aceptación dice explícitamente que los
 * resultados cambian recién "al presionar 'Aplicar filtros'", así que tocar un
 * checkbox no puede disparar la consulta por sí solo.
 *
 * El borrador se reinicia con los filtros vigentes cada vez que la hoja pasa
 * de cerrada a abierta, para que "Aplicar filtros" sea idempotente si se abre
 * y se cierra sin tocar nada. Ese ajuste se hace EN EL RENDER (el patrón que
 * React recomienda para "adaptar el estado a un cambio de prop"), no dentro de
 * un `useEffect`: llamar a `setState` de forma sincrónica dentro de un efecto
 * dispara un render en cascada innecesario.
 */
export function HojaDeFiltros({
  abierta,
  filtros,
  onCerrar,
  onAplicar,
}: {
  abierta: boolean;
  filtros: FiltrosSeleccionados;
  onCerrar: () => void;
  onAplicar: (filtros: FiltrosSeleccionados) => void;
}) {
  const [abiertaPrevia, setAbiertaPrevia] = useState(abierta);
  const [borrador, setBorrador] = useState(filtros);

  if (abierta !== abiertaPrevia) {
    setAbiertaPrevia(abierta);
    if (abierta) setBorrador(filtros);
  }

  return (
    <HojaInferior
      abierta={abierta}
      etiquetaAccesible={TEXTOS_PUBLICACIONES.filtros}
      onCerrar={onCerrar}
    >
      <Text className="mb-4 text-center text-h2 font-bold text-text-primary">
        {TEXTOS_PUBLICACIONES.filtros}
      </Text>

      <ScrollView className="max-h-96">
        <SelectorDeCategorias
          categoriaIds={borrador.categoriaIds}
          onAlternar={(id) => {
            setBorrador((previo) => ({
              ...previo,
              categoriaIds: alternar(previo.categoriaIds, id),
            }));
          }}
        />
        <SelectorDeEstados
          estados={borrador.estados}
          onAlternar={(estado) => {
            setBorrador((previo) => ({
              ...previo,
              estados: alternar(previo.estados, estado),
            }));
          }}
        />
        <RangoDePrecio
          precioMaximo={borrador.precioMaximo}
          precioMinimo={borrador.precioMinimo}
          onCambiarMaximo={(precioMaximo) => {
            setBorrador((previo) => ({ ...previo, precioMaximo }));
          }}
          onCambiarMinimo={(precioMinimo) => {
            setBorrador((previo) => ({ ...previo, precioMinimo }));
          }}
        />
      </ScrollView>

      <Boton
        className="mt-5"
        onPress={() => {
          onAplicar(borrador);
        }}
      >
        {TEXTOS_PUBLICACIONES.aplicarFiltros}
      </Boton>
    </HojaInferior>
  );
}

function SelectorDeCategorias({
  categoriaIds,
  onAlternar,
}: {
  categoriaIds: readonly string[];
  onAlternar: (id: string) => void;
}) {
  const categorias = useCategorias();

  return (
    <>
      <Text className="mb-2 text-label font-semibold text-text-primary">
        {TEXTOS_PUBLICACIONES.categoria}
      </Text>
      {(categorias.data ?? []).map((categoria) => (
        <Casilla
          key={categoria.id}
          nombre={`categoria-${categoria.id}`}
          marcada={categoriaIds.includes(categoria.id)}
          onChange={() => {
            onAlternar(categoria.id);
          }}
          etiquetaAccesible={categoria.nombre}
        >
          <Text className="text-body text-text-primary">
            {categoria.nombre}
          </Text>
        </Casilla>
      ))}
    </>
  );
}

function SelectorDeEstados({
  estados,
  onAlternar,
}: {
  estados: readonly string[];
  onAlternar: (estado: (typeof OPCIONES_ESTADO)[number]['valor']) => void;
}) {
  return (
    <>
      <Text className="mb-2 mt-5 text-label font-semibold text-text-primary">
        {TEXTOS_PUBLICACIONES.disponibilidad}
      </Text>
      {OPCIONES_ESTADO.map((opcion) => (
        <Casilla
          key={opcion.valor}
          nombre={`estado-${opcion.valor}`}
          marcada={estados.includes(opcion.valor)}
          onChange={() => {
            onAlternar(opcion.valor);
          }}
          etiquetaAccesible={opcion.etiqueta}
        >
          <Text className="text-body text-text-primary">{opcion.etiqueta}</Text>
        </Casilla>
      ))}
    </>
  );
}

function RangoDePrecio({
  precioMinimo,
  precioMaximo,
  onCambiarMinimo,
  onCambiarMaximo,
}: {
  precioMinimo: string;
  precioMaximo: string;
  onCambiarMinimo: (valor: string) => void;
  onCambiarMaximo: (valor: string) => void;
}) {
  return (
    <>
      <Text className="mb-2 mt-5 text-label font-semibold text-text-primary">
        {TEXTOS_PUBLICACIONES.rangoDePrecio}
      </Text>
      <View className="flex-row gap-3">
        <CampoTexto
          className="flex-1"
          etiqueta={TEXTOS_PUBLICACIONES.precioMinimo}
          nombre="precio-minimo"
          onChange={onCambiarMinimo}
          tipoTeclado="decimal-pad"
          valor={precioMinimo}
        />
        <CampoTexto
          className="flex-1"
          etiqueta={TEXTOS_PUBLICACIONES.precioMaximo}
          nombre="precio-maximo"
          onChange={onCambiarMaximo}
          tipoTeclado="decimal-pad"
          valor={precioMaximo}
        />
      </View>
    </>
  );
}
