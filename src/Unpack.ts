import { program } from "@commander-js/extra-typings";

import { ExtractZip } from "./Zip";

program
	.command("unpack")
	.description("unpacks a package.nw file")
	.argument("<file>", "path to the package.nw file")
	.argument("[destination]", "directory to extract the assets to", "./partyproject")
	.action((file, destination) => {
		console.log(`Unpacking ${file} to ${destination}`);
		ExtractZip(file, destination).then(() => {
			console.log(`Successfully unpacked ${file} to ${destination}`);
		});
	});