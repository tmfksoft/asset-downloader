import AssetDownloader from './index';
import path from 'path';
import axios from 'axios';
import Asset from './interfaces/Assets';

const destination = path.join(__dirname, "..", "java");
const configUrl = "https://launcher.p-n.ca/indexes/jdk-17.0.6_windows-x64.json";
const cdnUrl = "https://launcher.p-n.ca/assets";

axios.get<Asset[]>(configUrl)
.then((resp) => {
	console.log(`${resp.data.length} assets in list.`);
	AssetDownloader(cdnUrl, resp.data, destination)
	.then((results) => {
		console.log("Downloaded!", results);
	})
})