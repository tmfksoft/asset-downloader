"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = __importDefault(require("./index"));
const path_1 = __importDefault(require("path"));
const axios_1 = __importDefault(require("axios"));
const destination = path_1.default.join(__dirname, "..", "java");
const configUrl = "https://launcher.p-n.ca/indexes/jdk-17.0.6_windows-x64.json";
const cdnUrl = "https://launcher.p-n.ca/assets";
axios_1.default.get(configUrl)
    .then((resp) => {
    console.log(`${resp.data.length} assets in list.`);
    (0, index_1.default)(cdnUrl, resp.data, destination)
        .then((results) => {
        console.log("Downloaded!", results);
    });
});
