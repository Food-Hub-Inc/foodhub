import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { solicitarRecuperacionSchema } from '@foodhub/shared';
import { solicitarRecuperacion } from '../../src/api/auth';
import { SafeAreaView } from '../../src/components/SafeAreaView';
import { IconoSobre } from '../../src/components/iconos';
import { Aviso } from '../../src/components/ui/Aviso';
import { Boton, BotonDeTexto } from '../../src/components/ui/Boton';
import { CampoTexto } from '../../src/components/ui/CampoTexto';
import { EncabezadoPantalla } from '../../src/components/ui/EncabezadoPantalla';
import { PantallaConTeclado } from '../../src/components/ui/PantallaConTeclado';
import { useFormulario } from '../../src/hooks/useFormulario';
import { mensajeDeError } from '../../src/lib/api';
import { TEXTOS_RECUPERAR } from '../../src/lib/textos';

/**
 * PAN-AUT-04 · Recuperar contraseña — US-AUT-04.
 *
 * Esta pantalla REVELA si un correo tiene cuenta: un correo registrado responde
 * «Te enviamos un enlace…» y uno que no existe, «No existe una cuenta asociada
 * a ese correo electrónico.». Es una decisión consciente del equipo tomada
 * sobre el criterio de aceptación textual de US-AUT-04, no un descuido: la
 * maquetación proponía un mensaje neutral y se resolvió seguir el documento.
 *
 * La mitigación de la enumeración de cuentas está del lado del servidor, con un
 * rate limit más estricto que el general y el registro de cada consulta.
 *
 * Los dos mensajes los devuelve la API ya redactados, así que la pantalla los
 * muestra tal cual en vez de tener su propia copia de los literales.
 */
export default function Recuperar() {
  const [resultado, setResultado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const formulario = useFormulario(solicitarRecuperacionSchema, { email: '' });

  async function enviar() {
    formulario.revelarErrores();
    const datos = formulario.datos;
    if (!datos) return;

    setResultado(null);
    setError(null);
    setEnviando(true);

    try {
      const respuesta = await solicitarRecuperacion(datos);
      setResultado(respuesta.mensaje);
    } catch (fallo) {
      // Incluye el 404 de correo no registrado, cuyo literal exige la historia.
      setError(mensajeDeError(fallo));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <EncabezadoPantalla
        destinoAlternativo="/login"
        titulo={TEXTOS_RECUPERAR.titulo}
      />

      <PantallaConTeclado contentContainerClassName="grow px-6 pt-6 pb-10">
        <Text className="text-h2 font-bold text-text-primary">
          {TEXTOS_RECUPERAR.encabezado}
        </Text>
        <Text className="mt-2 mb-6 text-body text-text-secondary">
          {TEXTOS_RECUPERAR.bajada}
        </Text>

        {resultado === null ? null : (
          <Aviso className="mb-5" mensaje={resultado} tono="exito" />
        )}
        {error === null ? null : (
          <Aviso className="mb-5" mensaje={error} tono="error" />
        )}

        <CampoTexto
          autoCompletar="email"
          error={formulario.mensajeDe('email')}
          etiqueta={TEXTOS_RECUPERAR.correo}
          icono={<IconoSobre className="text-text-disabled" size={20} />}
          nombre="email"
          obligatorio
          onChange={(valor) => {
            formulario.fijar('email', valor);
          }}
          placeholder={TEXTOS_RECUPERAR.correoPlaceholder}
          tipoTeclado="email-address"
          valor={formulario.valores.email}
        />

        <Boton
          cargando={enviando}
          className="mt-6"
          onPress={() => void enviar()}
          textoCargando={TEXTOS_RECUPERAR.enviando}
        >
          {TEXTOS_RECUPERAR.enviar}
        </Boton>

        <View className="mt-7 items-center">
          <BotonDeTexto
            className="text-text-secondary"
            onPress={() => {
              router.replace('/login');
            }}
          >
            {TEXTOS_RECUPERAR.volverAlLogin}
          </BotonDeTexto>
        </View>
      </PantallaConTeclado>
    </SafeAreaView>
  );
}
