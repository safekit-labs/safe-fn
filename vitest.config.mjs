import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
	test: {
		include: ["./__tests__/**/*.test.ts"],
		globals: true,
		environment: "node",
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	coverage: {
		reporter: ["text", "json", "html"],
		include: ["src/**/*.ts"],
		exclude: [
			"**/*.test.ts",
			"**/*.spec.ts",
			"**/__tests__/**",
			"**/node_modules/**",
			"**/dist/**",
		],
		clean: true,
	},
});
