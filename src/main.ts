import { program } from "@commander-js/extra-typings";

import "./Commands/Decompile";
import "./Commands/Pack";
import "./Commands/Unpack";

//#if FFMPEG !== "none"
import "./Commands/Convert"
//#endif

import packageJsonString from "../package.json";

const packageJson: typeof packageJsonString =
	JSON.parse(packageJsonString as unknown as string);

program
	.name(process.argv[0])
	.description(packageJson.description)
	.version(packageJson.version)
	.parse();