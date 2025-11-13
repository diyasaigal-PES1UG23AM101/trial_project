module.exports = {
  root: true,
  env: {
    node: true,       // Node.js globals
    es2021: true
  },
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "script" // Use "script" for CommonJS (require/module.exports)
  },
  extends: ["eslint:recommended"],
  rules: {
    "no-unused-vars": ["warn"],
    "no-console": "off"
  },
  overrides: [
    {
      files: ["tests/**/*.js"], // Match all test files
      env: {
        jest: true, // Enables Jest globals
        node: true  // Keep Node.js globals
      }
    }
  ]
};
