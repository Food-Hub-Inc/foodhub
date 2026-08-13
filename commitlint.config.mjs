// =============================================================================
//  FoodHub - Validacion de mensajes de commit
// =============================================================================
//  Implementa la convencion definida en la Etapa 2 del proyecto
//  (punto 1.2.4 "Repositorio del proyecto con reglas de versionado"):
//
//      tipo(modulo): descripcion breve en minusculas
//
//  Ejemplo:  feat(auth): agregar pantalla de registro de cocinero
//
//  Se aplica desde el hook `commit-msg` de husky, de modo que un commit con
//  formato invalido se rechaza localmente y nunca llega al repositorio remoto.
// =============================================================================

/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Los seis tipos acordados por el equipo. Cualquier otro se rechaza para
    // que el historial se pueda filtrar de forma confiable (por ejemplo,
    // `git log --grep "^feat"` para armar el changelog de una entrega).
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'refactor', 'test', 'chore'],
    ],
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],

    // El modulo (scope) es OBLIGATORIO: identifica que parte del sistema toca
    // el commit y permite rastrear el avance por modulo en la matriz de
    // trazabilidad de la Etapa 6.
    'scope-empty': [2, 'never'],
    'scope-case': [2, 'always', 'kebab-case'],

    // La descripcion va en minusculas y sin punto final.
    'subject-case': [2, 'always', 'lower-case'],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],

    // 100 caracteres entran completos en la vista de commits de GitHub sin
    // que el titulo se corte con puntos suspensivos.
    'header-max-length': [2, 'always', 100],
    'body-leading-blank': [2, 'always'],
    'footer-leading-blank': [1, 'always'],
  },
};
