import fs from 'fs';
import os from 'os';
import path from 'path';
import stream from 'stream';

export const PipeStream = (readStream: stream.Readable, writeStream: stream.Writable) => {
    return new Promise((resolve, reject) => {
        readStream.pipe(writeStream)
            .on('finish', resolve)
            .on('error', reject);
    });
}


export const FileWrite = async (filename: string, contents: string) => {
	fs.writeFileSync(filename, contents);
}

export const FileRead = async (filename: string) => {
	const buffer: Buffer = fs.readFileSync(filename);
    return buffer.toString();
}

export const FileCopy = async (sourceFilename: string, targetFilename: string) => {
	const readStream = fs.createReadStream(sourceFilename);
	try {
		if (fs.existsSync(targetFilename))
			fs.unlinkSync(targetFilename);

		const writeStream = fs.createWriteStream(targetFilename);
		try {
			await PipeStream(readStream, writeStream);
		} finally {
			writeStream.close();
		}
	} finally {
		readStream.close();
	}
};

export const FileDelete = async (filename: string) => {
	if (fs.existsSync(filename))
		fs.unlinkSync(filename);
}

export const FileTempDirectory = () => os.tmpdir();

export const CurrentDirectory = () => path.dirname(__filename);
