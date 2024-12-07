import { createWriteStream, mkdirSync } from "fs";
import { dirname, join } from "path";
import { Readable } from "stream";
import { type Entry, open as unzip, type ZipFile } from "yauzl";

function mkdir(directory: string) {
	mkdirSync(directory, {recursive: true});
}

async function ExtractEntry(zipfile: ZipFile, entry: Entry, outputDirectory: string) {
	const outputPath = join(outputDirectory, entry.fileName);

	if (/\/$/.test(entry.fileName)) {
		mkdir(outputPath);
	} else {
		mkdir(dirname(outputPath));

		return new Promise<Readable>((resolve, reject) => {
			zipfile.openReadStream(entry, (error, stream) => {
				if (error) return reject(error);
				resolve(stream);
			});
		}).then(readStream => new Promise((resolve, reject) => {
			const writeStream = createWriteStream(outputPath);
			readStream.pipe(writeStream);
			readStream.on("end", resolve);
			readStream.on("error", reject);
			writeStream.on("error", reject);
		}));
	}
}

export async function ExtractZip(filePath: string, outputDirectory: string) {
	return new Promise<ZipFile>((resolve, reject) => {
		unzip(filePath, {lazyEntries: true}, (error, zipfile) => {
			if (error) return reject(error);
			resolve(zipfile);
		});
	}).then(zipfile => new Promise<void>((resolve, reject) => {
		zipfile.readEntry();

		zipfile.on("entry", entry => {
			ExtractEntry(zipfile, entry, outputDirectory)
				.then(() => zipfile.readEntry());
		});
		zipfile.on("end", resolve);
		zipfile.on("error", reject);
	}));
}