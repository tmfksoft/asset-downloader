import Asset from "./Asset";

export default interface AssetResult extends Asset {
	status: 'DOWNLOADED' | 'REPLACED' | 'SKIPPED',
}