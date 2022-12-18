/** @format */

"use strict";
import { Server as httpServer } from "http";
import { Server as socketServer } from "socket.io";
import { ServeTwitchChat } from "./server/twitch_socket_server";
import { TwitchListener } from "./server/lib/TwitchHandling/TwitchHandling";
import { startSimpleHTTP } from "./server/simple_static_filehost";
import { FancyCommandListener } from "./server/lib/FancyCommandExecutor/FancyCommandListener";
import { FancyConfig } from "./server/lib/FancyConifg/FancyConfig";

console.log(`Starting in env ${process.env.NODE_ENV}`);

// Setup root server modules
const port: number = Number.parseInt(process.argv[2]) || 9000;
const http: httpServer = startSimpleHTTP();
const io: socketServer = ServeTwitchChat(http);
// Setup a command listener which will handle incoming requests to modify commands stored in the local DB
const FCL: FancyCommandListener = new FancyCommandListener(io);
// Configure basic twitch listener
const TL: TwitchListener = new TwitchListener(FCL);
// Setup socket to listen for bot account commands and inform the TwitchListener when bot account information is changed
FancyConfig(io, TL);

// Start the server
http.listen(port);
console.log(`Server listening on port ${port} test`);
console.log(
  `Unless you're hosting somewhere, just go to http://localhost:${port}/ to use the server `
);
