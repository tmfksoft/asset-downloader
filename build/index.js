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
exports.downloadConfigAssets = exports.validateFile = exports.downloadFile = exports.hashCheck = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const axios_1 = __importDefault(require("axios"));
const mkdirp_1 = require("mkdirp");
/**
 * Checks whether a file on disk matches the supplied sha1.
 * @param filePath File to check
 * @param sha1 Target SHA1
 * @returns Whether the file matches the sha
 */
function hashCheck(filePath, sha1) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            const hash = crypto_1.default.createHash('sha1');
            const fd = fs_1.default.createReadStream(filePath);
            fd.on('data', (chunk) => {
                hash.update(chunk);
            });
            fd.on('close', () => {
                const hexHash = hash.digest("hex");
                if (hexHash.toLowerCase() === sha1.toLowerCase()) {
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
exports.hashCheck = hashCheck;
function downloadFile(sourceUrl, destinationPath, sha1) {
    return __awaiter(this, void 0, void 0, function* () {
        // Check if a file exists already.
        try {
            const valid = yield validateFile(destinationPath, sha1);
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
        if (typeof sha1 !== "undefined") {
            // Check the hash
            const hashResult = hashCheck(destinationPath, sha1);
            if (!hashResult) {
                throw new Error(`Failed to download ${sourceUrl}! SHA1 Mismatched!`);
            }
        }
    });
}
exports.downloadFile = downloadFile;
/**
 * Checks if a file exists and matches its hash.
 * If the file exists and no hash is supplied, this returns true.
 * If the file exists and a hash is supplied the result will be whether it matches.
 * If the file doesn't exist, this returns false;
 * @param filePath
 * @param sha1
 * @returns
 */
function validateFile(filePath, sha1) {
    return __awaiter(this, void 0, void 0, function* () {
        if (fs_1.default.existsSync(filePath)) {
            if (!sha1) {
                return true;
            }
            return hashCheck(filePath, sha1);
        }
        return false;
    });
}
exports.validateFile = validateFile;
/**
 * Downloads the required version of assets from the launcher cdn
 */
function downloadConfigAssets(cdnUrl, assetList, destinationDirectory) {
    return __awaiter(this, void 0, void 0, function* () {
        yield (0, mkdirp_1.mkdirp)(destinationDirectory);
        const downloadList = [];
        const results = [];
        // Seems redundant to repeat the same thing twice but it allows us to calculate progress and download sizes..
        for (let asset of assetList) {
            const fullPath = path_1.default.join(destinationDirectory, asset.path);
            const hashStart = asset.hash.substring(0, 2);
            const sourcePath = path_1.default.join(cdnUrl, hashStart, asset.hash);
            let needsDownloading = false;
            if (!fs_1.default.existsSync(fullPath)) {
                // Doesn't exist
                needsDownloading = true;
                results.push(Object.assign(Object.assign({}, asset), { status: "DOWNLOADED" }));
            }
            else {
                const valid = yield validateFile(fullPath, asset.hash);
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
        console.log(`${downloadList.length}/${assetList.length} files need downloading.`);
        // Download everything
        let downloadCount = 0;
        for (let asset of downloadList) {
            yield downloadFile(asset.source, asset.destination, asset.hash);
            downloadCount++;
            const progress = (downloadCount / downloadList.length) * 100;
            console.log(`Download Progress: ${progress.toFixed(2)}%`);
        }
        console.log("Download finished");
        return results;
    });
}
exports.downloadConfigAssets = downloadConfigAssets;
exports.default = downloadConfigAssets;
