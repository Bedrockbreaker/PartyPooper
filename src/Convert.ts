import { Option, program } from "@commander-js/extra-typings";
import ffmpeg, { type FfmpegCommand } from "fluent-ffmpeg";
import { chmodSync, rmSync } from "fs";
import { mimeType } from "mime-type/with-db";
import { join } from "path";

//#if FFMPEG !== "shared"
import { setFfmpegPath } from "fluent-ffmpeg";

import { EnsureAsset } from "./FileManager";
//#endif

const presets = {
	veryslow: (command: FfmpegCommand) => {
		return command
			.audioBitrate(256)
			.addOptions([
				"-lossless", "1",
				"-tile-columns", "0",
				"-frame-parallel", "0",
				"-speed", "0",
				"-deadline", "best",
				"-cpu-used", "0"
			]);
	},
	slow1: (command: FfmpegCommand) => {
		return command
			.videoBitrate(2000)
			.noAudio()
			.addOptions([
				"-crf", "25",
				"-tile-columns", "2",
				"-frame-parallel", "1",
				"-pass", "1",
				"-f", "null",
				"-deadline", "good",
				"-cpu-used", "0",
				"-row-mt", "1"
			]);
	},
	slow2: (command: FfmpegCommand) => {
		return command
			.videoBitrate(2000)
			.audioBitrate(192)
			.addOptions([
				"-crf", "25",
				"-tile-columns", "2",
				"-frame-parallel", "1",
				"-speed", "1",
				"-pass", "2",
				"-y",
				"-deadline", "good",
				"-cpu-used", "0",
				"-row-mt", "1"
			]);
	},
	medium1: (command: FfmpegCommand) => {
		return command
			.videoBitrate(1500)
			.noAudio()
			.addOptions([
				"-crf", "30",
				"-tile-columns", "2",
				"-frame-parallel", "1",
				"-pass", "1",
				"-f", "null",
				"-deadline", "good",
				"-cpu-used", "1",
				"-row-mt", "1"
			]);
	},
	medium2: (command: FfmpegCommand) => {
		return command
			.videoBitrate(1500)
			.audioBitrate(128)
			.addOptions([
				"-crf", "30",
				"-tile-columns", "2",
				"-frame-parallel", "1",
				"-speed", "2",
				"-pass", "2",
				"-y",
				"-deadline", "good",
				"-cpu-used", "1",
				"-row-mt", "1"
			]);
	},
	fast: (command: FfmpegCommand) => {
		return command
			.videoBitrate(1000)
			.audioBitrate(96)
			.addOptions([
				"-crf", "35",
				"-tile-columns", "4",
				"-frame-parallel", "1",
				"-speed", "3",
				"-deadline", "good",
				"-cpu-used", "3",
				"-row-mt", "1"
			]);
	},
	veryfast: (command: FfmpegCommand) => {
		return command
			.videoBitrate(500)
			.audioBitrate(64)
			.addOptions([
				"-crf", "40",
				"-tile-columns", "4",
				"-frame-parallel", "1",
				"-speed", "4",
				"-deadline", "realtime",
				"-cpu-used", "5",
				"-row-mt", "1"
			]);
	},
	dumpsterfire: (command: FfmpegCommand) => {
		return command
			.videoBitrate(5)
			.audioBitrate(4)
			.audioChannels(1)
			.addOptions([
				"-crf", "63",
				"-tile-columns", "6",
				"-frame-parallel", "1",
				"-speed", "6",
				"-deadline", "best",
				"-cpu-used", "0",
				"-row-mt", "1"
			]);
	},
	horizontal: (command: FfmpegCommand) => {
		return command
			.videoFilter("scale=ih*53/30:ih,setdar=dar=53/30");
	},
	vertical: (command: FfmpegCommand) => {
		return command
			.videoFilter("scale=iw:iw*30/53,setdar=dar=53/30");
	},
	bars: (command: FfmpegCommand) => {
		return command
			.videoFilter("pad=max(iw\\,ih*53/30):max(ih\\,iw*30/53):(ow-iw)/2:(oh-ih)/2");
	},
	crop: (command: FfmpegCommand) => {
		return command
			.videoFilter("crop=min(iw\\,ih*53/30):min(ih\\,iw*30/53)");
	},
	exact: (command: FfmpegCommand) => {
		return command
			.videoFilter("scale=424:240,setdar=dar=53/30");
	},
	keep: (command: FfmpegCommand) => {
		return command;
	}
};

