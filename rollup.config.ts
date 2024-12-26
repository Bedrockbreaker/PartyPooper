import MagicString from "magic-string";
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

			return {
				code: `export default \`${code}\``,
				map: { mappings: "" }
			};
		}
	}
}

function conditionalCompiler(): Plugin {
	return {
		name: "conditional-compiler",
		transform(code, id) {
			const directiveRegex = /^[\t ]*\/\/#(if|elif|else|endif)(?:[\t ]+(.*))?$/gm;
			
			const magicString = new MagicString(code);

			const stack: boolean[] = [];
			let currentEvaluation = true;
			let lastEvaluation = false;
			let match: RegExpExecArray | null;
			let lastStringIndex = 0;

			while ((match = directiveRegex.exec(code)) !== null) {
				const [fullMatch, tag, predicate] = match as unknown as [string, "if" | "elif" | "else" | "endif", string | undefined];

				const startIndex = match.index;
				const endIndex = startIndex + fullMatch.length;

				if (!currentEvaluation) {
					magicString.remove(lastStringIndex, startIndex);
				}
				lastStringIndex = endIndex;

				switch (tag) {
					case "if": {
						if (predicate === undefined) {
							throw new Error(`Missing predicate for //#if at char ${startIndex} in ${id}`);
						}
						const result = evalPredicate(predicate);
						stack.push(currentEvaluation);
						currentEvaluation &&= result;
						lastEvaluation = result;
						break;
					}
					case "elif": {
						if (predicate === undefined) {
							throw new Error(`Missing predicate for //#elif at char ${startIndex} in ${id}`);
						}
						if (stack.length === 0) {
							throw new Error("Unexpected //#elif");
						}

						if (lastEvaluation) {
							currentEvaluation = false;
						} else {
							const result = evalPredicate(predicate);
							currentEvaluation = stack.at(-1)! && result;
							lastEvaluation = result;
						}
						break;
					}
					case "else": {
						if (predicate !== undefined) {
							throw new Error(`Unexpected predicate for //#else at char ${startIndex} in ${id}`);
						}
						if (stack.length === 0) {
							throw new Error("Unexpected //#else");
						}

						currentEvaluation = stack.at(-1)! && !lastEvaluation;
						break;
					}
					case "endif": {
						if (predicate !== undefined) {
							throw new Error(`Unexpected predicate for //#endif at char ${startIndex} in ${id}`);
						}
						if (stack.length === 0) {
							throw new Error("Unexpected //#endif");
						}

						currentEvaluation = stack.pop()!;
						lastEvaluation = false;
						break;
					}
				}
			}

			if (stack.length > 0) {
				throw new Error("Unexpected end of conditional block");
			}

			return {
				code: magicString.toString(),
				map: magicString.generateMap({ hires: true })
			};
		}
	}
}

function evalPredicate(predicate: string): boolean {
	const sanitizedPredicate = predicate.trim().replace(/\b([A-Za-z_]\w*)\b/g, match => {
		if (process.env[match] !== undefined) {
			return JSON.stringify(process.env[match]);
		}

		return match;
	});

	try {
		return new Function("return " + sanitizedPredicate)();
	} catch (error) {
		throw new Error(`Invalid predicate: "${predicate}" - ${error}`);
	}
}

const output: OutputOptions[] = [
	{
		file: `./dist/partypooper${{static: "", shared: "-shared", none: "-no-ffmpeg"}[process.env.FFMPEG || "static"]}.cjs`,
		format: "commonjs"
	}
];

if (process.env.BUILD === "release") {
	output.push({
		file: `./dist/partypooper${{static: "", shared: "-shared", none: "-no-ffmpeg"}[process.env.FFMPEG || "static"]}.min.cjs`,
		format: "commonjs",
		plugins: [terser()]
	});
} else if (process.env.BUILD !== "debug") {
	throw new Error(`Unknown build mode: ${process.env.BUILD}`);
}

export const options: RollupOptions = {
	input: "./src/main.ts",
	output,
	plugins: [
		typescript({tsconfig: "./src/tsconfig.json"}),
		conditionalCompiler(),
		nodeResolve(),
		commonjs(),
		fileImport(["**/*.json"])
	],
	external: ["node:sea"]
};

export default options;