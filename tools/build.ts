import { execSync } from "child_process";
import { program } from "@commander-js/extra-typings";
import { copyFileSync, createWriteStream, existsSync, mkdirSync, readFileSync, renameSync, rmSync, unlinkSync } from "fs";
import { homedir, tmpdir } from "os";
import { join } from "path";
import { inject } from "postject";
import { pipeline } from "stream/promises";
import { extract } from "tar";

import { ExtractZip } from "../src/Zip.ts";

function build(isDebug: boolean) {
	console.log(`Building ${isDebug	? "Debug" : "Release"}`);

	const rollupCommand = `npx rollup --config rollup.config.ts --configPlugin typescript --environment BUILD:${isDebug ? "debug" : "release"}`;
	execSync(rollupCommand, { stdio: "inherit" });
}

function generateBlob() {
	const [major, minor] = process.version.split(".").map(Number);
	if (major < 20 || (major >= 20 && minor < 6)) {
		program.error(`Unsupported node version: ${process.version}. The minimum supported version is 20.6.0`);
	}

	const blobCommand = `node --experimental-sea-config ./sea-config.json`;
	execSync(blobCommand, { stdio: "inherit" });
}

async function getNode(target: string, targetNodeVersion: string) {
	const fullTarget = `node-v${targetNodeVersion}-${target}`;
	const fileExtension = target.includes("win") ? ".zip" : ".tar.gz";
	const fileName = fullTarget + fileExtension;
	const cachePath = join(homedir(), ".cache", "partypooper");
	const executablePath = join(cachePath, fullTarget + (target.includes("win") ? ".exe" : ""));

	if (existsSync(executablePath)) {
		console.log(`Using cached node: ${executablePath}`);
		return executablePath;
	} else {
		console.log(`Downloading node: https://nodejs.org/dist/v${targetNodeVersion}/${fileName}`);
		const url = `https://nodejs.org/dist/v${targetNodeVersion}/${fileName}`;
		const response = await fetch(url);
		if (!response.ok || !response.body) {
			program.error(`Failed to download ${fullTarget}: ${response.status} ${response.statusText}`);
		}

		const tempFilePath = join(tmpdir(), fileName);
		await pipeline(
			response.body,
			createWriteStream(tempFilePath)
		);

		console.log(`Extracting node: ${fullTarget}`);
		if (fileExtension === ".tar.gz") {
			await extract({
				file: tempFilePath,
				cwd: tmpdir()
			});
		} else if (fileExtension === ".zip") {
			await ExtractZip(tempFilePath, tmpdir());
		} else {
			program.error(`Unsupported file extension: ${fileExtension}`);
		}

		const unpackedDirectory = join(tmpdir(), fullTarget);

		const nodeExecutable = target.includes("win")
			? join(unpackedDirectory, "node.exe")
			: join(unpackedDirectory, "bin", "node");
		
		if (!existsSync(nodeExecutable)) {
			program.error(`Failed to find node executable: ${nodeExecutable}`);
		}

		if (!existsSync(cachePath)) {
			mkdirSync(cachePath);
		}

		renameSync(nodeExecutable, executablePath);

		// unlinkSync(tempFilePath);
		// rmSync(unpackedDirectory, {recursive: true, force: true});

		console.log(`Cached node: ${executablePath}`);

		return executablePath;
	}
}

program
	.description("builds the project")
	.argument("[targets...]", "Platform(s) to build for, e.g. 'linux-x64' or 'win-arm64'")
	.option("--node-version <version>", "Node version to build for")
	.option("--debug", "Build in debug mode", false)
	.action(async (targets, {nodeVersion: targetNodeVersion, debug: isDebug}) => {
		build(isDebug);

		if (isDebug) {
			console.log("Finished building debug");
			return;
		}

		if (targets.length === 0) {
			program.error("No targets specified");
		}

		generateBlob();

		targetNodeVersion ??= process.version;
		const [major, minor] = targetNodeVersion.split(".").map(Number);
		if (major < 20 || (major >= 20 && minor < 6)) {
			program.error(`Unsupported target node version: ${targetNodeVersion}. The minimum supported version is 20.6.0`);
		}

		for (const target of targets) {
			const executablePath = await getNode(target, targetNodeVersion);
			const distExecutable = join("./dist", `PartyPooper${target.includes("win") ? ".exe" : ""}`);
			copyFileSync(executablePath, distExecutable);

			console.log(`Injecting: ${distExecutable}`);

			await inject(
				distExecutable,
				"NODE_SEA_BLOB",
				readFileSync("./dist/partypooper.blob"),
				{sentinelFuse: "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2"}
			);

			console.log(`Finished building ${target}`);
		}
	})
	.parse();