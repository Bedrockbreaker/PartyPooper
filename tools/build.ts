import { execSync } from "child_process";
import { Argument, Option, program } from "@commander-js/extra-typings";
import { copyFileSync, createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir, tmpdir } from "os";
import { basename, join } from "path";
import { inject } from "postject";
import { rollup, type RollupBuild } from "rollup";
import { loadConfigFile } from "rollup/loadConfigFile";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { extract as ExtractTar } from "tar";
import XZ from "xz-decompress";

import type { Asset } from "../shared/AssetManifest.ts";
import { ExtractZip } from "../shared/ZipArchive.ts";

export type FFmpegMode = "static" | "shared" | "none";

const cache = join(homedir(), ".cache", "partypooper");
const root = join(import.meta.dirname, "..");

class BuildTarget {
	public os: "linux" | "win";
	public arch: "arm64" | "x64";
	public isWindows: boolean;

	public constructor(target: string) {
		const match = target.match(/^(linux|win(?:32)?)-?(arm64|x?64)$/);
		if (match === null) {
			throw new Error(`Invalid or unsupported target: ${target}`);
		}

		const [os, arch] = match.slice(1);

		this.os = os === "win32" ? "win" : os as typeof this.os;
		this.arch = arch === "64" ? "x64" : arch as typeof this.arch;
		this.isWindows = os === "win";
	}

	public asNodeFormat(): string {
		return `${this.os}-${this.arch}`;
	}

	public asFFmpegFormat(): string {
		const arch = this.arch === "x64" ? "64" : this.arch;
		return `${this.os}${arch}`;
	}
}

class NodeVersion {
	public major: number;
	public minor: number;
	public patch: number;

	public static compare(a: NodeVersion, b: NodeVersion): -1 | 0 | 1 {
		if (a.major < b.major) return -1;
		if (a.major > b.major) return 1;
		if (a.minor < b.minor) return -1;
		if (a.minor > b.minor) return 1;
		if (a.patch < b.patch) return -1;
		if (a.patch > b.patch) return 1;
		return 0;
	}

	public constructor(version: string) {
		const match = version.match(/^v?(\d+)\.(\d+)\.(\d+)$/);

		if (match === null) {
			throw new Error(`Invalid node version: ${version}`);
		}

		[this.major, this.minor, this.patch] = match.slice(1).map(Number);
	}

	public compare(version: NodeVersion): -1 | 0 | 1 {
		return NodeVersion.compare(this, version);
	}

	public toString(): string {
		return `v${this.major}.${this.minor}.${this.patch}`;
	}
}

const minimumNodeVersion = new NodeVersion("20.6.0");

function writeConfig(buildTarget: BuildTarget, ffmpegMode: FFmpegMode) {
	const ffmpegSuffix = {static: "", shared: "-shared", none: "-no-ffmpeg"}[ffmpegMode || "static"];

	const configPath = `./intermediate/sea-config-${buildTarget.asNodeFormat()}${ffmpegSuffix}.json`;

	const config = {
		main: `./intermediate/partypooper-${buildTarget.asNodeFormat()}${ffmpegSuffix}.cjs`,
		output: `./intermediate/partypooper-${buildTarget.asNodeFormat()}${ffmpegSuffix}.blob`,
		disableExperimentalSEAWarning: true,
		assets: {} as Partial<Record<Asset, string>>
	};

	if (ffmpegMode === "static") {
		const ffmpegPath = join(cache, `ffmpeg-${buildTarget.asNodeFormat()}${buildTarget.isWindows ? ".exe" : ""}`);
		const ffmpegLicense = join(cache, "ffmpeg-LICENSE.txt");

		config.assets.ffmpeg = ffmpegPath;
		config.assets.ffmpegLicense = ffmpegLicense;
	}

	const configString = JSON.stringify(config);

	writeFileSync(configPath, configString);
	writeFileSync(join(root, "intermediate", "config.txt"), configString);

	return configPath;
}

