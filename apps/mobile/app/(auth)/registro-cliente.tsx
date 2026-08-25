import { useState } from 'react';
import { Text } from 'react-native';
import { registroClienteSchema } from '@foodhub/shared';
import { registrarCliente } from '../../src/api/auth';
import { SafeAreaView } from '../../src/components/SafeAreaView';
import { CamposDeRegistro } from '../../src/components/registro/CamposDeRegistro';
import { PieDeRegistro } from '../../src/components/registro/PieDeRegistro';
import { Aviso } from '../../src/components/ui/Aviso';
import { EncabezadoPantalla } from '../../src/components/ui/EncabezadoPantalla';
import { PantallaConTeclado } from '../../src/components/ui/PantallaConTeclado';
import type { FotoElegida } from '../../src/components/ui/SelectorDeFoto';
import { useFormulario } from '../../src/hooks/useFormulario';
import { useRegistro } from '../../src/hooks/useRegistro';
import { TEXTOS_REGISTRO } from '../../src/lib/textos';

/**
 * PAN-AUT-01 · Registro de cliente — US-AUT-01.
 *
 * Los siete campos del criterio de aceptación: nombre, apellido, correo,
 * contraseña, confirmación, foto (opcional) y términos. La validación entera
 * sale de `registroClienteSchema`, el mismo objeto que aplica el servidor.
 */
export default function RegistroCliente() {
  const [foto, setFoto] = useState<FotoElegida | null>(null);
  const registro = useRegistro(registrarCliente);

  const formulario = useFormulario(
    registroClienteSchema,
    {
      nombre: '',
      apellido: '',
      email: '',
      password: '',
      confirmPassword: '',
      terminosAceptados: false,
    },
    // El correo duplicado solo lo sabe el servidor: entra como error externo
    // para que aparezca debajo del campo y no como un cartel general.
    registro.errorCorreo === undefined
      ? undefined
      : { email: registro.errorCorreo },
  );

  function enviar() {
    // Con la cuenta ya creada el botón cambió de sentido: solo queda entrar.
    if (registro.cuentaCreada) {
      void registro.continuar();
      return;
    }
    formulario.revelarErrores();
    if (formulario.datos) void registro.enviar(formulario.datos, foto);
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <EncabezadoPantalla
        destinoAlternativo="/bienvenida"
        titulo={TEXTOS_REGISTRO.tituloCliente}
      />

      <PantallaConTeclado contentContainerClassName="px-6 pt-4 pb-10">
        <Text className="mb-6 text-body text-text-secondary">
          {TEXTOS_REGISTRO.bajadaCliente}
        </Text>

        {registro.errorGeneral === null ? null : (
          <Aviso
            className="mb-5"
            mensaje={registro.errorGeneral}
            tono="error"
          />
        )}

        {/* La foto es opcional: que no se haya podido subir no invalida el
            registro, así que se informa y se deja continuar. */}
        {registro.avisoDeFoto === null ? null : (
          <Aviso
            className="mb-5"
            mensaje={registro.avisoDeFoto}
            tono="informativo"
          />
        )}

        <CamposDeRegistro
          control={{
            valores: formulario.valores,
            mensajeDe: (campo) => formulario.mensajeDe(campo),
            fijar: (campo, valor) => {
              formulario.fijar(campo, valor);
            },
          }}
        />

        <PieDeRegistro
          cuentaCreada={registro.cuentaCreada}
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
      </PantallaConTeclado>
    </SafeAreaView>
  );
}
