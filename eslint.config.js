import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.venv/**',
      '**/coverage/**',
      'apps/mobile/android/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  // Crescimento horizontal (docs/modulos.md, seção 6): a plataforma não importa módulos, e um módulo
  // só fala com outro pela porta de entrada (index.ts) ou por visão v_* no banco.
  {
    files: ['apps/api/src/plataforma/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['**/modulos/**'], message: 'A plataforma não importa módulos: recebe a lista em criarApp.' }] },
      ],
    },
  },
  {
    files: ['apps/api/src/modulos/*/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              // ../outro-modulo/arquivo.js (fora o index.js); ../../plataforma/... é permitido.
              regex: '^\\.\\./(?!\\.\\.)[^/]+/(?!index\\.js$).+',
              message: 'Um módulo não importa arquivos internos de outro módulo (só a porta index.ts).',
            },
          ],
        },
      ],
    },
  },
  {
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: {
      // Prefixo _ marca variável ignorada de propósito (ex.: tirar a senha de um objeto).
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
    },
  },
);
