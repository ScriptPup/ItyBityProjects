/** @format */

"use strict";
import { Server as httpServer } from "http";
import { Server as socketServer } from "socket.io";
import { ServeTwitchChat } from "./server/lib/WebServing/TwitchSocketServing";
import { TwitchListener } from "./server/lib/TwitchHandling/TwitchHandling";
import { showcaseListener } from "./server/lib/Showcase/ShowcaseListener";
import { startSimpleHTTP } from "./server/lib/WebServing/SimpleHTTP";
import { FancyCommandListener } from "./server/lib/FancyCommandExecutor/FancyCommandListener";
import { FancyConfig } from "./server/lib/FancyConifg/FancyConfig";
import { FancyCommandExecutor } from "./server/lib/FancyCommandExecutor/FancyCommandExecutor";
import { FancyRedemptionStorage } from "./server/lib/FancyCommandExecutor/FancyRedemptionStorage";
import { FancyRedemptionListener } from "./server/lib/FancyCommandExecutor/FancyRedemptionListener";

console.log(`Starting in env ${process.env.NODE_ENV}`);

// Setup root server modules
const port: number = Number.parseInt(process.argv[2]) || 9000;
const http: httpServer = startSimpleHTTP();
const io: socketServer = ServeTwitchChat(http);
// Setup a command listener which will handle incoming requests to modify commands stored in the local DB
const FCE: FancyCommandExecutor = new FancyCommandExecutor();
const FCL: FancyCommandListener = new FancyCommandListener(io, FCE);
// Setup a redemption listener which will handle incoming requests to modify redemptions stored in the local DB
const FRS: FancyRedemptionStorage = new FancyRedemptionStorage();
const FRL: FancyRedemptionListener = new FancyRedemptionListener(io, FRS);

// Configure basic twitch listener
const TL: TwitchListener = new TwitchListener(FCL, FRL);
// Setup socket to listen for bot account commands and inform the TwitchListener when bot account information is changed
FancyConfig(io, TL);
// Setup socket to listen for showcase commands
showcaseListener(io);

// Start the server
http.listen(port);
console.log(`Server listening on port ${port} test`);
console.log(
  `Unless you're hosting somewhere, just go to http://localhost:${port}/ to use the server `
);
