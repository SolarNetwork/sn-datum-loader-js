import babel from "rollup-plugin-babel";
import includePaths from "rollup-plugin-includepaths";

const includePathOptions = {
	include: {},
	paths: ["src"],
	external: [],
	extensions: [".js"]
};

export default {
	external: id => {
		return /(d3-|solarnetwork-api-)/.test(id);
	},
	output: {
		globals: {
			"d3-queue": "d3",
			"d3-request": "d3",
			"solarnetwork-api-core": "sn"
		}
	},
	plugins: [
		includePaths(includePathOptions),
		babel({
			exclude: "node_modules/**",
			babelrc: false,
			presets: [
				[
					"@babel/env",
					{
						targets: {
							browsers: ["last 2 versions"],
							node: "current"
						},
						modules: false
					}
				]
			]
		})
	]
};
