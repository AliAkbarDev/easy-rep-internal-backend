module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true,
  },
  extends: [
    'airbnb-base',
  ],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
  },
  rules: {
    // Indentation
    'indent': ['error', 2],
    
    // Line endings
    'linebreak-style': ['error', 'unix'],
    
    // Quotes
    'quotes': ['error', 'single'],
    'jsx-quotes': ['error', 'prefer-double'],
    
    // Semicolons
    'semi': ['error', 'always'],
    
    // Trailing commas
    'comma-dangle': ['error', 'always-multiline'],
    
    // Max line length
    'max-len': ['error', { 'code': 120 }],
    
    // Console statements (allow in development)
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    
    // Unused variables
    'no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
    
    // Prefer const over let
    'prefer-const': 'error',
    
    // Arrow functions
    'arrow-parens': ['error', 'always'],
    'arrow-spacing': 'error',
    
    // Object shorthand
    'object-shorthand': 'error',
    
    // Template literals
    'prefer-template': 'error',
    
    // Destructuring
    'prefer-destructuring': ['error', {
      'array': false,
      'object': true,
    }],
    
    // Import/Export rules
    'import/order': ['error', {
      'groups': [
        'builtin',
        'external',
        'internal',
        'parent',
        'sibling',
        'index',
      ],
      'newlines-between': 'always',
    }],
    'import/no-unresolved': 'off', // Disable for CommonJS
    'import/extensions': 'off',
    
    // Function rules
    'func-names': 'off',
    'no-underscore-dangle': 'off',
    
    // Class rules
    'class-methods-use-this': 'off',
    
    // Async/await rules
    'no-await-in-loop': 'warn',
    
    // Error handling
    'no-throw-literal': 'error',
    
    // Security
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    
    // Code style
    'camelcase': ['error', { 'properties': 'never' }],
    'no-multiple-empty-lines': ['error', { 'max': 2 }],
    'no-trailing-spaces': 'error',
    'eol-last': 'error',
    
    // JSDoc
    'valid-jsdoc': 'off',
    
    // Complexity
    'complexity': ['warn', 10],
    'max-depth': ['warn', 4],
    'max-lines': ['warn', 300],
    'max-params': ['warn', 4],
    
    // Node.js specific
    'global-require': 'off',
    'no-process-exit': 'error',
    
    // Express specific
    'no-param-reassign': ['error', { 'props': false }],
  },
  overrides: [
    {
      files: ['tests/**/*.js', '**/*.test.js', '**/*.spec.js'],
      env: {
        jest: true,
      },
      rules: {
        'no-unused-expressions': 'off',
        'no-underscore-dangle': 'off',
      },
    },
    {
      files: ['scripts/**/*.js'],
      rules: {
        'no-console': 'off',
      },
    },
  ],
}; 