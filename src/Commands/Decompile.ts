import { program } from "@commander-js/extra-typings";
import { closeSync, openSync, readSync, statSync, writeFileSync } from "fs";

import { GenerateRawSchema } from "../Decompiler/Parsers/RawSchemaGenerator";

function Decompile(file: string) {
	const fileDescriptor = openSync(file, "r");

	const stats = statSync(file);
	const fileSize = stats.size;

	const offset = 3; // The first 3 bytes of data.js are garbage
	const buffer = Buffer.allocUnsafe(fileSize - offset);
	readSync(fileDescriptor, buffer, 0, fileSize - offset, offset);

	closeSync(fileDescriptor);

	try {
		const data = JSON.parse(buffer.toString("utf-8"));
		return GenerateRawSchema(data);
	} catch (e) {
		console.error(e);
	}
}

program
	.command("decompile")
	.alias("decomp")
	.description("Decompiles the given data.js file")
	.argument("<file>", "The path to the data.js file")
	.argument("[output]", "The path to the output schema.json file", "./schema.json")
	.action((file, output) => {
		console.log(`Decompiling ${file}...`);
		const data = Decompile(file);
		console.log(data);
		writeFileSync(output, JSON.stringify(data, null, 2) + "\n");
	});