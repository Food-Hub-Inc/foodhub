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

// --- Uniwind (Tailwind v4 para React Native) ---------------------------------
// withUniwindConfig debe envolver a cualquier otro wrapper de configuración.
module.exports = withUniwindConfig(config, {
  cssEntryFile: './global.css',
  dtsFile: './uniwind-types.d.ts',
});
