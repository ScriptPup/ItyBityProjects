/** @format */

import { configDB } from "../DatabaseRef";
import { Server, Socket } from "socket.io";
import { DataSnapshot } from "acebase";
import { MainLogger } from "../logging";
import { TwitchListener } from "../TwitchHandling/TwitchHandling";

const logger = MainLogger.child({ file: "FancyConfig" });

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
export const FancyConfig = (IO: Server, TL?: TwitchListener): Server => {
  IO.on("connection", (socket: Socket): void => {
    // Only bother subscribing to these events for clients which are in the setup-commands room, no other clients care
    socket.on("join-setup-commands", () => {
      // Listen for bot config requests
      socket.on("update-bot-acct", (acct: BotAccount | null) => {
        logger.debug(
          { acct },
          "Recieved bot account update request from client"
        );
        if (acct === null) {
          configDB.ref("twitch-bot-acct[0]").remove();
          return;
        }
        // If a "ofuscated" password is provided, then don't overwrite the old password
        if (acct["password"] === "*****") {
          configDB.ref("twitch-bot-acct").get((ss: DataSnapshot) => {
            let dbVal = ss.val();
            if (dbVal) {
              if (typeof dbVal === typeof [] && dbVal.length > 0) {
                acct["password"] = dbVal[0]["password"];
              }
            }
            configDB
              .ref("twitch-bot-acct")
              .set([acct])
              .catch((err) => {
                logger.error(
                  { acct: [acct], err },
                  "Failed to set account values"
                );
                // TODO: let the USER know the action failed...
              });
            acct["password"] = "*****";
            socket.emit("get-bot-acct", acct);
          });
          return;
        }
        configDB.ref("twitch-bot-acct").set([acct]);
        sendTwitchBotConfig(socket);
        // Refresh the TwitchSayHelper when the account changes
        if (TL) {
          TL.getAndListenForAccounts();
        }
      });

      // Request the stored data about the bot account details
      socket.on("get-bot-acct", () => {
        logger.debug("Recieved bot account get request from client");
        sendTwitchBotConfig(socket);
      });
    });
  });
  return IO;
};

const sendTwitchBotConfig = (socket: Socket) => {
  configDB.ref("twitch-bot-acct").get((ss: DataSnapshot) => {
    let f_acct = ss.val();
    if (f_acct) {
      if (typeof f_acct === typeof [] && f_acct.length > 0) {
        f_acct = f_acct[0];
      }
      if ("password" in f_acct) {
        if (f_acct["password"].length > 0) {
          f_acct["password"] = "*****";
        }
      }
    }
    logger.debug(
      { acct: f_acct },
      "Recieved bot account get request from client"
    );
    socket.emit("get-bot-acct", f_acct);
  });
};
