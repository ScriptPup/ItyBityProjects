/** @format */

"use strict";
import { Server as httpServer } from "http";
import { Server as socketServer } from "socket.io";
import { ServeTwitchChat } from "./server/twitch_socket_server";
import { TwitchListener } from "./server/lib/TwitchHandling/TwitchHandling";
import { startSimpleHTTP } from "./server/simple_static_filehost";
import { FancyCommandListener } from "./server/lib/FancyCommandExecutor/FancyCommandListener";

console.log(`Starting in env ${process.env.NODE_ENV}`);

const port: number = Number.parseInt(process.argv[2]) || 9000;
const http: httpServer = startSimpleHTTP();
const io: socketServer = ServeTwitchChat(http);
const FCL: FancyCommandListener = new FancyCommandListener(io);
const TL: TwitchListener = new TwitchListener(FCL);

http.listen(port);
console.log(`Server listening on port ${port} test`);
console.log(
  `Unless you're hosting somewhere, just go to http://localhost:${port}/ to use the server `
);
