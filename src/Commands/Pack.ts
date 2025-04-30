import { program } from "@commander-js/extra-typings";

import { ZipDirectory } from "../../shared/ZipArchive";

program
	.command("pack")
	.description("packs assets into a package.nw file")
	.argument("<assets>", "directory of the unpacked assets")
	.argument("[output]", "path to the output package.nw file", "./package.nw")
	.action((assets, output) => {
		console.log(`Packing ${assets} to ${output}`);
		ZipDirectory(assets, output).then(() => {
			console.log(`Successfully packed ${assets} to ${output}`);
		});
	});