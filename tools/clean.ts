import { program } from "@commander-js/extra-typings";
import { mkdirSync, rmSync } from "fs";
import { homedir } from "os";
import { join } from "path";

program
	.description("cleans the project")
	.option("--clean-cache", "clean the cache", false)
	.action(({cleanCache}) => {
		const dist = join(import.meta.dirname, "..", "dist");
		rmSync(dist, {recursive: true, force: true});
		mkdirSync(dist);
		
		if (!cleanCache) return;
		const cache = join(homedir(), ".cache", "partypooper");
		rmSync(cache, {recursive: true, force: true});
	})
	.parse();