import { ScrollView, View } from 'react-native';
import { z } from 'zod';
import {
  crearPublicacionSchema,
  FORMATOS_IMAGEN_PLATO,
  MAXIMO_IMAGEN_PLATO_BYTES,
  MENSAJES_PUBLICACION,
} from '@foodhub/shared';
import { AreaTexto } from '../../components/ui/AreaTexto';
import { Boton, BotonDeTexto } from '../../components/ui/Boton';
import {
  CampoDesplegable,
  type OpcionDesplegable,
} from '../../components/ui/CampoDesplegable';
import { CampoTexto } from '../../components/ui/CampoTexto';
import {
  SelectorDeFoto,
  type FotoElegida,
} from '../../components/ui/SelectorDeFoto';
import { useCategorias } from '../../hooks/useCategorias';
import { useFormulario, type Formulario } from '../../hooks/useFormulario';
import type { ConfiguracionFoto } from '../../hooks/useSelectorDeFoto';
import { TEXTOS_PUBLICACIONES } from '../../lib/textos';

/**
 * Formulario de un plato (PAN-PUB-02, US-PUB-01) — pensado desde el inicio
 * para que US-PUB-02 lo reuse en modo edición vía `valoresIniciales`, sin
 * tener que reescribirlo: solo agrega la precarga de datos y el botón "Quitar
 * imagen" sobre esta misma base.
 *
 * QUÉ NO HACE, A PROPÓSITO: no abre ningún diálogo de confirmación ni conoce
 * la mutación que lo persiste. Eso queda en la pantalla que lo usa
 * (`NuevaPublicacion`), porque el contenido de esos diálogos difiere entre
 * crear y editar -el de "Cancelar" en la edición, por ejemplo, solo aparece
 * "con cambios pendientes" y el de confirmar edición no lleva mensaje propio-
 * y mezclar esa lógica acá acoplaría un componente compartido a las dos
 * historias a la vez.
 */

/**
 * La firma de índice final es necesaria y no decorativa: `useFormulario`
 * exige que `TValores` satisfaga `Record<string, unknown>`, y una interfaz sin
 * índice de firma no lo cumple aunque sus campos coincidan -particularidad
 * conocida de TypeScript-. Es segura porque los cinco campos ya declarados son
 * `string`, el mismo tipo que el índice.
 */
interface ValoresPublicacion {
  nombre: string;
  descripcion: string;
  precio: string;
  categoriaId: string;
  tiempoEstimadoPreparacion: string;
  [campo: string]: string;
}

const VALORES_INICIALES: ValoresPublicacion = {
  nombre: '',
  descripcion: '',
  precio: '',
  categoriaId: '',
  tiempoEstimadoPreparacion: '',
};

/**
 * El tiempo estimado es el único campo del alta que el usuario escribe como
 * texto pero el contrato espera como número
 * (`tiempoEstimadoPreparacionSchema` en `@foodhub/shared`): esta pieza
 * traduce el string del input a `number | undefined`, con los mismos dos
 * mensajes que ya usa el schema del servidor para que un valor inválido se
 * rechace igual de los dos lados.
 */
const tiempoEstimadoFormSchema = z
  .string()
  .trim()
  .refine((valor) => valor === '' || /^\d+$/.test(valor), {
    message: 'El tiempo estimado debe ser un número entero de minutos.',
  })
  .refine((valor) => valor === '' || Number(valor) > 0, {
    message: 'El tiempo estimado debe ser mayor a 0.',
  })
  .transform((valor) => (valor === '' ? undefined : Number(valor)));

/**
 * Valida los mismos cuatro campos obligatorios que `crearPublicacionSchema`
 * -reusando sus piezas para no duplicar ni desincronizar sus mensajes- más el
 * tiempo estimado en su forma de texto. La imagen no participa acá:
 * `SelectorDeFoto` ya valida formato y tamaño por su cuenta, y la URL
 * definitiva se resuelve recién al confirmar el envío (ver `NuevaPublicacion`).
 */
const formularioPublicacionSchema = z.object({
  nombre: crearPublicacionSchema.shape.nombre,
  descripcion: crearPublicacionSchema.shape.descripcion,
  precio: crearPublicacionSchema.shape.precio,
  categoriaId: crearPublicacionSchema.shape.categoriaId,
  tiempoEstimadoPreparacion: tiempoEstimadoFormSchema,
});

export type DatosFormularioPublicacion = z.infer<
  typeof formularioPublicacionSchema
>;

const CONFIGURACION_FOTO_PLATO: ConfiguracionFoto = {
  formatosPermitidos: FORMATOS_IMAGEN_PLATO,
  maximoBytes: MAXIMO_IMAGEN_PLATO_BYTES,
  mensajeInvalida: MENSAJES_PUBLICACION.imagenInvalida,
  etiqueta: TEXTOS_PUBLICACIONES.campoImagen,
  textoAgregar: TEXTOS_PUBLICACIONES.agregarFoto,
  textoCambiar: TEXTOS_PUBLICACIONES.cambiarFoto,
  idCampo: 'imagen-plato',
};

