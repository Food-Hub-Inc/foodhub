import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Boton, BotonDeTexto } from '../ui/Boton';
import { Casilla } from '../ui/Casilla';
import { SelectorDeFoto, type FotoElegida } from '../ui/SelectorDeFoto';
import { TEXTOS_REGISTRO } from '../../lib/textos';

/**
 * Cierre común de PAN-AUT-01 y PAN-AUT-02: foto opcional, términos y envío.
 *
 * EL BOTÓN ARRANCA DESHABILITADO y solo se habilita cuando el formulario entero
 * es válido. Es criterio de aceptación de US-AUT-01 y US-AUT-02 —"mantenga
 * deshabilitado el botón Registrarme"— y además el principio de prevención de
 * errores: impedir el error es mejor que reportarlo.
 *
 * La foto de perfil es opcional en las dos historias. No participa de la
 * validación ni bloquea el envío.
 *
 * CON `cuentaCreada` EL PIE CAMBIA DE SENTIDO. Pasa a true cuando el alta
 * terminó bien pero la foto no se pudo subir: el formulario ya no se puede
 * reenviar —el correo chocaría contra su propia cuenta— así que el selector se
 * bloquea y el botón deja de decir "Registrarse" para ofrecer entrar.
 */
export function PieDeRegistro({
  foto,
  onFoto,
  terminosAceptados,
  onTerminos,
  errorTerminos,
  puedeEnviar,
  enviando,
  onEnviar,
  cuentaCreada = false,
}: {
  foto: FotoElegida | null;
  onFoto: (foto: FotoElegida | null) => void;
  terminosAceptados: boolean;
  onTerminos: (aceptados: boolean) => void;
  errorTerminos: string | undefined;
  puedeEnviar: boolean;
  enviando: boolean;
  onEnviar: () => void;
  cuentaCreada?: boolean;
}) {
  return (
    <View>
      <View className="mt-5">
        {/* Con la cuenta ya creada el selector no tiene a dónde subir: el
            reintento de la foto vive en PAN-GURP-01. Deshabilitarlo es mejor
            que dejarlo tocable y que no pase nada. */}
        <SelectorDeFoto
          deshabilitado={cuentaCreada}
          foto={foto}
          onElegir={onFoto}
        />
      </View>

      <View className="mt-5">
        <Casilla
          error={errorTerminos}
          etiquetaAccesible={`${TEXTOS_REGISTRO.aceptoTerminos}${TEXTOS_REGISTRO.terminos}${TEXTOS_REGISTRO.deFoodHub}`}
          marcada={terminosAceptados}
          nombre="terminosAceptados"
          onChange={onTerminos}
        >
          <Text className="text-body text-text-primary">
            {TEXTOS_REGISTRO.aceptoTerminos}
            <Text className="text-primary">{TEXTOS_REGISTRO.terminos}</Text>
            {TEXTOS_REGISTRO.deFoodHub}
          </Text>
        </Casilla>
      </View>

      <Boton
        cargando={enviando}
        className="mt-6"
        deshabilitado={!puedeEnviar && !cuentaCreada}
        onPress={onEnviar}
        textoCargando={
          cuentaCreada ? TEXTOS_REGISTRO.entrando : TEXTOS_REGISTRO.registrando
        }
      >
        {cuentaCreada ? TEXTOS_REGISTRO.continuar : TEXTOS_REGISTRO.registrarse}
      </Boton>

      <View className="mt-6 flex-row justify-center">
        <Text className="text-body text-text-secondary">
          {TEXTOS_REGISTRO.yaTenesCuenta}
        </Text>
        <BotonDeTexto
          onPress={() => {
            router.replace('/login');
          }}
        >
          {TEXTOS_REGISTRO.iniciarSesion}
        </BotonDeTexto>
      </View>
    </View>
  );
}
