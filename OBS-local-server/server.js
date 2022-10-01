/** @format */
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const twitch_socket_server_1 = require("./server/twitch_socket_server");
const simple_static_filehost_1 = require("./server/simple_static_filehost");
const port = Number.parseInt(process.argv[2]) || 9000;
const http = (0, simple_static_filehost_1.startSimpleHTTP)();
const io = (0, twitch_socket_server_1.ServeTwitchChat)(http);
http.listen(port);
console.log(`Server listening on port ${port} test`);
console.log(`Unless you're hosting somewhere, just go to http://localhost:${port}/ to use the server `);