export function FormularioDePublicacion({
  foto,
  onFoto,
  onEnviar,
  onCancelar,
  enviando,
  textoBoton,
  valoresIniciales = VALORES_INICIALES,
}: {
  foto: FotoElegida | null;
  onFoto: (foto: FotoElegida | null) => void;
  onEnviar: (datos: DatosFormularioPublicacion) => void;
  onCancelar: () => void;
  enviando: boolean;
  textoBoton: string;
  /** US-PUB-02 la usa para precargar el formulario en modo edición. */
  valoresIniciales?: ValoresPublicacion;
}) {
  const categorias = useCategorias();
  const formulario = useFormulario(
    formularioPublicacionSchema,
    valoresIniciales,
  );
  const opciones: OpcionDesplegable[] = (categorias.data ?? []).map(
    (categoria) => ({ valor: categoria.id, etiqueta: categoria.nombre }),
  );

  function enviar() {
    formulario.revelarErrores();
    if (formulario.datos) onEnviar(formulario.datos);
  }

  return (
    <ScrollView
      contentContainerClassName="px-4 pb-10 pt-4"
      keyboardShouldPersistTaps="handled"
    >
      <Campos formulario={formulario} opciones={opciones} />

      <View className="mt-4">
        <SelectorDeFoto
          configuracion={CONFIGURACION_FOTO_PLATO}
          foto={foto}
          onElegir={onFoto}
        />
      </View>

      <Pie
        enviando={enviando}
        onCancelar={onCancelar}
        onEnviar={enviar}
        puedeEnviar={formulario.esValido}
        textoBoton={textoBoton}
      />
    </ScrollView>
  );
}

/** Los cinco campos de texto/selección del plato, en el orden del criterio de aceptación. */
function Campos({
  formulario,
  opciones,
}: {
  formulario: Formulario<ValoresPublicacion, DatosFormularioPublicacion>;
  opciones: OpcionDesplegable[];
}) {
  return (
    <>
      <CampoTexto
        etiqueta={TEXTOS_PUBLICACIONES.campoNombre}
        error={formulario.mensajeDe('nombre')}
        nombre="nombre"
        obligatorio
        onChange={(valor) => {
          formulario.fijar('nombre', valor);
        }}
        valor={formulario.valores.nombre}
      />

      <AreaTexto
        className="mt-4"
        etiqueta={TEXTOS_PUBLICACIONES.descripcion}
        error={formulario.mensajeDe('descripcion')}
        maximo={500}
        nombre="descripcion"
        obligatorio
        onChange={(valor) => {
          formulario.fijar('descripcion', valor);
        }}
        valor={formulario.valores.descripcion}
      />

      <CampoTexto
        className="mt-4"
        etiqueta={TEXTOS_PUBLICACIONES.campoPrecio}
        error={formulario.mensajeDe('precio')}
        nombre="precio"
        obligatorio
        onChange={(valor) => {
          // El usuario escribe el decimal con coma ("150,50"): se normaliza
          // acá, antes de que el schema lo valide, al punto que espera el
          // contrato (ver el comentario de `precioSchema` en packages/shared).
          formulario.fijar('precio', valor.replace(',', '.'));
        }}
        tipoTeclado="decimal-pad"
        valor={formulario.valores.precio}
      />

      <View className="mt-4">
        <CampoDesplegable
          etiqueta={TEXTOS_PUBLICACIONES.categoria}
          error={formulario.mensajeDe('categoriaId')}
          nombre="categoriaId"
          obligatorio
          onCambiar={(valor) => {
            formulario.fijar('categoriaId', valor);
          }}
          opciones={opciones}
          placeholder={TEXTOS_PUBLICACIONES.categoriaPlaceholder}
          valor={formulario.valores.categoriaId}
        />
      </View>

      <CampoTexto
        className="mt-4"
        etiqueta={TEXTOS_PUBLICACIONES.tiempoEstimado}
        error={formulario.mensajeDe('tiempoEstimadoPreparacion')}
        nombre="tiempoEstimadoPreparacion"
        onChange={(valor) => {
          formulario.fijar(
            'tiempoEstimadoPreparacion',
            valor.replace(/\D/g, ''),
          );
        }}
        tipoTeclado="number-pad"
        valor={formulario.valores.tiempoEstimadoPreparacion}
      />
    </>
  );
}

/** El botón de envío -deshabilitado hasta completar los obligatorios- y "Cancelar". */
function Pie({
  enviando,
  onCancelar,
  onEnviar,
  puedeEnviar,
  textoBoton,
}: {
  enviando: boolean;
  onCancelar: () => void;
  onEnviar: () => void;
  puedeEnviar: boolean;
  textoBoton: string;
}) {
  return (
    <>
      <Boton
        cargando={enviando}
        className="mt-6"
        deshabilitado={!puedeEnviar}
        onPress={onEnviar}
      >
        {textoBoton}
      </Boton>

      <View className="mt-3 items-center">
        <BotonDeTexto className="text-text-primary" onPress={onCancelar}>
          {TEXTOS_PUBLICACIONES.cancelar}
        </BotonDeTexto>
      </View>
    </>
  );
}
