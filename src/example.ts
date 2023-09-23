import AssetDownloader from './index';
import path from 'path';

const destination = path.join(__dirname, "..", "java");
const configUrl = "https://launcher.p-n.ca/indexes/jdk-17.0.6_windows-x64.json";
const cdnUrl = "https://launcher.p-n.ca/assets";

const downloader = new AssetDownloader(cdnUrl);

downloader.downloadAssetIndex(configUrl, destination)
.then(results => {
	console.log(`Processed ${results.length} assets.`);
	const downloadList = results.filter(r => (r.status === "DOWNLOADED"));
	console.log(`Downloaded ${downloadList.length} files.`);
})
.catch(e => {
	console.error(`Failed to download files!`, e);
})