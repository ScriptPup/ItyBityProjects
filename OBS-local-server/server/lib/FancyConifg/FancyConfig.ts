/** @format */

import { configDB } from "../DatabaseRef";
import { Socket } from "socket.io";
import { DataSnapshot } from "acebase";

export type BotAccount = {
  username: string;
  password: string;
  channel: string;
};

export const FancyConfig = (socket: Socket): Socket => {
  // Listen for bot config requests
  socket.on("update-bot-acct", (acct: BotAccount | null) => {
    if (acct === null) {
      configDB.ref("twitch-bot-acct").remove();
      return;
    }
    configDB.ref("twitch-bot-acct").set(acct);
    configDB.ref("twitch-bot-acct").get((ss: DataSnapshot) => {
      socket.emit("get-bot-acct", ss.val());
    });
  });

  // Request the stored data about the bot account details
  socket.on("get-bot-acct", () => {
    configDB.ref("twitch-bot-acct").get((ss: DataSnapshot) => {
      socket.emit("get-bot-acct", ss.val());
    });
  });
  return socket;
};
