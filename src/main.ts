import { program } from "@commander-js/extra-typings";

import "./Pack";
import "./Unpack";

import packageJsonString from "../package.json";

// TODO: https://github.com/james-pre/xsea/blob/main/src/cli.ts

const packageJson: typeof packageJsonString =
	JSON.parse(packageJsonString as unknown as string);

program
	.name(process.argv[0])
	.description(packageJson.description)
	.version(packageJson.version)
	.parse();