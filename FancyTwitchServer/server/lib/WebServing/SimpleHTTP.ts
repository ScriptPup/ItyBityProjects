/** @format */

import * as http from "http";
import * as url from "url";
import * as fs from "fs";
import * as path from "path";

// Just file hosting
export const startSimpleHTTP = (): http.Server => {
  const srv: http.Server = http.createServer(function (req, res) {
    console.log(`${req.method} ${req.url}`);
    if (typeof req.url == undefined) {
      return;
    }

    // parse URL
    // Cast to string after verifying above that the property isn't undefined
    const parsedUrl: url.UrlWithStringQuery = url.parse(req.url as string);
    // extract URL path
    let pathname: string = `.\\client\\content\\${parsedUrl.pathname}`;
    if (parsedUrl.pathname?.startsWith("/artshow")) {
      pathname = `.\\${parsedUrl.pathname}`;
    }

    // based on the URL path, extract the file extension. e.g. .js, .doc, ...
    const ext: string = path.parse(pathname).ext || ".html";
    // maps file extension to MIME typere
    const map: { [name: string]: string } = {
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
      } else {
        // if the file is found, set Content-type and send data
        res.setHeader("Content-type", map[ext] || "text/plain");
        res.end(data);
      }
    });
  });
  return srv;
};
