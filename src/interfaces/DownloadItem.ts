export default interface DownloadItem {
	source: string,
	destination: string,
	hash?: string,
	size?: number,
}