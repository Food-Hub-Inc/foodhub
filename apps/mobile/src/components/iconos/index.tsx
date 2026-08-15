import { Circle, Path } from 'react-native-svg';
import { Lienzo } from './Lienzo';
import { TRAZO } from './trazo';
import type { PropsIcono } from './tipos';

/**
 * Sistema de iconografía de FoodHub — guía visual, sección 05.
 *
 * Los primeros veinticuatro son transcripción del set de la guía. Los cuatro
 * del final (`IconoOjoTachado`, `IconoChevronDerecha`, `IconoChevronIzquierda`,
 * `IconoAlerta`) NO están en la guía: los pide la maquetación —el toggle de
 * visibilidad de PAN-AUT-03, las filas de navegación de PAN-GURP-01 y el
 * triángulo que acompaña a cada error inline de PAN-AUT-01— y se dibujaron en
 * el mismo lenguaje (24×24, trazo 1.75, extremos redondeados). Quedan anotados
 * para incorporarlos a la guía en la próxima revisión.
 *
 * Cada ícono recibe su color como clase de token; ver `Lienzo.tsx`.
 */

// ---------------------------------------------------------------------------
// Navegación
// ---------------------------------------------------------------------------

export function IconoInicio(props: PropsIcono) {
  return (
    <Lienzo {...props}>
      <Path
        d="M3.5 10.4 12 3.75l8.5 6.65V19a1.25 1.25 0 0 1-1.25 1.25H4.75A1.25 1.25 0 0 1 3.5 19v-8.6Z"
        {...TRAZO}
      />
    </Lienzo>
  );
}

export function IconoMapa(props: PropsIcono) {
  return (
    <Lienzo {...props}>
      <Path
        d="M9 3.75 3.75 6v14.25L9 18l6 2.25 5.25-2.25V3.75L15 6 9 3.75Z"
        {...TRAZO}
      />
      <Path d="M9 3.75V18" {...TRAZO} />
      <Path d="M15 6v14.25" {...TRAZO} />
    </Lienzo>
  );
}

export function IconoBolsa(props: PropsIcono) {
  return (
    <Lienzo {...props}>
      <Path
        d="M5.25 7.5h13.5l-1 12.05a1.25 1.25 0 0 1-1.25 1.2H7.5a1.25 1.25 0 0 1-1.25-1.2L5.25 7.5Z"
        {...TRAZO}
      />
      <Path d="M9 7.5V5.75a3 3 0 0 1 6 0V7.5" {...TRAZO} />
    </Lienzo>
  );
}

export function IconoMensaje(props: PropsIcono) {
  return (
    <Lienzo {...props}>
      <Path
        d="M20.25 11.5a7.75 7.75 0 0 1-8 7.75 8.6 8.6 0 0 1-3.35-.65L4.5 20.25l1.6-4.2A7.6 7.6 0 0 1 4.5 11.5a7.75 7.75 0 0 1 8-7.75 7.75 7.75 0 0 1 7.75 7.75Z"
        {...TRAZO}
      />
    </Lienzo>
  );
}

export function IconoUsuario(props: PropsIcono) {
  return (
    <Lienzo {...props}>
      <Circle cx={12} cy={8} r={3.75} {...TRAZO} />
      <Path d="M4.75 20.25a7.25 7.25 0 0 1 14.5 0" {...TRAZO} />
    </Lienzo>
  );
}

export function IconoCocinero(props: PropsIcono) {
  return (
    <Lienzo {...props}>
      <Path
        d="M7 14.5a3.5 3.5 0 0 1-1.2-6.79 3.5 3.5 0 0 1 6.2-2.21 3.5 3.5 0 0 1 6.2 2.21A3.5 3.5 0 0 1 17 14.5H7Z"
        {...TRAZO}
      />
      <Path
        d="M7 14.5v4.25a1.5 1.5 0 0 0 1.5 1.5h7a1.5 1.5 0 0 0 1.5-1.5V14.5"
        {...TRAZO}
      />
      <Path d="M9 17.5h6" {...TRAZO} />
    </Lienzo>
  );
}

