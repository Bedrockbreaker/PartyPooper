export const AssetManifest = [
	"ffmpeg",
	"ffmpegLicense"
] as const;

export type Asset = typeof AssetManifest[number];