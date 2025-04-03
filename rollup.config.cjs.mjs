import typescript from "@rollup/plugin-typescript";
import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";

export default {
	input: "src/main/index.ts",
	output: {
		format: "cjs",
		globals: {
			"d3-queue": "d3",
		},
	},
	plugins: [
		typescript({ tsconfig: "tsconfig.dist.json" }),
		nodeResolve(),
		commonjs(),
	],
};