export function IconoReloj(props: PropsIcono) {
  return (
    <Lienzo {...props}>
      <Circle cx={12} cy={12} r={8.25} {...TRAZO} />
      <Path d="M12 7.25v5l3.25 1.9" {...TRAZO} />
    </Lienzo>
  );
}

export function IconoCorazon(props: PropsIcono) {
  return (
    <Lienzo {...props}>
      <Path
        d="M19.5 12.57 12 20l-7.5-7.43a4.75 4.75 0 1 1 7.5-5.7 4.75 4.75 0 1 1 7.5 5.7Z"
        {...TRAZO}
      />
    </Lienzo>
  );
}

// ---------------------------------------------------------------------------
// Acciones y estado
// ---------------------------------------------------------------------------

export function IconoCampana(props: PropsIcono) {
  return (
    <Lienzo {...props}>
      <Path
        d="M18 9.25a6 6 0 0 0-12 0c0 6.5-2.5 8.25-2.5 8.25h17S18 15.75 18 9.25Z"
        {...TRAZO}
      />
      <Path d="M10.4 20.5a1.9 1.9 0 0 0 3.2 0" {...TRAZO} />
    </Lienzo>
  );
}

export function IconoCamara(props: PropsIcono) {
  return (
    <Lienzo {...props}>
      <Path
        d="M14.6 4.75H9.4L8 7H4.75A1.5 1.5 0 0 0 3.25 8.5v9.25a1.5 1.5 0 0 0 1.5 1.5h14.5a1.5 1.5 0 0 0 1.5-1.5V8.5A1.5 1.5 0 0 0 19.25 7H16l-1.4-2.25Z"
        {...TRAZO}
      />
      <Circle cx={12} cy={13} r={3.25} {...TRAZO} />
    </Lienzo>
  );
}

export function IconoCandado(props: PropsIcono) {
  return (
    <Lienzo {...props}>
      <Path
        d="M6.5 10.25h11a1.25 1.25 0 0 1 1.25 1.25v7.5a1.25 1.25 0 0 1-1.25 1.25h-11A1.25 1.25 0 0 1 5.25 19v-7.5a1.25 1.25 0 0 1 1.25-1.25Z"
        {...TRAZO}
      />
      <Path d="M8.5 10.25V7.5a3.5 3.5 0 1 1 7 0v2.75" {...TRAZO} />
    </Lienzo>
  );
}

export function IconoSobre(props: PropsIcono) {
  return (
    <Lienzo {...props}>
      <Path
        d="M4.75 5.5h14.5A1.5 1.5 0 0 1 20.75 7v10a1.5 1.5 0 0 1-1.5 1.5H4.75A1.5 1.5 0 0 1 3.25 17V7a1.5 1.5 0 0 1 1.5-1.5Z"
        {...TRAZO}
      />
      <Path d="m3.6 6.6 8.4 5.9 8.4-5.9" {...TRAZO} />
    </Lienzo>
  );
}

export function IconoOjo(props: PropsIcono) {
  return (
    <Lienzo {...props}>
      <Path
        d="M2.75 12S6.25 5.75 12 5.75 21.25 12 21.25 12 17.75 18.25 12 18.25 2.75 12 2.75 12Z"
        {...TRAZO}
      />
      <Circle cx={12} cy={12} r={3} {...TRAZO} />
    </Lienzo>
  );
}

/** Fuera de la guía: toggle de visibilidad de contraseña (PAN-AUT-03). */
export function IconoOjoTachado(props: PropsIcono) {
  return (
    <Lienzo {...props}>
      <Path d="M3.25 3.25 20.75 20.75" {...TRAZO} />
      <Path d="M10.1 10.1a3 3 0 0 0 4.05 4.05" {...TRAZO} />
      <Path
        d="M9.4 6.05A9.3 9.3 0 0 1 12 5.75c5.75 0 9.25 6.25 9.25 6.25a17.6 17.6 0 0 1-2.7 3.55"
        {...TRAZO}
      />
      <Path
        d="M6.2 7.9A17.4 17.4 0 0 0 2.75 12S6.25 18.25 12 18.25c1.05 0 2.02-.2 2.9-.53"
        {...TRAZO}
      />
    </Lienzo>
  );
}

