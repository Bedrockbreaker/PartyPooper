import { program } from "@commander-js/extra-typings";
import { rmSync } from "fs";
import { homedir } from "os";
import { join } from "path";

program
	.description("cleans the project")
	.option("--clean-cache", "clean the cache", false)
	.action(({cleanCache}) => {
		const dist = join(import.meta.dirname, "..", "dist");
		rmSync(dist, {recursive: true, force: true});

		const intermediate = join(import.meta.dirname, "..", "intermediate");
		rmSync(intermediate, {recursive: true, force: true});

		if (!cleanCache) return;

		const cache = join(homedir(), ".cache", "partypooper");
		rmSync(cache, {recursive: true, force: true});

		const dataDir = process.platform === "win32"
			? process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local")
			: process.env.XDG_DATA_HOME ?? join(homedir(), ".local", "share");
		const assetDir = join(dataDir, "partypooper");
		rmSync(assetDir, {recursive: true, force: true});
	})
	.parse();