async function Convert(command: FfmpegCommand, output: string) {
	return new Promise<string|null>((resolve, reject) => {
		command
			.on("end", (stdout, stderr) => resolve(stdout))
			.on("error", reject)
			.on("progress", progress => {
				process.stdout.write(`Progress: ${progress.frames} frames`);
				process.stdout.cursorTo(0);
			})
			.save(output);
		// console.log(command._getArguments().join(" "));
	});
}

program
	.command("convert")
	.description("Converts a video/gif/image file into webm, for replacing a minigame video.")
	.argument("<input>", "Path to the file to be converted into a webm.")
	.argument("[output]", "Path to the output file.", "./output.webm")
	.option("-a, --audio <file>", "Path to an optional audio file, if the input is an image/gif.")
	.addOption(
		new Option("-p, --preset <preset>", "The preset to use. If you're looking for more advanced options, use ffmpeg directly.")
			.choices(["veryslow", "slow", "medium", "fast", "veryfast", "dumpsterfire"] as const)
			.default("medium" as const)
	)
	.addOption(
		new Option("-s, --size <size>", "How the input will be sized to a 53:30 aspect ratio. Horizontal will stretch/shrink the width. Vertical will stretch/shrink the height. Bars will add black bars. Crop will crop the file (centered). Exact will set the size to exactly 424x240. Keep won't change the size.")
			.choices(["horizontal", "vertical", "bars", "crop", "exact", "keep"] as const)
			.default("horizontal" as const)
	)
	.action(async (
		input,
		output,
		{
			audio,
			preset,
			size
		}
	) => {
		//#if FFMPEG === "static"
		const {assetPath: ffmpegPath, existed} = EnsureAsset("ffmpeg");
		const {assetPath: licensePath} = EnsureAsset("ffmpegLicense");
		
		if (!existed) {
			console.log("\nThis program uses ffmpeg to convert files to webm.");
			console.log(`You can see its license at ${licensePath}\n`);
		}

		chmodSync(ffmpegPath, 0o755); // chmod +x
		setFfmpegPath(ffmpegPath);
		//#endif
		
		const command = ffmpeg();

		let inputType = mimeType.lookup(input) || "";
		if (Array.isArray(inputType)) {
			inputType = inputType[0];
		}
		const isImage = inputType.startsWith("image/");

		command
			.input(input)
			.videoCodec("libvpx-vp9")
			.audioCodec("libopus");
		presets[size](command);

		if (isImage) {
			if (audio) {
				if (inputType === "image/gif") {
					command.addInputOption("-stream_loop", "-1");
					// "-stream_loop" does NOT like two-pass encoding
					if (preset === "slow") preset = "veryslow";
					else if (preset === "medium") preset = "fast";
				}
				command.input(audio);
				if (inputType === "image/gif") {
					command
						.addOptions(["-shortest", "-fflags", "shortest"]);
				}
			} else if (inputType !== "image/gif") {
				command.loop(5).outputFPS(.2);	
			}
		} else if (audio) {
			console.warn(`Audio file ${audio} will be ignored because the input is not an image/gif.`);
		}

		try {
			if (preset === "slow" || preset === "medium") {
				const commandPass2 = command.clone();
	
				console.log(`Converting ${input} to ${output} (1/2)`);
				presets[`${preset}1`](command);
	
				let devNull: string;
				//#if IS_WINDOWS
				devNull = "NUL";
				//#else
				devNull = "/dev/null";
				//#endif
	
				await Convert(command, devNull);
	
				console.log(`Converting ${input} to ${output} (2/2)`);
				presets[`${preset}2`](commandPass2);
				await Convert(commandPass2, output);

				rmSync(join(process.cwd(), "ffmpeg2pass-0.log"));
			} else {
				console.log(`Converting ${input} to ${output}`);
				presets[preset](command);
				await Convert(command, output);
			}
		} catch (error) {
			console.error(error);
			program.error("Conversion failed");
		}

		console.log(`Successfully converted ${input} to ${output}`);
	});