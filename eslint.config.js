"use strict";

const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
	js.configs.recommended,
	{
		files: ["**/*.js"],
		languageOptions: {
			ecmaVersion: 2024,
			sourceType: "commonjs",
			globals: globals.node,
		},
		rules: {
			"indent": ["error", "tab", { SwitchCase: 1 }],
			"quotes": ["error", "double", { avoidEscape: true }],
			"semi": ["error", "always"],
			"no-trailing-spaces": "error",
			"arrow-parens": ["error", "always"],
			"prefer-const": "error",
			"no-var": "error",
			"eqeqeq": ["error", "always"],
		},
	},
];
