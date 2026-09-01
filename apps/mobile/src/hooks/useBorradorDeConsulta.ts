import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Borrador local del formulario "Contactar al soporte" (US-AYU-03).
 *
 * POR QUE UN SOLO SLOT POR USUARIO
 * ---------------------------------------------------------------------------
 * El criterio pide "Conserve los datos del formulario de forma local. Al
 * volver a ingresar, muestre el formulario precargado y el mensaje: 'Tenés
 * un borrador guardado. ¿Querés continuar editándolo o empezar uno nuevo?'".
 * No habla de multiples borradores ni de historial, asi que un solo slot
 * por usuario es lo mas fiel posible al documento.
 *
 * El slot se nombra con el id del usuario: un cambio de sesion arranca
 * con el formulario vacio, sin contaminarse del borrador del anterior.
 *
 * QUE SE GUARDA Y QUE NO
 * ---------------------------------------------------------------------------
 * El borrador guarda los CAMPOS del formulario. NO guarda los adjuntos:
 * las URIs `file://` que devuelve el document-picker viven en el cache
 * del dispositivo, no son trasladables y pueden no existir al volver a
 * abrir la pantalla. Es el mismo criterio que se aplica a la foto de
 * perfil (US-GURP-02).
 */
export interface BorradorConsulta {
  readonly tipoConsultaId: string | null;
  readonly asunto: string;
  readonly descripcion: string;
}

const BOVEDA = 'foodhub:borrador:consulta';
const claveDe = (usuarioId: string) => `${BOVEDA}:${usuarioId}`;

const BORRADOR_VACIO: BorradorConsulta = {
  tipoConsultaId: null,
  asunto: '',
  descripcion: '',
};

const DEBOUNCE_MS = 600;

function borradorTieneDatos(b: BorradorConsulta): boolean {
  return (
    b.tipoConsultaId !== null ||
    b.asunto.trim() !== '' ||
    b.descripcion.trim() !== ''
  );
}

/**
 * Carga el borrador persistido para `usuarioId`, o el inicial si no hay
 * ninguno (o si lo guardado esta corrupto). Exportado para tests.
 */
export async function cargarBorrador(
  usuarioId: string,
): Promise<BorradorConsulta> {
  try {
    const texto = await AsyncStorage.getItem(claveDe(usuarioId));
    if (!texto) return BORRADOR_VACIO;
    const parseado = JSON.parse(texto) as unknown;
    if (!esBorradorValido(parseado)) return BORRADOR_VACIO;
    return parseado;
  } catch {
    return BORRADOR_VACIO;
  }
}

/**
 * Valida que el objeto leido de AsyncStorage tenga la forma esperada.
 */
function esBorradorValido(valor: unknown): valor is BorradorConsulta {
  if (typeof valor !== 'object' || valor === null) return false;
  const v = valor as Record<string, unknown>;
  return (
    (v.tipoConsultaId === null || typeof v.tipoConsultaId === 'string') &&
    typeof v.asunto === 'string' &&
    typeof v.descripcion === 'string'
  );
}

/**
 * Persiste `valor` en disco para `usuarioId`, o lo borra si esta vacio.
 *
 * Funcion separada para no inflar `useBorradorDeConsulta` y porque la
 * misma logica la necesita el cleanup final.
 */
function flush(usuarioId: string, valor: BorradorConsulta): void {
  if (!borradorTieneDatos(valor)) {
    void AsyncStorage.removeItem(claveDe(usuarioId));
    return;
  }
  void AsyncStorage.setItem(claveDe(usuarioId), JSON.stringify(valor));
}

/**
 * Hook del borrador del formulario de contacto.
 *
 *   - `borrador`     lo que el formulario debe mostrar.
 *   - `hayBorrador`  `true` si hay algo guardado.
 *   - `guardar`      escribe los valores actuales en el borrador (debounced).
 *   - `descartar`    borra el borrador de AsyncStorage.
 *   - `cargado`      `true` cuando el hook termino de leer el borrador
 *                    de disco. Mientras sea `false`, la pantalla no debe
 *                    mostrar el dialogo de "borrador guardado": podria
 *                    dispararse con el form vacio.
 *
 * `cargado` se inicializa en `true` cuando no hay usuarioId (no hay nada
 * que cargar) y en `false` cuando hay usuarioId (hay que esperar a la
 * lectura de disco). Asi la pantalla puede mostrar un skeleton durante
 * la carga y el dialogo solo despues.
 */
export function useBorradorDeConsulta(usuarioId: string | null): {
  borrador: BorradorConsulta;
  hayBorrador: boolean;
  guardar: (siguiente: BorradorConsulta) => void;
  descartar: () => Promise<void>;
  cargado: boolean;
} {
  const [borrador, setBorrador] = useState<BorradorConsulta>(BORRADOR_VACIO);
  const [hayBorrador, setHayBorrador] = useState(false);
  // `cargado` arranca `true` cuando no hay usuario (nada que leer) y
  // `false` cuando hay (la lectura es async). Asi la pantalla puede
  // mostrar un skeleton solo en el caso que realmente carga algo.
  const [cargado, setCargado] = useState(() => usuarioId === null);
  const pendiente = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ultimoValor = useRef<BorradorConsulta>(BORRADOR_VACIO);

  useEffect(() => {
    if (usuarioId === null) {
      // Estado ya inicializado arriba: nada que cargar.
      return;
    }

    let cancelado = false;

    void cargarBorrador(usuarioId).then((b) => {
      if (cancelado) return;
      setBorrador(b);
      setHayBorrador(borradorTieneDatos(b));
      ultimoValor.current = b;
      setCargado(true);
    });

    return () => {
      cancelado = true;
      if (pendiente.current) {
        clearTimeout(pendiente.current);
        pendiente.current = null;
      }
    };
  }, [usuarioId]);

  useEffect(() => {
    return () => {
      if (pendiente.current) {
        clearTimeout(pendiente.current);
        pendiente.current = null;
        if (usuarioId !== null) flush(usuarioId, ultimoValor.current);
      }
    };
  }, [usuarioId]);

  const guardar = useCallback(
    (siguiente: BorradorConsulta) => {
      setBorrador(siguiente);
      ultimoValor.current = siguiente;
      setHayBorrador(borradorTieneDatos(siguiente));

      if (usuarioId === null) return;

      if (pendiente.current) clearTimeout(pendiente.current);
      pendiente.current = setTimeout(() => {
        pendiente.current = null;
        flush(usuarioId, siguiente);
      }, DEBOUNCE_MS);
    },
    [usuarioId],
  );

  const descartar = useCallback(async () => {
    setBorrador(BORRADOR_VACIO);
    ultimoValor.current = BORRADOR_VACIO;
    setHayBorrador(false);
    if (pendiente.current) {
      clearTimeout(pendiente.current);
      pendiente.current = null;
    }
    if (usuarioId !== null) {
      await AsyncStorage.removeItem(claveDe(usuarioId));
    }
  }, [usuarioId]);

  return { borrador, hayBorrador, guardar, descartar, cargado };
}
