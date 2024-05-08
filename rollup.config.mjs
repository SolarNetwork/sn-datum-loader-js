import typescript from "@rollup/plugin-typescript";

export default {
	external: (id) => {
		return /(d3-.*)/.test(id);
	},
	input: "src/main/index.ts",
	output: {
		globals: {
			"d3-queue": "d3",
			"d3-request": "d3",
		},
	},
	plugins: [typescript({ tsconfig: "tsconfig.dist.json" })],
};
