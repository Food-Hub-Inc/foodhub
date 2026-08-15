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
 * Definición de contraseña de un administrador invitado — US-GURP-06.
 *
 * ESTA PANTALLA NO ESTÁ EN LA MAQUETACIÓN DE LA ETAPA 5, y la razón es que el
 * caso no existía cuando se diseñó: PAN-AUT-04.1 lo resuelve en la app móvil,
 * que es adonde va el enlace del correo cuando el invitado es un CLIENTE. Para
 * un ADMINISTRADOR no había destino, y obligarlo a instalar la app solo para
 * elegir su contraseña no tenía sentido. Decisión del equipo: la API dirige la
 * invitación según el rol y este es el destino del administrador.
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
 * `detectSessionInUrl` ya está activo en el cliente de Supabase, así que para
 * cuando este componente se monta el token del fragmento de la URL puede haberse
 * canjeado o no todavía. Por eso se pregunta con `getSession()` y ADEMÁS se
 * escucha `onAuthStateChange`: si solo se preguntara una vez, una pantalla que
 * monta antes del canje mostraría "enlace inválido" sobre un enlace correcto.
 */
function useEstadoDelEnlace(): EstadoDelEnlace {
  const [estado, setEstado] = useState<EstadoDelEnlace>('verificando');

  useEffect(() => {
    let montado = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (montado && data.session) setEstado('valido');
    });

    const { data: suscripcion } = supabase.auth.onAuthStateChange(
      (_evento, sesion) => {
        if (sesion) setEstado('valido');
      },
    );

    /**
     * Sin este plazo la pantalla se quedaría en "verificando" para siempre
     * cuando alguien escribe la dirección a mano: no hay sesión que detectar y
     * `onAuthStateChange` nunca dispara. Dos segundos alcanzan para el canje del
     * token y no se perciben como espera.
     */
    const plazo = setTimeout(() => {
      if (montado)
        setEstado((actual) => (actual === 'valido' ? actual : 'invalido'));
    }, 2000);

    return () => {
      montado = false;
      clearTimeout(plazo);
      suscripcion.subscription.unsubscribe();
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

/** El enlace venció, ya se usó, o alguien escribió la dirección a mano. */
function EnlaceInvalido() {
  return (
    <MarcoDeAcceso
      descripcion={TEXTOS_NUEVA_PASSWORD.sinInvitacionDescripcion}
      titulo={TEXTOS_NUEVA_PASSWORD.sinInvitacionTitulo}
    >
      <TarjetaDeAcceso>
        <div className="flex flex-col items-center gap-3 text-center">
          <IconoAlerta className="size-9 text-warning" />
          <Link
            className="text-body font-semibold text-primary hover:text-primary-dark"
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
