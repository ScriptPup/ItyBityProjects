/** @format */

import { configDB } from "../DatabaseRef";
import { Socket } from "socket.io";
import { DataSnapshot } from "acebase";
import { pino } from "pino";

const logger = pino(
  { level: "debug" },
  pino.destination({
    mkdir: true,
    writable: true,
    dest: `${__dirname}/../../logs/FancyConfig.log`,
    append: false,
  })
);

export type BotAccount = {
  username: string;
  password: string;
  channel: string;
  token?: {
    access_token: string;
    expires_in: number;
    token_type: string;
    access_timestamp?: Date;
  };
};

/**
 * Listener function which will listen for and provide interface with user configurations
 *
 * @remarks
 * Current configurations available:
 *      Twitch Bot Account (Used for chat command functions)
 *
 * @param socket - the websocket from which we should listen for configuration requests
 * @returns the websocket
 *
 */
export const FancyConfig = (socket: Socket): Socket => {
  // Listen for bot config requests
  socket.on("update-bot-acct", (acct: BotAccount | null) => {
    logger.debug({ acct }, "Recieved bot account update request from client");
    if (acct === null) {
      configDB.ref("twitch-bot-acct").remove();
      return;
    }
    // If a "ofuscated" password is provided, then don't overwrite the old password
    if (acct["password"] === "*****") {
      configDB.ref("twitch-bot-acct").get((ss: DataSnapshot) => {
        acct["password"] = ss.val()["password"];
        configDB.ref("twitch-bot-acct").set(acct);
        acct["password"] = "*****";
        socket.emit("get-bot-acct", acct);
      });
      return;
    }
    configDB.ref("twitch-bot-acct").set(acct);
    sendTwitchBotConfig(socket);
  });

  // Request the stored data about the bot account details
  socket.on("get-bot-acct", () => {
    logger.debug("Recieved bot account get request from client");
    sendTwitchBotConfig(socket);
  });
  return socket;
};

const sendTwitchBotConfig = (socket: Socket) => {
  configDB.ref("twitch-bot-acct").get((ss: DataSnapshot) => {
    const f_acct = ss.val();
    if (f_acct) {
      if (f_acct["password"].length > 0) {
        f_acct["password"] = "*****";
      }
    }
    logger.debug(
      { acct: f_acct },
      "Recieved bot account get request from client"
    );
    socket.emit("get-bot-acct", f_acct);
  });
};
