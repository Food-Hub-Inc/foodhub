import { Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Boton, BotonDeTexto } from '../ui/Boton';
import { Casilla } from '../ui/Casilla';
import { SelectorDeFoto, type FotoElegida } from '../ui/SelectorDeFoto';
import { TEXTOS_REGISTRO } from '../../lib/textos';

/**
 * Pantalla de terminos dentro del grupo `(auth)`: el registro es sin sesion,
 * asi que el enlace del checkbox no puede apuntar a `/ayuda/legal/terminos`
 * (esa ruta pide sesion y `GateDeSesion` la redirige a `/bienvenida`).
 */
const rutaTerminos = '/terminos' as Href;

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
        <CasillaDeTerminos
          error={errorTerminos}
          marcada={terminosAceptados}
          onMarcar={onTerminos}
        />
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

/**
 * Checkbox "Acepto los términos y condiciones de FoodHub" con el enlace a la
 * pantalla de terminos embebido en el texto.
 *
 * Vive aparte del pie del registro (y no inline en `PieDeRegistro`) para que
 * la fila táctil de `Casilla` no se mezcle con la navegación del enlace y por
 * los limites de complejidad de ESLint: la funcion del pie ya roza el maximo.
 */
function CasillaDeTerminos({
  error,
  marcada,
  onMarcar,
}: {
  error: string | undefined;
  marcada: boolean;
  onMarcar: (aceptados: boolean) => void;
}) {
  return (
    <Casilla
      error={error}
      etiquetaAccesible={`${TEXTOS_REGISTRO.aceptoTerminos}${TEXTOS_REGISTRO.terminos}${TEXTOS_REGISTRO.deFoodHub}`}
      marcada={marcada}
      nombre="terminosAceptados"
      onChange={onMarcar}
    >
      <Text className="text-body text-text-primary">
        {TEXTOS_REGISTRO.aceptoTerminos}
        <Text
          className="text-primary"
          onPress={(evento) => {
            // Salir del area tactil sin marcar el checkbox: la fila acepta, y
            // el enlace solo debe leer.
            evento.stopPropagation();
            router.push(rutaTerminos);
          }}
          accessibilityRole="link"
          accessibilityLabel={TEXTOS_REGISTRO.terminos}
        >
          {TEXTOS_REGISTRO.terminos}
        </Text>
        {TEXTOS_REGISTRO.deFoodHub}
      </Text>
    </Casilla>
  );
}
