"use strict";
/** @format */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startSimpleHTTP = void 0;
const http = __importStar(require("http"));
const url = __importStar(require("url"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// Just file hosting
const startSimpleHTTP = () => {
    const srv = http.createServer(function (req, res) {
        console.log(`${req.method} ${req.url}`);
        if (typeof req.url == undefined) {
            return;
        }
        // parse URL
        // Cast to string after verifying above that the property isn't undefined
        const parsedUrl = url.parse(req.url);
        // extract URL path
        let pathname = `.\\content\\${parsedUrl.pathname}`;
        // based on the URL path, extract the file extension. e.g. .js, .doc, ...
        const ext = path.parse(pathname).ext || ".html";
        // maps file extension to MIME typere
        const map = {
            ".ico": "image/x-icon",
            ".html": "text/html",
            ".js": "text/javascript",
            ".json": "application/json",
            ".css": "text/css",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".wav": "audio/wav",
            ".mp3": "audio/mpeg",
            ".svg": "image/svg+xml",
            ".pdf": "application/pdf",
            ".doc": "application/msword",
        };
        // if is a directory search for index file matching the extension
        const isDir = fs.statSync(pathname, { throwIfNoEntry: false });
        if (isDir && isDir.isDirectory()) {
            pathname += "/index" + ext;
        }
        // read file from file system
        fs.readFile(pathname, function (err, data) {
            if (err) {
                res.statusCode = 500;
                res.end(`Error getting the file: ${err}.`);
            }
            else {
                // if the file is found, set Content-type and send data
                res.setHeader("Content-type", map[ext] || "text/plain");
                res.end(data);
            }
        });
    });
    return srv;
};
exports.startSimpleHTTP = startSimpleHTTP;
