/** @format */

"use strict";
import { Server as httpServer } from "http";
import { Server as socketServer } from "socket.io";
import { ServeTwitchChat } from "./server/twitch_socket_server";
import { startSimpleHTTP } from "./server/simple_static_filehost";

const port: number = Number.parseInt(process.argv[2]) || 9000;
const http: httpServer = startSimpleHTTP();
const io: socketServer = ServeTwitchChat(http);

http.listen(port);
console.log(`Server listening on port ${port} test`);
console.log(
  `Unless you're hosting somewhere, just go to http://localhost:${port}/ to use the server `
);
