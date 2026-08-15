// Configuración de Metro, el bundler de React Native.
const { getDefaultConfig } = require('expo/metro-config');
const { withUniwindConfig } = require('uniwind/metro');
const path = require('node:path');

const proyecto = __dirname;
const raizMonorepo = path.resolve(proyecto, '../..');

const config = getDefaultConfig(proyecto);

// --- Soporte de monorepo -----------------------------------------------------
// Sin estas dos líneas Metro solo mira dentro de apps/mobile y no encuentra
// @foodhub/shared ni las dependencias izadas a la raíz por pnpm.
config.watchFolders = [raizMonorepo];
config.resolver.nodeModulesPaths = [
  path.resolve(proyecto, 'node_modules'),
  path.resolve(raizMonorepo, 'node_modules'),
];

// Evita que se resuelvan dos copias de React (una en la app y otra en la raíz),
// error que se manifiesta como "Invalid hook call" y cuesta mucho diagnosticar.
config.resolver.disableHierarchicalLookup = true;

// --- Imports con extensión .js dentro de packages/ ---------------------------
// Los paquetes compartidos se escriben con la extensión puesta
// (`export * from './constants/enums.js'`) porque la API corre como ESM con
// resolución NodeNext, donde omitirla es un error en tiempo de ejecución.
// TypeScript entiende que ese `.js` apunta al `.ts` de al lado; Metro no, y
// falla con "Unable to resolve ./constants/enums.js".
//
// Acá se hace esa traducción, y SOLO para los archivos que viven en packages/:
// un `.js` que venga de node_modules es un `.js` de verdad y hay que resolverlo
// tal cual.
const carpetaDePaquetes = path.resolve(raizMonorepo, 'packages');

config.resolver.resolveRequest = (contexto, modulo, plataforma) => {
  const vieneDeUnPaqueteDelMonorepo =
    typeof contexto.originModulePath === 'string' &&
    contexto.originModulePath.startsWith(carpetaDePaquetes);

  if (
    vieneDeUnPaqueteDelMonorepo &&
    modulo.startsWith('.') &&
    modulo.endsWith('.js')
  ) {
    const sinExtension = modulo.slice(0, -'.js'.length);

    for (const extension of ['.ts', '.tsx']) {
      try {
        return contexto.resolveRequest(
          contexto,
          sinExtension + extension,
          plataforma,
        );
      } catch {
        // No existe con esa extensión: se prueba la siguiente y, si ninguna
        // sirve, cae al resolutor por defecto, que reportará el error real.
      }
    }
  }

  return contexto.resolveRequest(contexto, modulo, plataforma);
};

// --- Uniwind (Tailwind v4 para React Native) ---------------------------------
// withUniwindConfig debe envolver a cualquier otro wrapper de configuración.
module.exports = withUniwindConfig(config, {
  cssEntryFile: './global.css',
  dtsFile: './uniwind-types.d.ts',
});
