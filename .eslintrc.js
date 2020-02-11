module.exports = {
  root: true,
  env: {
    node: true
  },
  extends: ["plugin:vue/essential", "eslint:recommended"],
  rules: {
    "no-console": process.env.NODE_ENV === "production" ? "error" : "off",
    "no-debugger": process.env.NODE_ENV === "production" ? "error" : "off",
    "prettier": 0,
    "no-unused-vars": 0,
    "require-atomic-updates": 0,
    "no-async-promise-executor": 0
  },
  globals: {
    "AMap": true
  },
  parserOptions: {
    parser: "babel-eslint"
  }
}