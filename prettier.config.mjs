// =============================================================================
//  FoodHub - Configuracion de formateo automatico (Prettier 3)
// =============================================================================
//  Prettier es la mitad "de forma" del analisis estatico: normaliza como se ve
//  el codigo para que ningun pull request mezcle cambios de logica con cambios
//  de sangria. Las reglas de correccion las aporta ESLint (eslint.config.mjs).
//
//  Se ejecuta en tres momentos:
//    1. al guardar en el editor  (.vscode/settings.json)
//    2. en el hook pre-commit    (lint-staged, solo sobre lo staged)
//    3. en CI                    (`pnpm format:check`, falla si algo no esta
//                                 formateado)
// =============================================================================

/** @type {import("prettier").Config} */
export default {
  // 80 columnas: en pantallas divididas (editor + emulador Android al lado)
  // permite leer una linea completa sin scroll horizontal.
  printWidth: 80,
  tabWidth: 2,
  useTabs: false,

  semi: true,
  singleQuote: true,
  quoteProps: 'as-needed',
  jsxSingleQuote: false, // en JSX se usa comilla doble, como en HTML

  // Coma final en todo lo que la admita: los diffs de git muestran solo la
  // linea agregada y no ensucian la anterior con un "+,".
  trailingComma: 'all',

  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: 'always',

  // Fin de linea LF incluso en Windows. El equipo trabaja en Windows, macOS y
  // Linux; sin esto cada checkout genera un diff completo por los CRLF.
  endOfLine: 'lf',

  overrides: [
    {
      // El markdown de la documentacion se escribe a mano y se lee en Drive:
      // reflowear los parrafos rompe la comparacion entre versiones.
      files: ['*.md', '*.mdx'],
      options: { proseWrap: 'preserve', printWidth: 100 },
    },
    {
      files: ['*.{yml,yaml}'],
      options: { singleQuote: false },
    },
    {
      // Las migraciones las genera drizzle-kit; se dejan tal cual salen para
      // que el hash del archivo coincida con el registrado en el journal.
      files: ['packages/db/drizzle/**'],
      options: { requirePragma: true },
    },
  ],
};
