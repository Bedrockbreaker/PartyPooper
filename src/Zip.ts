import { createWriteStream, mkdirSync } from "fs";
import { basename, dirname, join } from "path";
import { Readable } from "stream";
import { ZipFile } from "yazl";
import { type Entry, open as unzip, type ZipFile as UnZipFile } from "yauzl";
import { readdir, stat } from "fs/promises";

function mkdir(directory: string) {
	mkdirSync(directory, {recursive: true});
}

async function ExtractEntry(zipfile: UnZipFile, entry: Entry, outputDirectory: string) {
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
	return new Promise<UnZipFile>((resolve, reject) => {
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

async function ReadDirectory(inputDirectory: string): Promise<string[]> {
	return readdir(inputDirectory).then(async fileNames => {
		const paths: string[] = [];
		for (const fileName of fileNames) {
			const path = join(inputDirectory, fileName);
			const stats = await stat(path);
			if (stats.isDirectory()) {
				paths.push(...(await ReadDirectory(path)));
			} else {
				paths.push(path);
			}
		}
		return paths;
	});
}

export async function ZipDirectory(inputDirectory: string, outputFilePath: string) {
	const zipfile = new ZipFile();

	return ReadDirectory(inputDirectory).then(files => {
		for (const file of files) {
			zipfile.addFile(file, basename(file));
		}
		zipfile.end();
		return new Promise((resolve, reject) => {
			const writeStream = zipfile.outputStream.pipe(createWriteStream(outputFilePath));
			writeStream.on("close", resolve);
			writeStream.on("error", reject);
		});
	});
}