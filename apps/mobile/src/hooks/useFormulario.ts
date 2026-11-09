import { useCallback, useMemo, useState } from 'react';

/**
 * Formulario validado con los schemas de `@foodhub/shared`.
 *
 * POR QUÉ NO HAY REGLAS DE VALIDACIÓN EN NINGUNA PANTALLA
 * ---------------------------------------------------------------------------
 * Los mensajes de error son literales de los criterios de aceptación y las
 * pruebas funcionales de la Etapa 6 los verifican palabra por palabra. Si cada
 * formulario escribiera su propio "la contraseña es muy corta", el texto de la
 * app y el que aplica la API se irían separando sin que nadie lo note. Acá el
 * único origen de un error de campo es el schema, que es el MISMO objeto que
 * usa el servidor.
 *
 * CUÁNDO SE MUESTRA UN ERROR
 * ---------------------------------------------------------------------------
 * La validación corre en cada tecla, pero el error recién aparece cuando el
 * campo fue tocado o cuando se intentó enviar. Mostrarlo antes significa
 * decirle "el correo es inválido" a alguien que escribió la primera letra.
 */

/** Un problema de validación tal como lo reporta zod. */
interface ProblemaZod {
  readonly path: readonly PropertyKey[];
  readonly message: string;
}

/**
 * Lo mínimo que el formulario necesita de un schema.
 *
 * Se declara de forma estructural en lugar de importar `ZodType`: los schemas
 * del paquete compartido pasan por `.refine()` y su tipo de entrada deja de
 * coincidir con el estado del formulario (`terminosAceptados` es `boolean` en
 * el estado y `true` en el schema). Pedir solo `safeParse` evita pelear con esa
 * diferencia sin perder el tipado de la salida.
 */
export interface ValidadorZod<TSalida> {
  safeParse(
    datos: unknown,
  ):
    | { success: true; data: TSalida }
    | { success: false; error: { issues: readonly ProblemaZod[] } };
}

/**
 * Los metodos se declaran como PROPIEDADES con tipo de funcion y no con
 * sintaxis de metodo porque en la implementacion son funciones flecha
 * creadas con `useCallback` (no usan `this`). Separar una propiedad
 * funcion es seguro; separar un metodo de su objeto dispara
 * `@typescript-eslint/unbound-method`. Es el mismo criterio que ya
 * aplica `useSesion` (ver el comentario de `fijarSesion` ahi).
 */
export interface Formulario<TValores, TSalida> {
  /** Estado crudo de los inputs. */
  readonly valores: TValores;
  /** Datos ya validados y transformados, o `undefined` si el formulario no cierra. */
  readonly datos: TSalida | undefined;
  /** `true` cuando el schema acepta el estado actual. */
  readonly esValido: boolean;
  /** Mensaje a mostrar debajo de un campo, o `undefined` si no corresponde. */
  mensajeDe: (campo: keyof TValores & string) => string | undefined;
  /** Actualiza un campo y lo marca como tocado. */
  fijar: <K extends keyof TValores>(campo: K, valor: TValores[K]) => void;
  /** Fuerza la aparición de todos los errores: se llama al intentar enviar. */
  revelarErrores: () => void;
  /** Vuelve el formulario a su estado inicial. */
  reiniciar: () => void;
}

export function useFormulario<
  TValores extends Record<string, unknown>,
  TSalida,
>(
  validador: ValidadorZod<TSalida>,
  inicial: TValores,
  /**
   * Errores que no salen del schema sino de la respuesta de la API: un correo
   * duplicado solo lo sabe el servidor. Pisan al del schema porque son más
   * específicos.
   */
  erroresExternos?: Readonly<Partial<Record<keyof TValores & string, string>>>,
): Formulario<TValores, TSalida> {
  const [valores, setValores] = useState<TValores>(inicial);
  const [tocados, setTocados] = useState<ReadonlySet<string>>(new Set());
  const [reveladosTodos, setReveladosTodos] = useState(false);

  const resultado = useMemo(
    () => validador.safeParse(valores),
    [validador, valores],
  );

  /** Primer problema de cada campo. El resto son consecuencia del primero. */
  const erroresDelSchema = useMemo(() => {
    if (resultado.success) return {};
    const mapa: Record<string, string> = {};
    for (const problema of resultado.error.issues) {
      const campo = String(problema.path[0] ?? '');
      if (campo && !(campo in mapa)) mapa[campo] = problema.message;
    }
    return mapa;
  }, [resultado]);

  const fijar = useCallback(
    <K extends keyof TValores>(campo: K, valor: TValores[K]) => {
      setValores((previos) => ({ ...previos, [campo]: valor }));
      setTocados((previos) => new Set(previos).add(String(campo)));
    },
    [],
  );

  const mensajeDe = useCallback(
    (campo: keyof TValores & string) => {
      const externo = erroresExternos?.[campo];
      if (externo) return externo;
      if (!reveladosTodos && !tocados.has(campo)) return undefined;
      return erroresDelSchema[campo];
    },
    [erroresExternos, erroresDelSchema, reveladosTodos, tocados],
  );

  const revelarErrores = useCallback(() => {
    setReveladosTodos(true);
  }, []);

  const reiniciar = useCallback(() => {
    setValores(inicial);
    setTocados(new Set());
    setReveladosTodos(false);
    // `inicial` se usa como valor de reinicio; cambiarlo entre renders sería un
    // error del llamador, no algo que este hook deba contemplar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    valores,
    datos: resultado.success ? resultado.data : undefined,
    esValido: resultado.success,
    mensajeDe,
    fijar,
    revelarErrores,
    reiniciar,
  };
}
