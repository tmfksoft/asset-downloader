"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssetDownloader = void 0;
const events_1 = __importDefault(require("events"));
const fs_1 = __importDefault(require("fs"));
const mkdirp_1 = require("mkdirp");
const axios_1 = __importDefault(require("axios"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const pino_1 = __importDefault(require("pino"));
class AssetDownloader extends events_1.default {
    constructor(cdnUrl) {
        super();
        this.hashAlgo = 'sha1';
        this.logger = (0, pino_1.default)();
        this.CDN_URL = cdnUrl;
    }
    /**
     * Checks whether a file exists on disk and matches the supplied algo.
     * @param filePath File to check
     * @param targetHash Target Hash
     * @returns Whether the file matches the sha
     */
    hashCheck(filePath, targetHash) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                if (!fs_1.default.existsSync(filePath)) {
                    return reject(false);
                }
                const hash = crypto_1.default.createHash('sha1');
                const fd = fs_1.default.createReadStream(filePath);
                fd.on('data', (chunk) => {
                    hash.update(chunk);
                });
                fd.on('close', () => {
                    const hexHash = hash.digest("hex");
                    if (hexHash.toLowerCase() === targetHash.toLowerCase()) {
                        return resolve(true);
                    }
                    return resolve(false);
                });
                fd.on('error', (e) => {
                    reject(e);
                });
            });
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
    validateFile(filePath, sha1) {
        return __awaiter(this, void 0, void 0, function* () {
            if (fs_1.default.existsSync(filePath)) {
                if (!sha1) {
                    return true;
                }
                return this.hashCheck(filePath, sha1);
            }
            return false;
        });
    }
    downloadFile(sourceUrl, destinationPath, hash) {
        return __awaiter(this, void 0, void 0, function* () {
            // Check if a file exists already.
            try {
                const valid = yield this.validateFile(destinationPath, hash);
                if (valid) {
                    return;
                }
            }
            catch (e) {
                throw new Error("Failed to validate file " + destinationPath);
            }
            const parsedPath = path_1.default.parse(destinationPath);
            // Create the directory if it doesnt already exist.
            yield (0, mkdirp_1.mkdirp)(parsedPath.dir);
            const performDownload = new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                try {
                    const writeStream = fs_1.default.createWriteStream(destinationPath);
                    const result = yield axios_1.default.get(sourceUrl, {
                        responseType: "stream",
                    });
                    result.data.on('end', resolve);
                    result.data.on('error', reject);
                    result.data.pipe(writeStream);
                }
                catch (e) {
                    reject(e);
                }
            }));
            yield performDownload;
            if (typeof hash !== "undefined") {
                // Check the hash
                const hashResult = this.hashCheck(destinationPath, hash);
                if (!hashResult) {
                    throw new Error(`Failed to download ${sourceUrl}! Hash Mismatched!`);
                }
            }
        });
    }
    /**
     * Downloads a list of assets to a destination directory.
     * @param assetList List of Assets to download
     * @param destinationDirectory Directory to download them to
     * @returns Result for each asset
     */
    downloadAssetList(assetList, destinationDirectory) {
        return __awaiter(this, void 0, void 0, function* () {
            this.emit("starting", assetList);
            yield (0, mkdirp_1.mkdirp)(destinationDirectory);
            const downloadList = [];
            const results = [];
            // Seems redundant to repeat the same thing twice but it allows us to calculate progress and download sizes..
            for (let asset of assetList) {
                const fullPath = path_1.default.join(destinationDirectory, asset.path);
                const hashStart = asset.hash.substring(0, 2);
                const sourcePath = path_1.default.join(this.CDN_URL, hashStart, asset.hash);
                let needsDownloading = false;
                if (!fs_1.default.existsSync(fullPath)) {
                    // Doesn't exist
                    needsDownloading = true;
                    results.push(Object.assign(Object.assign({}, asset), { status: "DOWNLOADED" }));
                }
                else {
                    const valid = yield this.validateFile(fullPath, asset.hash);
                    if (!valid) {
                        // Corrupted
                        needsDownloading = true;
                        results.push(Object.assign(Object.assign({}, asset), { status: "REPLACED" }));
                    }
                    else {
                        // Exists and is valid.
                        results.push(Object.assign(Object.assign({}, asset), { status: "SKIPPED" }));
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
                yield this.downloadFile(asset.source, asset.destination, asset.hash);
                downloadCount++;
                const progress = (downloadCount / downloadList.length) * 100;
                console.log(`Download Progress: ${progress.toFixed(2)}%`);
                this.emit("downloaded", asset);
            }
            this.logger.info("Download finished");
            this.emit("complete", results);
            return results;
        });
    }
    /**
     * Fetches an asset index off disk or from a URL.
     * @param indexPath Local or remote path to the asset index
     * @returns Asset list directly from the asset index file.
     */
    fetchIndex(indexPath) {
        return __awaiter(this, void 0, void 0, function* () {
            if (indexPath.startsWith("http")) {
                const r = yield axios_1.default.get(indexPath);
                return r.data;
            }
            if (!fs_1.default.existsSync(indexPath)) {
                throw new Error("Index file does not exist!");
            }
            const indexData = fs_1.default.readFileSync(indexPath);
            try {
                const assetList = JSON.parse(indexData.toString());
                return assetList;
            }
            catch (e) {
                throw new Error("Failed to parse asset index!");
            }
        });
    }
    /**
     * Downloads assets to a destination directory from the supplied asset index.
     * The asset index path can be local or remote.
     * @param indexPath Asset index path, can be local or remote (http)
     * @param destinationDirectory Destination directory for assets to be downloaded to.
     * @returns Result for each asset
     */
    downloadAssetIndex(indexPath, destinationDirectory) {
        return __awaiter(this, void 0, void 0, function* () {
            const assetList = yield this.fetchIndex(indexPath);
            return this.downloadAssetList(assetList, destinationDirectory);
        });
    }
}
exports.AssetDownloader = AssetDownloader;
exports.default = AssetDownloader;
