import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { registroCocineroSchema, type Ubicacion } from '@foodhub/shared';
import { registrarCocinero } from '../../src/api/auth';
import { SafeAreaView } from '../../src/components/SafeAreaView';
import { CamposDeRegistro } from '../../src/components/registro/CamposDeRegistro';
import { PieDeRegistro } from '../../src/components/registro/PieDeRegistro';
import { AreaTexto } from '../../src/components/ui/AreaTexto';
import { Aviso } from '../../src/components/ui/Aviso';
import { EncabezadoPantalla } from '../../src/components/ui/EncabezadoPantalla';
import { Etiqueta } from '../../src/components/ui/Etiqueta';
import type { FotoElegida } from '../../src/components/ui/SelectorDeFoto';
import { SelectorDeUbicacion } from '../../src/components/ui/SelectorDeUbicacion';
import { useFormulario } from '../../src/hooks/useFormulario';
import { useRegistro } from '../../src/hooks/useRegistro';
import { TEXTOS_REGISTRO } from '../../src/lib/textos';

/**
 * PAN-AUT-02 · Registro de cocinero — US-AUT-02.
 *
 * Agrega dos campos sobre el registro de cliente:
 *
 *   UBICACIÓN    obligatoria. Es lo que posiciona al cocinero en el feed por
 *                cercanía, en el mapa y en el filtro por distancia; sin ella la
 *                cuenta existe pero ningún vecino la encuentra. La base lo
 *                garantiza con el CHECK `usuario_cocinero_con_ubicacion`.
 *   DESCRIPCIÓN  OPCIONAL, aunque el mockup la dibuje con asterisco. El criterio
 *                de aceptación de US-AUT-02 la define como opcional y, cuando la
 *                maquetación y el documento difieren, manda el documento.
 *
 * El destino después del alta es «Mis publicaciones», no el feed. Lo resuelve
 * `GateDeSesion` a partir del rol del perfil.
 */
export default function RegistroCocinero() {
  const [foto, setFoto] = useState<FotoElegida | null>(null);
  const registro = useRegistro(registrarCocinero);

  const formulario = useFormulario(
    registroCocineroSchema,
    {
      nombre: '',
      apellido: '',
      email: '',
      password: '',
      confirmPassword: '',
      descripcionPublica: '',
      ubicacion: null as Ubicacion | null,
      terminosAceptados: false,
    },
    registro.errorCorreo === undefined
      ? undefined
      : { email: registro.errorCorreo },
  );

  function enviar() {
    formulario.revelarErrores();
    if (formulario.datos) void registro.enviar(formulario.datos);
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <EncabezadoPantalla
        destinoAlternativo="/bienvenida"
        titulo={TEXTOS_REGISTRO.tituloCocinero}
      />

      <ScrollView
        contentContainerClassName="px-6 pt-4 pb-10"
        keyboardShouldPersistTaps="handled"
      >
        <Avisos errorGeneral={registro.errorGeneral} />

        <CamposDeRegistro
          control={{
            valores: formulario.valores,
            mensajeDe: (campo) => formulario.mensajeDe(campo),
            fijar: (campo, valor) => {
              formulario.fijar(campo, valor);
            },
          }}
        />

        <CamposDeCocinero
          descripcion={formulario.valores.descripcionPublica}
          errorDescripcion={formulario.mensajeDe('descripcionPublica')}
          errorUbicacion={formulario.mensajeDe('ubicacion')}
          onDescripcion={(valor) => {
            formulario.fijar('descripcionPublica', valor);
          }}
          onUbicacion={(valor) => {
            formulario.fijar('ubicacion', valor);
          }}
          ubicacion={formulario.valores.ubicacion}
        />

        <PieDeRegistro
          enviando={registro.enviando}
          errorTerminos={formulario.mensajeDe('terminosAceptados')}
          foto={foto}
          onEnviar={enviar}
          onFoto={setFoto}
          onTerminos={(aceptados) => {
            formulario.fijar('terminosAceptados', aceptados);
          }}
          puedeEnviar={formulario.esValido}
          terminosAceptados={formulario.valores.terminosAceptados}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * El banner que explica el rol y, si lo hubo, el fallo del alta.
 *
 * El informativo es parte del encabezado que dibuja la maquetación de
 * PAN-AUT-02 y por eso esta pantalla no repite la bajada del registro de
 * cliente: ese aviso ocupa su lugar.
 */
function Avisos({ errorGeneral }: { errorGeneral: string | null }) {
  return (
    <>
      <Aviso
        className="mb-5"
        mensaje={TEXTOS_REGISTRO.avisoCocinero}
        tono="informativo"
      />
      {errorGeneral === null ? null : (
        <Aviso className="mb-5" mensaje={errorGeneral} tono="error" />
      )}
    </>
  );
}

/**
 * Los dos campos que distinguen el registro de cocinero del de cliente.
 *
 * La descripción es OPCIONAL —así lo fija el criterio de aceptación de
 * US-AUT-02, aunque el mockup la dibuje con asterisco— y la ubicación es
 * obligatoria, con su asterisco explícito.
 */
function CamposDeCocinero({
  descripcion,
  errorDescripcion,
  onDescripcion,
  ubicacion,
  errorUbicacion,
  onUbicacion,
}: {
  descripcion: string;
  errorDescripcion: string | undefined;
  onDescripcion: (valor: string) => void;
  ubicacion: Ubicacion | null;
  errorUbicacion: string | undefined;
  onUbicacion: (valor: Ubicacion) => void;
}) {
  return (
    <>
      <AreaTexto
        className="mt-4"
        error={errorDescripcion}
        etiqueta={TEXTOS_REGISTRO.descripcion}
        maximo={500}
        nombre="descripcionPublica"
        onChange={onDescripcion}
        placeholder={TEXTOS_REGISTRO.descripcionPlaceholder}
        valor={descripcion}
      />

      <View className="mt-5">
        <Etiqueta idCampo="ubicacion" obligatorio>
          {TEXTOS_REGISTRO.ubicacion}
        </Etiqueta>
        <SelectorDeUbicacion
          error={errorUbicacion}
          onCambiar={onUbicacion}
          ubicacion={ubicacion}
        />
      </View>
    </>
  );
}
