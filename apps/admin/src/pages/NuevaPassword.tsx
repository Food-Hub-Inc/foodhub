import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Alert } from '@heroui/react';
import { restablecerPasswordSchema } from '@foodhub/shared';
import { BotonDeEnvio } from '../components/BotonDeEnvio.js';
import { CampoDeContrasena } from '../components/CampoDeContrasena.js';
import { MarcoDeAcceso, TarjetaDeAcceso } from '../components/MarcoDeAcceso.js';
import { PantallaDeEspera } from '../components/estados/PantallaDeEspera.js';
import { IconoAlerta, IconoExito } from '../components/iconos/index.js';
import { mensajeDeError } from '../lib/api.js';
import { RUTAS } from '../lib/rutas.js';
import { supabase } from '../lib/supabase.js';
import { TEXTOS_NUEVA_PASSWORD } from '../lib/textos.js';

/**
 * Definición de contraseña de un administrador — US-GURP-06 y US-AUT-04.
 *
 * ESTA PANTALLA NO ESTÁ EN LA MAQUETACIÓN DE LA ETAPA 5, y la razón es que el
 * caso no existía cuando se diseñó: PAN-AUT-04.1 lo resuelve en la app móvil,
 * que es adonde va el enlace del correo cuando quien lo recibe es un CLIENTE.
 * Para un ADMINISTRADOR no había destino, y obligarlo a instalar la app solo
 * para elegir su contraseña no tenía sentido. Decisión del equipo: la API dirige
 * el enlace según el rol y este es el destino del administrador.
 *
 * ATIENDE LOS DOS ENLACES QUE PUEDE RECIBIR UN ADMINISTRADOR: la invitación
 * (`DESTINO_INVITACION`) y la recuperación de contraseña
 * (`DESTINO_RECUPERACION`). No necesita distinguirlos porque para ella son el
 * mismo caso —una sesión que abrió GoTrue y una cuenta sin contraseña propia— y
 * los textos están redactados para no nombrar ninguno de los dos.
 *
 * Es pública a propósito. Quien llega TIENE una sesión de Supabase —el enlace
 * del correo la establece— pero todavía no tiene contraseña ni pasó por ningún
 * control de rol. Ponerla detrás de `RutaProtegida` la haría inalcanzable justo
 * para quien la necesita.
 */

/** Las tres situaciones en las que puede estar la pantalla al abrirse. */
type EstadoDelEnlace = 'verificando' | 'valido' | 'invalido';

export function NuevaPassword() {
  const estadoDelEnlace = useEstadoDelEnlace();

  if (estadoDelEnlace === 'verificando') {
    return (
      <PantallaDeEspera mensaje={TEXTOS_NUEVA_PASSWORD.verificandoEnlace} />
    );
  }

  if (estadoDelEnlace === 'invalido') return <EnlaceInvalido />;

  return (
    <MarcoDeAcceso
      descripcion={TEXTOS_NUEVA_PASSWORD.descripcion}
      titulo={TEXTOS_NUEVA_PASSWORD.titulo}
    >
      <FormularioDeContrasena />
    </MarcoDeAcceso>
  );
}

/**
 * Verifica que exista la sesión que deja el enlace del correo.
 *
 * `INITIAL_SESSION` ES LA SEÑAL, Y ES DETERMINISTA
 * ---------------------------------------------------------------------------
 * `detectSessionInUrl` está activo, así que el cliente canjea solo el token del
 * fragmento de la URL. La pregunta difícil es cuándo se puede afirmar que ese
 * canje no va a ocurrir, para recién ahí declarar el enlace inválido.
 *
 * La respuesta la da el propio SDK: `_initialize()` procesa el fragmento ANTES
 * de resolver su promesa de arranque, y `onAuthStateChange` espera esa promesa
 * antes de emitir `INITIAL_SESSION`. Es decir, cuando llega ese evento el canje
 * ya se intentó, con éxito o sin él. Si además viene sin sesión, no hay enlace
 * válido y no lo va a haber.
 *
 * Antes acá había un `setTimeout` de dos segundos que suponía lo mismo por
 * reloj. Adivinaba bien casi siempre, pero con la red lenta le mostraba "enlace
 * inválido" a alguien cuyo enlace estaba perfecto, y no hay forma de elegir un
 * número que sea correcto en todas las conexiones. Este evento no adivina.
 */