export function IconoMas(props: PropsIcono) {
  return (
    <Lienzo {...props}>
      <Path d="M12 5.25v13.5" {...TRAZO} />
      <Path d="M5.25 12h13.5" {...TRAZO} />
    </Lienzo>
  );
}

export function IconoMenos(props: PropsIcono) {
  return (
    <Lienzo {...props}>
      <Path d="M5.25 12h13.5" {...TRAZO} />
    </Lienzo>
  );
}

export function IconoLapiz(props: PropsIcono) {
  return (
    <Lienzo {...props}>
      <Path d="m16.25 3.75 4 4L8 20l-4.5.5.5-4.5L16.25 3.75Z" {...TRAZO} />
    </Lienzo>
  );
}

export function IconoTacho(props: PropsIcono) {
  return (
    <Lienzo {...props}>
      <Path d="M4.25 7h15.5" {...TRAZO} />
      <Path
        d="m6.25 7 .9 12.4a1.4 1.4 0 0 0 1.4 1.35h6.9a1.4 1.4 0 0 0 1.4-1.35L17.75 7"
        {...TRAZO}
      />
      <Path
        d="M9.25 7V4.75A1.5 1.5 0 0 1 10.75 3.25h2.5a1.5 1.5 0 0 1 1.5 1.5V7"
        {...TRAZO}
      />
      <Path d="M10.5 11v5.5" {...TRAZO} />
      <Path d="M13.5 11v5.5" {...TRAZO} />
    </Lienzo>
  );
}

export function IconoEngranaje(props: PropsIcono) {
  return (
    <Lienzo {...props}>
      <Circle cx={12} cy={12} r={3.25} {...TRAZO} />
      <Path
        d="M18.6 14.4a1.55 1.55 0 0 0 .31 1.71l.06.06a1.9 1.9 0 1 1-2.68 2.68l-.06-.06a1.55 1.55 0 0 0-1.71-.31 1.55 1.55 0 0 0-.94 1.42v.16a1.9 1.9 0 1 1-3.8 0v-.09a1.55 1.55 0 0 0-1-1.42 1.55 1.55 0 0 0-1.71.31l-.06.06a1.9 1.9 0 1 1-2.68-2.68l.06-.06a1.55 1.55 0 0 0 .31-1.71 1.55 1.55 0 0 0-1.42-.94H2.9a1.9 1.9 0 1 1 0-3.8h.09a1.55 1.55 0 0 0 1.42-1 1.55 1.55 0 0 0-.31-1.71l-.06-.06A1.9 1.9 0 1 1 6.72 4.3l.06.06a1.55 1.55 0 0 0 1.71.31h.07a1.55 1.55 0 0 0 .94-1.42V3.1a1.9 1.9 0 1 1 3.8 0v.09a1.55 1.55 0 0 0 .94 1.42 1.55 1.55 0 0 0 1.71-.31l.06-.06a1.9 1.9 0 1 1 2.68 2.68l-.06.06a1.55 1.55 0 0 0-.31 1.71v.07a1.55 1.55 0 0 0 1.42.94h.16a1.9 1.9 0 1 1 0 3.8h-.09a1.55 1.55 0 0 0-1.42.94Z"
        {...TRAZO}
      />
    </Lienzo>
  );
}

export function IconoSalir(props: PropsIcono) {
  return (
    <Lienzo {...props}>
      <Path
        d="M9.25 20.75H5.5a1.5 1.5 0 0 1-1.5-1.5V4.75a1.5 1.5 0 0 1 1.5-1.5h3.75"
        {...TRAZO}
      />
      <Path d="m15.75 16 4.25-4-4.25-4" {...TRAZO} />
      <Path d="M20 12H9.25" {...TRAZO} />
    </Lienzo>
  );
}

