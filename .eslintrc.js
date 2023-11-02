module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  extends: ['eslint-config-airbnb-base'],
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    },
  },
  ignorePatterns: ['next-env.d.ts', 'src/payload/payload-types.ts'],
  rules: {
    'no-restricted-syntax': 'off',
    'import/prefer-default-export': 'off',
    'react/prop-types': 'off',
    'react/no-unused-prop-types': 'off',
    'react/require-default-props': 'off',
    'no-underscore-dangle': 'off',
    'import/extensions': ['error', 'ignorePackages', {
      js: 'never', jsx: 'never', ts: 'never', tsx: 'never',
    }],
    'no-shadow': 'off',
    'no-continue': 'off',
    'no-param-reassign': 'off',
  },
  overrides: [{
    files: ['*.js'],
    rules: {
      '@typescript-eslint/no-var-requires': 'off',
    },
  }],
};
