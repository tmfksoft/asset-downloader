import fs from 'fs';
import path from 'path';
import Crypto from 'crypto';
import axios from 'axios';
import { mkdirp } from 'mkdirp';
import Asset from './interfaces/Assets';
import DownloadItem from './interfaces/DownloadItem';
import AssetResult from './interfaces/AssetResult';

/**
 * Checks whether a file on disk matches the supplied sha1.
 * @param filePath File to check
 * @param sha1 Target SHA1
 * @returns Whether the file matches the sha
 */
async function hashCheck(filePath: string, sha1: string): Promise<boolean> {
	return new Promise((resolve, reject) => {
		const hash = Crypto.createHash('sha1');
		const fd = fs.createReadStream(filePath);
		fd.on('data', (chunk) => {
			hash.update(chunk);
		})
		fd.on('close', () => {
			const hexHash = hash.digest("hex");
			if (hexHash.toLowerCase() === sha1.toLowerCase()) {
				return resolve(true);
			}
			return resolve(false);
		});
		fd.on('error', (e) => {
			reject(e);
		})
	});
}

async function downloadFile(sourceUrl: string, destinationPath: string, sha1?: string) {

	// Check if a file exists already.
	try {
		const valid = await validateFile(destinationPath, sha1);
		if (valid) {
			return;
		}
	} catch (e) {
		throw new Error("Failed to validate file " + destinationPath);
	}
	
	const parsedPath = path.parse(destinationPath);
	// Create the directory if it doesnt already exist.
	await mkdirp(parsedPath.dir);

	const performDownload = new Promise(async (resolve, reject) => {
		try {
			const writeStream = fs.createWriteStream(destinationPath);
			const result = await axios.get(sourceUrl, {
				responseType: "stream",
			});
			result.data.on('end', resolve);
			result.data.on('error', reject);
			result.data.pipe(writeStream);
		} catch (e) {
			reject(e);
		}
	});

	await performDownload;

	if (typeof sha1 !== "undefined") {
		// Check the hash
		const hashResult = hashCheck(destinationPath, sha1);

		if (!hashResult) {
			throw new Error(`Failed to download ${sourceUrl}! SHA1 Mismatched!`);
		}
	}
}

/**
 * Checks if a file exists and matches its hash.
 * If the file exists and no hash is supplied, this returns true.
 * If the file exists and a hash is supplied the result will be whether it matches.
 * If the file doesn't exist, this returns false;
 * @param filePath 
 * @param sha1 
 * @returns 
 */
async function validateFile(filePath: string, sha1?: string) {
	if (fs.existsSync(filePath)) {
		if (!sha1) {
			return true;
		}
		return hashCheck(filePath, sha1);
	}
	return false;
}

/**
 * Downloads the required version of assets from the launcher cdn
 */
async function downloadConfigAssets(cdnUrl: string, assetList: Asset[], destinationDirectory: string): Promise<AssetResult[]> {
	
	await mkdirp(destinationDirectory);

	const downloadList: DownloadItem[] = [];
	const results: AssetResult[] = [];

	// Seems redundant to repeat the same thing twice but it allows us to calculate progress and download sizes..
	for (let asset of assetList) {
		const fullPath = path.join(destinationDirectory, asset.path);
		const hashStart = asset.hash.substring(0, 2);
		const sourcePath = path.join(cdnUrl, hashStart, asset.hash);
		let needsDownloading = false;
		if (!fs.existsSync(fullPath)) {
			// Doesn't exist
			needsDownloading = true;
			results.push({
				...asset,
				status: "DOWNLOADED",
			});
		} else {
			const valid = await validateFile(fullPath, asset.hash);
			if (!valid) {
				// Corrupted
				needsDownloading = true;
				results.push({
					...asset,
					status: "REPLACED",
				});
			} else {
				// Exists and is valid.
				results.push({
					...asset,
					status: "SKIPPED",
				});
			}
		}

		if (needsDownloading) {
			downloadList.push({
				source: sourcePath,
				destination: fullPath,
				hash: asset.hash,
				size: asset.size,
			});
		}
	}

	console.log(`${downloadList.length}/${assetList.length} files need downloading.`);

	// Download everything
	let downloadCount = 0;
	for (let asset of downloadList) {
		await downloadFile(asset.source, asset.destination, asset.hash);
		downloadCount++;
		const progress = (downloadCount / downloadList.length) * 100;
		console.log(`Download Progress: ${progress.toFixed(2)}%`);
	}
	console.log("Download finished");

	return results;
}

export default downloadConfigAssets;
export {
	hashCheck,
	downloadFile,
	validateFile,
	downloadConfigAssets,
};