export function IconoTilde(props: PropsIcono) {
  return (
    <Lienzo {...props}>
      <Path d="m5 12.5 4.5 4.5L19 7" {...TRAZO} />
    </Lienzo>
  );
}

export function IconoTildeCirculo(props: PropsIcono) {
  return (
    <Lienzo {...props}>
      <Circle cx={12} cy={12} r={8.25} {...TRAZO} />
      <Path d="m8.5 12 2.5 2.5 4.5-5" {...TRAZO} />
    </Lienzo>
  );
}

export function IconoUbicacion(props: PropsIcono) {
  return (
    <Lienzo {...props}>
      <Path
        d="M12 20.75s7-5.15 7-10.75a7 7 0 1 0-14 0c0 5.6 7 10.75 7 10.75Z"
        {...TRAZO}
      />
      <Circle cx={12} cy={10} r={2.5} {...TRAZO} />
    </Lienzo>
  );
}

export function IconoEstrella(props: PropsIcono) {
  return (
    <Lienzo {...props}>
      <Path
        d="m12 3.75 2.7 5.47 6.05.88-4.38 4.26 1.04 6.02L12 17.53l-5.41 2.85 1.04-6.02L3.25 10.1l6.05-.88L12 3.75Z"
        {...TRAZO}
      />
    </Lienzo>
  );
}

export function IconoBuscar(props: PropsIcono) {
  return (
    <Lienzo {...props}>
      <Circle cx={11} cy={11} r={7.25} {...TRAZO} />
      <Path d="m20.25 20.25-4.1-4.1" {...TRAZO} />
    </Lienzo>
  );
}

export function IconoFiltro(props: PropsIcono) {
  return (
    <Lienzo {...props}>
      <Path d="M4 6.5h16" {...TRAZO} />
      <Path d="M7 12h10" {...TRAZO} />
      <Path d="M10 17.5h4" {...TRAZO} />
    </Lienzo>
  );
}

/** Fuera de la guía: filas de navegación de PAN-GURP-01. */
export function IconoChevronDerecha(props: PropsIcono) {
  return (
    <Lienzo {...props}>
      <Path d="m9.5 5.5 6.5 6.5-6.5 6.5" {...TRAZO} />
    </Lienzo>
  );
}

/** Fuera de la guía: botón de volver del header (PAN-AUT-01 a PAN-AUT-04.1). */
export function IconoChevronIzquierda(props: PropsIcono) {
  return (
    <Lienzo {...props}>
      <Path d="M14.5 5.5 8 12l6.5 6.5" {...TRAZO} />
    </Lienzo>
  );
}

export function IconoChevronAbajo(props: PropsIcono) {
  return (
    <Lienzo {...props}>
      <Path d="m5.5 9.5 6.5 6.5 6.5-6.5" {...TRAZO} />
    </Lienzo>
  );
}

/**
 * Fuera de la guía: acompaña a cada mensaje de error inline.
 *
 * No es decoración. El color nunca puede ser el único canal por el que se
 * comunica un estado: quien no distingue el rojo necesita la forma del
 * triángulo para saber que ese texto es un error.
 */
export function IconoAlerta(props: PropsIcono) {
  return (
    <Lienzo {...props}>
      <Path
        d="M12 3.75 3.1 19.1a1.15 1.15 0 0 0 1 1.72h15.8a1.15 1.15 0 0 0 1-1.72L12 3.75Z"
        {...TRAZO}
      />
      <Path d="M12 9.75v4.5" {...TRAZO} />
      <Path d="M12 17.4h.01" {...TRAZO} />
    </Lienzo>
  );
}

/** Fuera de la guía: banner informativo de PAN-AUT-02. */
export function IconoInformacion(props: PropsIcono) {
  return (
    <Lienzo {...props}>
      <Circle cx={12} cy={12} r={8.25} {...TRAZO} />
      <Path d="M12 11.25v5" {...TRAZO} />
      <Path d="M12 7.9h.01" {...TRAZO} />
    </Lienzo>
  );
}
