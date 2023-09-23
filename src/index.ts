import EventEmitter from "events";
import fs from 'fs';
import { mkdirp } from 'mkdirp';
import axios from 'axios';
import path from 'path';
import Crypto from 'crypto';
import pino from 'pino';

import Asset from "./interfaces/Asset";
import AssetResult from "./interfaces/AssetResult";
import DownloadItem from "./interfaces/DownloadItem";

class AssetDownloader extends EventEmitter {

	public CDN_URL: string;
	public hashAlgo: string = 'sha1';
	private logger = pino();

	constructor(cdnUrl: string) {
		super();
		this.CDN_URL = cdnUrl;
	}

	/**
	 * Checks whether a file exists on disk and matches the supplied algo.
	 * @param filePath File to check
	 * @param targetHash Target Hash
	 * @returns Whether the file matches the sha
	 */
	async hashCheck(filePath: string, targetHash: string): Promise<boolean> {
		return new Promise((resolve, reject) => {
			if (!fs.existsSync(filePath)) {
				return reject(false);
			}

			const hash = Crypto.createHash('sha1');
			const fd = fs.createReadStream(filePath);
			fd.on('data', (chunk) => {
				hash.update(chunk);
			})
			fd.on('close', () => {
				const hexHash = hash.digest("hex");
				if (hexHash.toLowerCase() === targetHash.toLowerCase()) {
					return resolve(true);
				}
				return resolve(false);
			});
			fd.on('error', (e) => {
				reject(e);
			})
		});
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
	async validateFile(filePath: string, sha1?: string) {
		if (fs.existsSync(filePath)) {
			if (!sha1) {
				return true;
			}
			return this.hashCheck(filePath, sha1);
		}
		return false;
	}

		
	async downloadFile(sourceUrl: string, destinationPath: string, hash?: string) {

		// Check if a file exists already.
		try {
			const valid = await this.validateFile(destinationPath, hash);
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

		if (typeof hash !== "undefined") {
			// Check the hash
			const hashResult = this.hashCheck(destinationPath, hash);

			if (!hashResult) {
				throw new Error(`Failed to download ${sourceUrl}! Hash Mismatched!`);
			}
		}
	}

	/**
	 * Downloads a list of assets to a destination directory.
	 * @param assetList List of Assets to download
	 * @param destinationDirectory Directory to download them to
	 * @returns Result for each asset
	 */
	async downloadAssetList(assetList: Asset[], destinationDirectory: string): Promise<AssetResult[]> {
		this.emit("starting", assetList);
		await mkdirp(destinationDirectory);

		const downloadList: DownloadItem[] = [];
		const results: AssetResult[] = [];

		// Seems redundant to repeat the same thing twice but it allows us to calculate progress and download sizes..
		for (let asset of assetList) {

			const fullPath = path.join(destinationDirectory, asset.path);
			const hashStart = asset.hash.substring(0, 2);
			const sourcePath = path.join(this.CDN_URL, hashStart, asset.hash);
			let needsDownloading = false;
			if (!fs.existsSync(fullPath)) {
				// Doesn't exist
				needsDownloading = true;
				results.push({
					...asset,
					status: "DOWNLOADED",
				});
			} else {
				const valid = await this.validateFile(fullPath, asset.hash);
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

		this.logger.info(`${downloadList.length}/${assetList.length} files need downloading.`);

		// Download everything
		let downloadCount = 0;
		for (let asset of downloadList) {
			this.emit("downloading", asset);
			await this.downloadFile(asset.source, asset.destination, asset.hash);
			downloadCount++;
			const progress = (downloadCount / downloadList.length) * 100;
			this.logger.info(`Download Progress: ${progress.toFixed(2)}%`);
			this.emit("downloaded", asset);
		}
		this.logger.info("Download finished");
		this.emit("complete", results);

		return results;
	}

	/**
	 * Fetches an asset index off disk or from a URL.
	 * @param indexPath Local or remote path to the asset index
	 * @returns Asset list directly from the asset index file.
	 */
	async fetchIndex(indexPath: string): Promise<Asset[]> {
		if (indexPath.startsWith("http")) {
			const r = await axios.get<Asset[]>(indexPath);
			return r.data;
		}

		if (!fs.existsSync(indexPath)) {
			throw new Error("Index file does not exist!");
		}

		const indexData = fs.readFileSync(indexPath);
		try {
			const assetList = JSON.parse(indexData.toString());
			return assetList;
		} catch (e) {
			throw new Error("Failed to parse asset index!");
		}
	}

	/**
	 * Downloads assets to a destination directory from the supplied asset index.
	 * The asset index path can be local or remote.
	 * @param indexPath Asset index path, can be local or remote (http)
	 * @param destinationDirectory Destination directory for assets to be downloaded to.
	 * @returns Result for each asset
	 */
	async downloadAssetIndex(indexPath: string, destinationDirectory: string): Promise<AssetResult[]> {
		const assetList = await this.fetchIndex(indexPath);
		return this.downloadAssetList(assetList, destinationDirectory);
	}

}
export default AssetDownloader;
export {
	Asset,
	AssetResult,
	DownloadItem,
	AssetDownloader,
};