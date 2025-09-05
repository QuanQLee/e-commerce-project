module.exports = {
  root: true,
  env: { browser: true, es2021: true },
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  plugins: ['@typescript-eslint', 'react'],
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:@typescript-eslint/recommended',
    // Use Next.js recommended rules including React 17+ JSX transform support
    'next/core-web-vitals',
    'prettier',
  ],
  settings: { react: { version: 'detect' } },
  rules: {
    // React 17+ JSX transform doesn't require React in scope
    'react/react-in-jsx-scope': 'off',
    // Prefer warnings for gradual typing improvements
    '@typescript-eslint/no-explicit-any': 'warn',
  },
}
