import type { Plugin, OutputOptions, RollupOptions } from "rollup";
import { createFilter, type FilterPattern } from "@rollup/pluginutils";
import commonjsDefault from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import terserDefault from "@rollup/plugin-terser";
import typescriptDefault from "@rollup/plugin-typescript";

// FIXME: update rollup plugins -- see https://github.com/rollup/plugins/pull/1782
const commonjs = commonjsDefault as unknown as typeof commonjsDefault.default;
const terser = terserDefault as unknown as typeof terserDefault.default;
const typescript = typescriptDefault as unknown as typeof typescriptDefault.default;

function fileImport(include: FilterPattern, exclude?: FilterPattern): Plugin {
	const filter = createFilter(include, exclude);

	return {
		name: "file-import",
		transform(code, id) {
			if (!filter(id)) return;

			code = code.replace(/`|\\/g, "\\$&");
			// mangle the sentinel value, so that it doesn't appear in the source code
			code = code.replace(/NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2/g, "");

			if (filter(id)) return {
				code: `export default \`${code}\``,
				map: { mappings: "" }
			}
		}
	}
}

const output: OutputOptions[] = [
	{
		file: "./dist/partypooper.cjs",
		format: "commonjs"
	}
];

if (process.env.BUILD === "release") {
	output.push({
		file: "./dist/partypooper.min.cjs",
		format: "commonjs",
		plugins: [terser()]
	});
} else if (process.env.BUILD !== "debug") {
	throw new Error("Unknown build mode: " + process.env.BUILD);
}

export const options: RollupOptions = {
	input: "./src/main.ts",
	output,
	plugins: [
		typescript({
			tsconfig: "./src/tsconfig.json",
			allowImportingTsExtensions: false
		}),
		nodeResolve(),
		commonjs(),
		fileImport(["**/*.json"])
	]
}

export default options;