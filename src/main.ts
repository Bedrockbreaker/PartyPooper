import { program } from "@commander-js/extra-typings";

import { ExtractZip } from "./Zip";

import packageJsonString from "../package.json";

// TODO: https://github.com/james-pre/xsea/blob/main/src/cli.ts

const packageJson: typeof packageJsonString =
	JSON.parse(packageJsonString as unknown as string);

program
	.name(process.argv[0])
	.description(packageJson.description)
	.version(packageJson.version)
	.argument("<file>", "path to the package.nw file")
	.argument("[destination]", "directory to extract the assets to", "./partyproject")
	.action((file, destination) => ExtractZip(file, destination));

program.parse();