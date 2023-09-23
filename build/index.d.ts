/// <reference types="node" />
import EventEmitter from "events";
import Asset from "./interfaces/Asset";
import AssetResult from "./interfaces/AssetResult";
import DownloadItem from "./interfaces/DownloadItem";
declare class AssetDownloader extends EventEmitter {
    CDN_URL: string;
    hashAlgo: string;
    private logger;
    constructor(cdnUrl: string);
    /**
     * Checks whether a file exists on disk and matches the supplied algo.
     * @param filePath File to check
     * @param targetHash Target Hash
     * @returns Whether the file matches the sha
     */
    hashCheck(filePath: string, targetHash: string): Promise<boolean>;
    /**
     * Checks if a file exists and matches its hash.
     * If the file exists and no hash is supplied, this returns true.
     * If the file exists and a hash is supplied the result will be whether it matches.
     * If the file doesn't exist, this returns false;
     * @param filePath
     * @param sha1
     * @returns
     */
    validateFile(filePath: string, sha1?: string): Promise<boolean>;
    downloadFile(sourceUrl: string, destinationPath: string, hash?: string): Promise<void>;
    /**
     * Downloads a list of assets to a destination directory.
     * @param assetList List of Assets to download
     * @param destinationDirectory Directory to download them to
     * @returns Result for each asset
     */
    downloadAssetList(assetList: Asset[], destinationDirectory: string): Promise<AssetResult[]>;
    /**
     * Fetches an asset index off disk or from a URL.
     * @param indexPath Local or remote path to the asset index
     * @returns Asset list directly from the asset index file.
     */
    fetchIndex(indexPath: string): Promise<Asset[]>;
    /**
     * Downloads assets to a destination directory from the supplied asset index.
     * The asset index path can be local or remote.
     * @param indexPath Asset index path, can be local or remote (http)
     * @param destinationDirectory Destination directory for assets to be downloaded to.
     * @returns Result for each asset
     */
    downloadAssetIndex(indexPath: string, destinationDirectory: string): Promise<AssetResult[]>;
}
export default AssetDownloader;
export { Asset, AssetResult, DownloadItem, AssetDownloader, };
