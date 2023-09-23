"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = __importDefault(require("./index"));
const path_1 = __importDefault(require("path"));
const destination = path_1.default.join(__dirname, "..", "java");
const configUrl = "https://launcher.p-n.ca/indexes/jdk-17.0.6_windows-x64.json";
const cdnUrl = "https://launcher.p-n.ca/assets";
const downloader = new index_1.default(cdnUrl);
downloader.downloadAssetIndex(configUrl, destination)
    .then(results => {
    console.log(`Processed ${results} assets.`);
    const downloadList = results.filter(r => (r.status === "DOWNLOADED"));
    console.log(`Downloaded ${downloadList.length} files.`);
})
    .catch(e => {
    console.error(`Failed to download files!`, e);
});
