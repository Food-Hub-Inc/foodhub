// =============================================================================
//  FoodHub - Configuracion de analisis estatico de codigo (ESLint 10)
// =============================================================================
//  Proyecto Final 2026 - UTN FRM - Grupo 21
//  Etapa 6 - punto 2.3.2.2 "Configuracion de herramienta"
//
//  Este archivo es la UNICA fuente de verdad del analisis estatico del
//  monorepo. Se ejecuta desde la raiz con `pnpm lint` y alcanza a las tres
//  aplicaciones (mobile, admin, api) y a los tres paquetes compartidos.
//
//  Se usa el formato "flat config" (eslint.config.mjs), obligatorio desde
//  ESLint 9 y unico soportado en ESLint 10. A diferencia del viejo .eslintrc,
//  la configuracion es un ARRAY de objetos que se aplican en orden: cada
//  objeto puede acotarse con `files` y los ultimos sobrescriben a los
//  anteriores. Por eso `eslintConfigPrettier` va siempre al final.
// =============================================================================

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  // ---------------------------------------------------------------------------
  // 1. ARCHIVOS EXCLUIDOS
  // ---------------------------------------------------------------------------
  // Nada generado o descargado se analiza: no es codigo que el equipo escriba,
  // y sus errores no son accionables. `ignores` en un objeto sin `files` actua
  // de forma global sobre toda la corrida.
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/.expo/**',
      '**/.turbo/**',
      '**/android/**', // codigo nativo generado por `expo prebuild`
      '**/ios/**', // idem
      '**/expo-env.d.ts',
      '**/drizzle/**', // migraciones SQL/TS generadas por drizzle-kit
      'reports/**',
      // Skills importadas de terceros con `npx skills`. Traen sus propios
      // scripts auxiliares: son dependencias vendorizadas, no codigo del
      // equipo, y sus reglas de estilo son las de sus autores.
      '.claude/skills/**',
    ],
  },

  // ---------------------------------------------------------------------------
  // 2. REGLAS BASE DE JAVASCRIPT
  // ---------------------------------------------------------------------------
  // Conjunto oficial de ESLint. Detecta errores del lenguaje independientes
  // de TypeScript: variables no declaradas, casos duplicados en un switch,
  // condiciones constantes, etc.
  js.configs.recommended,

  // ---------------------------------------------------------------------------
  // 3. REGLAS DE TYPESCRIPT CON INFORMACION DE TIPOS
  // ---------------------------------------------------------------------------
  // `recommendedTypeChecked` habilita reglas que necesitan el type-checker
  // (no solo el AST). Son las que detectan los bugs mas caros: promesas sin
  // await, accesos a `any` sin control, comparaciones imposibles.
  //
  // `stylisticTypeChecked` agrega consistencia de estilo con base en tipos
  // (por ejemplo, preferir `interface` sobre `type` para objetos).
  //
  // Se acotan a archivos TypeScript con `.map()`: por defecto estos presets
  // aplican a TODO archivo, y una regla que necesita el type-checker sobre un
  // .js suelto (metro.config.js, por ejemplo) aborta la corrida entera.
  ...[
    ...tseslint.configs.recommendedTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,
  ].map((config) => ({ ...config, files: ['**/*.{ts,tsx,mts,cts}'] })),

  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    languageOptions: {
      parserOptions: {
        // `projectService` es el reemplazo moderno de `project: [...]`:
        // typescript-eslint descubre solo el tsconfig que corresponde a cada
        // archivo, sin que haya que enumerarlos uno por uno. Imprescindible en
        // un monorepo donde cada workspace tiene su propio tsconfig.
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // --- Variables sin usar -------------------------------------------------
      // Se apaga la regla base de JS y se usa la de TypeScript, que entiende
      // tipos, enums e interfaces. El prefijo `_` marca un parametro que se
      // ignora a proposito (habitual en middlewares de Express: `_next`).
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // --- Imports de tipos ---------------------------------------------------
      // Obliga a escribir `import type { X }` cuando X solo se usa como tipo.
      // El bundler puede entonces eliminar el import por completo, lo que en
      // React Native reduce el tamano del bundle y evita ciclos de importacion.
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],

      // --- Promesas -----------------------------------------------------------
      // Un `await` olvidado es la fuente de bug mas comun en el backend: la
      // request responde antes de que la escritura en base de datos termine.
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      // Permite pasar `async` a los handlers de Express, que aceptan funciones
      // que devuelven void; sin esta excepcion la regla es inusable en el API.
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { arguments: false, attributes: false } },
      ],

      // --- Tipado explicito ---------------------------------------------------
      // `any` se marca como advertencia, no como error: durante el scaffold
      // inicial hay integraciones sin tipar y no queremos frenar el build. La
      // meta del equipo es llevarlo a 'error' antes del cierre de la Etapa 6.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
    },
  },

  // ---------------------------------------------------------------------------
  // 4. REGLAS TRANSVERSALES DE CODIGO LIMPIO
  // ---------------------------------------------------------------------------
  // Traducen a reglas verificables los principios de Clean Code y SOLID que el
  // equipo adopto. No son estilo (de eso se ocupa Prettier): son limites de
  // complejidad y de correccion.
  {
    files: ['**/*.{ts,tsx,js,jsx,mjs,cjs}'],
    rules: {
      // Igualdad estricta salvo contra null, donde `== null` cubre null y
      // undefined de una sola vez y es un idiom aceptado.
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-param-reassign': 'error', // funciones puras: no mutar los argumentos
      'object-shorthand': 'error',
      'prefer-template': 'error',

      // --- Limites de complejidad (Clean Code) -------------------------------
      // Una funcion que supera estos umbrales casi siempre esta haciendo mas de
      // una cosa: viola el Principio de Responsabilidad Unica (la S de SOLID) y
      // conviene extraer parte de su logica.
      complexity: ['warn', { max: 12 }], // caminos independientes
      'max-depth': ['warn', 4], // anidamiento de bloques
      'max-lines-per-function': [
        'warn',
        { max: 80, skipBlankLines: true, skipComments: true },
      ],
      'max-params': ['warn', 4], // mas de 4 parametros -> pasar un objeto

      // --- Diagnostico --------------------------------------------------------
      // `console` queda como advertencia y solo se permiten los niveles que
      // sobreviven a produccion. El logger estructurado es la via correcta.
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-alert': 'error',
    },
  },

  // ---------------------------------------------------------------------------
  // 5. FRONTEND - REGLAS DE REACT (apps/mobile y apps/admin)
  // ---------------------------------------------------------------------------
  {
    files: ['apps/mobile/**/*.{ts,tsx}', 'apps/admin/**/*.{ts,tsx}'],
    // `configs.flat` es la variante en formato flat config del plugin; la de
    // primer nivel (`configs['recommended-latest']`) sigue el formato viejo de
    // .eslintrc y ESLint 10 la rechaza.
    ...reactHooks.configs.flat['recommended-latest'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.es2025 },
    },
  },
  {
    // react-refresh valida que cada modulo exporte solo componentes, condicion
    // necesaria para que el Fast Refresh de Metro y Vite conserve el estado
    // al guardar. Sin esto, cada cambio reinicia la pantalla desde cero.
    files: ['apps/mobile/**/*.tsx', 'apps/admin/**/*.tsx'],
    plugins: { 'react-refresh': reactRefresh },
    rules: {
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },

  // ---------------------------------------------------------------------------
  // 6. BACKEND Y PAQUETES - ENTORNO NODE (apps/api, packages/*)
  // ---------------------------------------------------------------------------
  {
    files: ['apps/api/**/*.ts', 'packages/**/*.ts'],
    languageOptions: {
      globals: { ...globals.node, ...globals.es2025 },
    },
    rules: {
      // En el servidor un `console.log` en caliente degrada el rendimiento y
      // ademas puede filtrar datos personales a los logs del proveedor.
      // Ver modulo de seguridad (alcance 2.2.2.2.1).
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },

  // ---------------------------------------------------------------------------
  // 7. EXCEPCIONES ACOTADAS
  // ---------------------------------------------------------------------------
  {
    // Los archivos de configuracion y los scripts corren en Node fuera del
    // build de la app, y muchos no estan cubiertos por ningun tsconfig: el
    // analisis con tipos no aplica.
    files: [
      '**/*.config.{js,mjs,cjs,ts}',
      '**/scripts/**/*.{js,mjs,cjs,ts}',
      'eslint.config.mjs',
      'commitlint.config.mjs',
    ],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      // Las reglas de `disableTypeChecked` se copian DENTRO de este objeto y no
      // se esparcen a nivel del config: una clave `rules` posterior reemplaza
      // por completo a la anterior, y declararla afuera anularia el apagado.
      ...tseslint.configs.disableTypeChecked.rules,
      'no-console': 'off', // los scripts reportan su progreso por stdout
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    // Las pruebas usan mocks sin tipar y suelen tener bloques largos de
    // preparacion de datos; los limites de complejidad no aportan ahi.
    files: ['**/*.{test,spec}.{ts,tsx}', '**/__tests__/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      'max-lines-per-function': 'off',
      'no-console': 'off',
    },
  },
  {
    // El schema de Drizzle declara decenas de tablas en un solo modulo por
    // diseno: es una descripcion declarativa, no logica ejecutable.
    files: ['packages/db/src/schema/**/*.ts'],
    rules: {
      'max-lines-per-function': 'off',
    },
  },
  {
    /**
     * Archivos de declaracion (.d.ts). Describen tipos ambientales, no codigo
     * ejecutable, y por eso necesitan construcciones que en codigo normal se
     * desaconsejan:
     *
     *   - `namespace` es la unica forma de ampliar NodeJS.ProcessEnv;
     *   - los parametros genericos de una interfaz ampliada se declaran para
     *     respetar la aridad del tipo original, aunque el cuerpo no los use.
     */
    files: ['**/*.d.ts'],
    rules: {
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/consistent-type-definitions': 'off',
    },
  },

  // ---------------------------------------------------------------------------
  // 8. INTEGRACION CON PRETTIER  (SIEMPRE AL FINAL)
  // ---------------------------------------------------------------------------
  // eslint-config-prettier no agrega reglas: DESACTIVA todas las reglas de
  // ESLint que chocan con el formateador (comillas, comas finales, sangria,
  // largo de linea). Asi queda una division de responsabilidades limpia:
  //
  //     Prettier  -> como se ve el codigo   (formato)
  //     ESLint    -> que hace el codigo     (correccion y complejidad)
  //
  // Debe ser el ultimo elemento del array para poder anular lo anterior.
  eslintConfigPrettier,
);