async function build(isDebug: boolean, target: BuildTarget, ffmpegMode: FFmpegMode) {
	console.log(`Building ${isDebug	? "Debug" : "Release"}`);

	process.env.BUILD = isDebug ? "debug" : "release";
	process.env.TARGET = target.asNodeFormat();
	process.env.IS_WINDOWS = target.isWindows ? "true" : "";
	process.env.FFMPEG = ffmpegMode;

	const rollupConfigPath = join(root, "rollup.config.ts");
	const {options, warnings} = await loadConfigFile(rollupConfigPath, {
		configPlugin: "typescript"
	});

	warnings.flush();

	let buildFailed = false;
	for (const bundleOptions of options) {
		// "await using bundle" is a typescript-only feature (can't be used with node --experimental-strip-types)
		let bundle: RollupBuild | undefined;
		try {
			bundle = await rollup(bundleOptions);
			await Promise.all(bundleOptions.output.map(bundle.write));
		} catch (error) {
			buildFailed = true;
			console.error(error);
		}
		await bundle?.close();
		if (buildFailed) program.error("Build failed");
	}
}

function generateBlob(target: BuildTarget, ffmpegMode: FFmpegMode) {
	if (minimumNodeVersion.compare(new NodeVersion(process.version)) > 0) {
		throw new Error(`Incompatible node version: ${process.version}. Minimum required: ${minimumNodeVersion}`);
	}

	const ffmpegSuffix = {static: "", shared: "-shared", none: "-no-ffmpeg"}[ffmpegMode || "static"];

	const configPath = `./intermediate/sea-config-${target.asNodeFormat()}${ffmpegSuffix}.json`;

	const blobCommand = `node --experimental-sea-config ${configPath}`;
	execSync(blobCommand, { stdio: "inherit" });
}

function ensureCache() {
	if (!existsSync(cache)) mkdirSync(cache, {recursive: true});
}

function webStreamToNodeStream(webStream: ReadableStream) {
	const reader = webStream.getReader();
	return new Readable({
		async read() {
			const { done, value } = await reader.read();
			if (done) {
				this.push(null);
			} else {
				this.push(Buffer.from(value));
			}
		}
	});
}

async function downloadAndExtract(url: string) {
	const response = await fetch(url);
	if (!response.ok || !response.body) {
		program.error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
	}

	const archive = join(tmpdir(), basename(url));

	if (url.endsWith(".zip")) {
		await pipeline(
			response.body,
			createWriteStream(archive)
		);
		await ExtractZip(archive, tmpdir());
	} else if (url.endsWith(".tar.gz")) {
		await pipeline(
			webStreamToNodeStream(response.body),
			ExtractTar({cwd: tmpdir()})
		);
	} else if (url.endsWith(".tar.xz")) {
		await pipeline(
			webStreamToNodeStream(new XZ.XzReadableStream(response.body)),
			ExtractTar({cwd: tmpdir()})
		);
	} else {
		program.error(`Unsupported archive type: ${url}`);
	}

	return archive;
}

async function getNode(buildTarget: BuildTarget, targetVersion: NodeVersion) {
	const archiveName = `node-${targetVersion}-${buildTarget.asNodeFormat()}`;
	const nodePath = join(cache, archiveName + (buildTarget.isWindows ? ".exe" : ""));

	if (existsSync(nodePath)) {
		console.log(`Using cached node executable: ${nodePath}`);
		return nodePath;
	}
	
	const url = `https://nodejs.org/dist/${targetVersion}/${archiveName}.${buildTarget.isWindows ? "zip" : "tar.gz"}`;
	console.log(`Downloading node: ${url}`);
	await downloadAndExtract(url);

	const unpackedDirectory = join(tmpdir(), archiveName);
	const nodeExecutable = buildTarget.isWindows
		? join(unpackedDirectory, "node.exe")
		: join(unpackedDirectory, "bin", "node");
	
	if (!existsSync(nodeExecutable)) {
		program.error(`Failed to find node executable: ${nodeExecutable}`);
	}

	ensureCache();

	copyFileSync(nodeExecutable, nodePath);

	// unlinkSync(tempFilePath);
	// rmSync(unpackedDirectory, {recursive: true, force: true});

	console.log(`Cached node: ${nodePath}`);

	return nodePath;
}

