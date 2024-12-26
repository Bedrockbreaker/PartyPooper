import { existsSync } from "fs";
import { basename, dirname, join } from "path";

import configString from "./config.json";

//#if BUILD !== "debug"
import { mkdirSync, writeFileSync } from "fs";
import { getAsset } from "node:sea";
import { homedir } from "os";
//#endif

const config: typeof configString = JSON.parse(configString as unknown as string);

export type Asset = keyof typeof config.assets;

export function EnsureAsset(asset: Asset) {
	if (!(asset in config.assets)) {
		throw new Error(`Unknown asset: ${asset}`);
	}

	//#if BUILD === "debug"
	return EnsureAssetLocal(asset, config.assets[asset]);
	//#else

	let assetPath: string;
	//#if IS_WINDOWS
	assetPath = process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local");
	//#else
	assetPath = process.env.XDG_DATA_HOME ?? join(homedir(), ".local", "share");
	//#endif

	assetPath = join(assetPath, "partypooper", basename(config.assets[asset]));
	return EnsureAssetSea(asset, assetPath);
	//#endif
}

//#if BUILD === "debug"
function EnsureAssetLocal(asset: string, configPath: string) {
	if (existsSync(configPath)) return {assetPath: configPath, existed: true};
	throw new Error(`Asset not found: ${asset}`);
}
//#else
function EnsureAssetSea(asset:string, assetPath: string) {
	if (existsSync(assetPath)) return {assetPath, existed: true};

	const assetDir = dirname(assetPath);
	if (!existsSync(assetDir)) mkdirSync(assetDir, {recursive: true});
	writeFileSync(assetPath, Buffer.from(getAsset(asset)));

	return {assetPath, existed: false};
}
//#endif