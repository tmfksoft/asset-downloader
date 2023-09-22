import Asset from './interfaces/Assets';
import AssetResult from './interfaces/AssetResult';
/**
 * Checks whether a file on disk matches the supplied sha1.
 * @param filePath File to check
 * @param sha1 Target SHA1
 * @returns Whether the file matches the sha
 */
declare function hashCheck(filePath: string, sha1: string): Promise<boolean>;
declare function downloadFile(sourceUrl: string, destinationPath: string, sha1?: string): Promise<void>;
/**
 * Checks if a file exists and matches its hash.
 * If the file exists and no hash is supplied, this returns true.
 * If the file exists and a hash is supplied the result will be whether it matches.
 * If the file doesn't exist, this returns false;
 * @param filePath
 * @param sha1
 * @returns
 */
declare function validateFile(filePath: string, sha1?: string): Promise<boolean>;
/**
 * Downloads the required version of assets from the launcher cdn
 */
declare function downloadConfigAssets(cdnUrl: string, assetList: Asset[], destinationDirectory: string): Promise<AssetResult[]>;
export default downloadConfigAssets;
export { hashCheck, downloadFile, validateFile, downloadConfigAssets, };