async function getFfmpeg(buildTarget: BuildTarget) {
	const ffmpegTarget = `ffmpeg-${buildTarget.asNodeFormat()}`;
	const ffmpegPath = join(cache, ffmpegTarget + (buildTarget.isWindows ? ".exe" : ""));

	if (existsSync(ffmpegPath)) {
		console.log(`Using cached ffmpeg executable: ${ffmpegPath}`);
		return ffmpegPath;
	}

	const archiveName = `ffmpeg-master-latest-${buildTarget.asFFmpegFormat()}-lgpl`;
	const url = `https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/${archiveName}.${buildTarget.isWindows ? "zip" : "tar.xz"}`;
	console.log(`Downloading ffmpeg: ${url}`);
	await downloadAndExtract(url);

	const unpackedDirectory = join(tmpdir(), archiveName);
	const ffmpegExecutable = buildTarget.isWindows
		? join(unpackedDirectory, "bin", "ffmpeg.exe")
		: join(unpackedDirectory, "bin", "ffmpeg");
	const ffmpegLicense = join(unpackedDirectory, "LICENSE.txt");

	if (!existsSync(ffmpegExecutable)) {
		program.error(`Failed to find ffmpeg executable: ${ffmpegExecutable}`);
	}

	ensureCache();

	copyFileSync(ffmpegExecutable, ffmpegPath);
	copyFileSync(ffmpegLicense, join(cache, "ffmpeg-LICENSE.txt"));

	// unlinkSync(tempFilePath);
	// rmSync(unpackedDirectory, {recursive: true, force: true});

	console.log(`Cached ffmpeg: ${ffmpegPath}`);

	return ffmpegPath;
}

program
	.description("builds the project")
	.addArgument(
		new Argument("[targets...]", "Platform(s) to build for, e.g. 'linux-x64' or 'win-arm64'")
			.argParser((targetString, accumulator: BuildTarget[]) => {
				try {
					const target = new BuildTarget(targetString);
					accumulator.push(target);
					return accumulator;
				} catch (error) {
					program.error(`${error}`);
				}
			})
			.default([] as BuildTarget[], `${process.platform}-${process.arch}`)
	)
	.addOption(
		new Option("-n, --node-version <version>", "Node version to build for")
			.argParser(versionString => {
				try {
					return new NodeVersion(versionString);
				} catch (error) {
					program.error(`${error}`);
				}
			})
			.default(new NodeVersion(process.version), process.version)
	)
	.option("-d, --debug", "Build in debug mode", false)
	.addOption(
		new Option("-f, --ffmpeg <mode>", "Configure ffmpeg support. Static bundles ffmpeg into the binary. Shared uses the system ffmpeg. None disables ffmpeg support.")
			.choices(["static", "shared", "none"] as const)
			.default("static" as const)
	)
	.action(async (
		targets,
		{
			nodeVersion: targetNodeVersion,
			debug: isDebug,
			ffmpeg: ffmpegMode
		}
	) => {
		if (targets.length === 0) {
			targets.push(new BuildTarget(process.platform + "-" + process.arch));
		}

		if (!existsSync(join(root, "dist"))) {
			mkdirSync(join(root, "dist"));
		}
		if (!existsSync(join(root, "intermediate"))) {
			mkdirSync(join(root, "intermediate"));
		}

		for (const target of targets) {
			writeConfig(target, ffmpegMode);
			await build(isDebug, target, ffmpegMode);
		}

		if (isDebug) {
			console.log("Finished building debug");
			return;
		}

		if (minimumNodeVersion.compare(targetNodeVersion) > 0) {
			program.error(`Incompatible target build node version: ${targetNodeVersion}. Minimum required: ${minimumNodeVersion}`);
		}

		for (const target of targets) {
			if (ffmpegMode === "static") {
				await getFfmpeg(target);
			}

			console.log(`Generating blob for ${target.asNodeFormat()}`);
			generateBlob(target, ffmpegMode);
		}

		const ffmpegSuffix = {static: "", shared: "-shared", none: "-no-ffmpeg"}[ffmpegMode || "static"];

		for (const target of targets) {
			const executablePath = await getNode(target, targetNodeVersion);
			const appName = `PartyPooper-${target.asNodeFormat()}${ffmpegSuffix}`;
			const distExecutable = join("./dist", `${appName}${target.isWindows ? ".exe" : ""}`);
			copyFileSync(executablePath, distExecutable);

			console.log(`Injecting: ${distExecutable}`);

			await inject(
				distExecutable,
				"NODE_SEA_BLOB",
				readFileSync(`./intermediate/partypooper-${target.asNodeFormat()}${ffmpegSuffix}.blob`),
				{sentinelFuse: "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2"}
			);

			console.log(`Finished building ${appName}`);
		}
	})
	.parse();