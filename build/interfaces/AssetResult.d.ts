import Asset from "./Assets";
export default interface AssetResult extends Asset {
    status: 'DOWNLOADED' | 'REPLACED' | 'SKIPPED';
}
