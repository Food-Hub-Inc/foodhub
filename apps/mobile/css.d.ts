/**
 * Declaración de los imports de hojas de estilo.
 *
 * `import './global.css'` es un import por efecto secundario que resuelve
 * Metro, no TypeScript. Sin esta declaración, `tsc` reporta TS2882.
 *
 * Va en un archivo PROPIO y sin ningún `import` en el nivel superior: eso lo
 * convierte en un archivo de script (no en un módulo), que es el único lugar
 * donde TypeScript acepta una declaración de módulo con comodín.
 */
declare module '*.css';