function useEstadoDelEnlace(): EstadoDelEnlace {
  const [estado, setEstado] = useState<EstadoDelEnlace>('verificando');

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((evento, sesion) => {
      if (sesion) {
        setEstado('valido');
        return;
      }

      // Sin sesión y con el canje ya terminado: el enlace venció, ya se usó, o
      // alguien escribió la dirección a mano. Los eventos posteriores no se
      // miran: un `SIGNED_OUT` de más tarde no vuelve inválido a este enlace.
      if (evento === 'INITIAL_SESSION') setEstado('invalido');
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  return estado;
}

function FormularioDeContrasena() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  const validacion = restablecerPasswordSchema.safeParse({
    password,
    confirmPassword,
  });

  /**
   * El botón arranca deshabilitado y solo se habilita con el formulario válido,
   * como en PAN-AUT-04.1: es preferible impedir el error a reportarlo.
   *
   * Los mensajes por campo se muestran únicamente cuando el campo ya tiene algo
   * escrito. Marcar en rojo un formulario recién abierto y todavía vacío es
   * regañar a alguien que no hizo nada.
   */
  const errores = erroresPorCampo(validacion);

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!validacion.success) return;

    setEnviando(true);
    setErrorGeneral(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: validacion.data.password,
      });
      if (error) throw error;
      setListo(true);
    } catch (error) {
      setErrorGeneral(mensajeDeError(error));
    } finally {
      setEnviando(false);
    }
  }

  if (listo) return <ContrasenaDefinida />;

  return (
    <form
      className="space-y-5 rounded-lg border border-border bg-surface p-7"
      noValidate
      onSubmit={(evento) => void guardar(evento)}
    >
      {errorGeneral ? (
        <Alert status="danger">
          <Alert.Indicator>
            <IconoAlerta className="size-5" />
          </Alert.Indicator>
          <Alert.Content>
            <Alert.Description>{errorGeneral}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      <CampoDeContrasena
        alCambiar={setPassword}
        autoComplete="new-password"
        autoFocus
        error={password === '' ? undefined : errores.password}
        etiqueta={TEXTOS_NUEVA_PASSWORD.nueva}
        nombre="password"
        placeholder={TEXTOS_NUEVA_PASSWORD.nuevaPlaceholder}
        valor={password}
      />

      <CampoDeContrasena
        alCambiar={setConfirmPassword}
        autoComplete="new-password"
        error={confirmPassword === '' ? undefined : errores.confirmPassword}
        etiqueta={TEXTOS_NUEVA_PASSWORD.confirmar}
        nombre="confirmPassword"
        placeholder={TEXTOS_NUEVA_PASSWORD.confirmarPlaceholder}
        valor={confirmPassword}
      />

      <BotonDeEnvio
        enviando={enviando}
        isDisabled={!validacion.success}
        textoEnviando={TEXTOS_NUEVA_PASSWORD.guardando}
      >
        {TEXTOS_NUEVA_PASSWORD.guardar}
      </BotonDeEnvio>
    </form>
  );
}

/** Estado de éxito. No redirige solo: el usuario decide cuándo continuar. */
function ContrasenaDefinida() {
  return (
    <TarjetaDeAcceso>
      <div className="flex flex-col items-center gap-3 text-center">
        <IconoExito className="size-10 text-success" />
        <h2 className="text-h2 font-bold text-text-primary">
          {TEXTOS_NUEVA_PASSWORD.exitoTitulo}
        </h2>
        <p className="text-body text-text-secondary">
          {TEXTOS_NUEVA_PASSWORD.exitoDescripcion}
        </p>
        <Link
          className="mt-2 text-body font-semibold text-primary hover:text-primary-dark"
          to={RUTAS.login}
        >
          {TEXTOS_NUEVA_PASSWORD.irAlIngreso}
        </Link>
      </div>
    </TarjetaDeAcceso>
  );
}

/**
 * El enlace venció, ya se usó, o alguien escribió la dirección a mano.
 *
 * Ofrece pedir uno nuevo además de volver al ingreso: quien llega acá desde una
 * recuperación vencida necesita exactamente eso, y mandarlo al login lo dejaría
 * dando la misma vuelta que ya no le funcionó.
 */
function EnlaceInvalido() {
  return (
    <MarcoDeAcceso
      descripcion={TEXTOS_NUEVA_PASSWORD.enlaceInvalidoDescripcion}
      titulo={TEXTOS_NUEVA_PASSWORD.enlaceInvalidoTitulo}
    >
      <TarjetaDeAcceso>
        <div className="flex flex-col items-center gap-3 text-center">
          <IconoAlerta className="size-9 text-warning" />
          <Link
            className="text-body font-semibold text-primary hover:text-primary-dark"
            to={RUTAS.recuperar}
          >
            {TEXTOS_NUEVA_PASSWORD.pedirOtroEnlace}
          </Link>
          <Link
            className="text-caption text-text-secondary hover:text-text-primary"
            to={RUTAS.login}
          >
            {TEXTOS_NUEVA_PASSWORD.volverAlIngreso}
          </Link>
        </div>
      </TarjetaDeAcceso>
    </MarcoDeAcceso>
  );
}

type ErroresDeContrasena = Partial<
  Record<'password' | 'confirmPassword', string>
>;

function erroresPorCampo(
  validacion: ReturnType<typeof restablecerPasswordSchema.safeParse>,
): ErroresDeContrasena {
  if (validacion.success) return {};

  const errores: ErroresDeContrasena = {};
  for (const problema of validacion.error.issues) {
    const campo = problema.path[0];
    if (campo === 'password' || campo === 'confirmPassword') {
      // Solo el primer problema de cada campo: apilar cinco reglas de
      // complejidad debajo de un input las vuelve todas invisibles.
      errores[campo] ??= problema.message;
    }
  }
  return errores;
}
