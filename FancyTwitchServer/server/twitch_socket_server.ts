/** @format */

"use strict";
import type { Listener } from "@d-fischer/typed-event-emitter";

import { Server } from "socket.io";
import { Server as httpServer } from "http";
import { get as httpsGet } from "https";
import { EventEmitter } from "events";
import { ChatClient } from "@twurple/chat";
import { TwitchPrivateMessage } from "@twurple/chat/lib/commands/TwitchPrivateMessage";
import {
  getTwitchMessageObject,
  TwitchMessage,
} from "../shared/obj/TwitchObjects";
import { MainLogger } from "./lib/logging";

const logger = MainLogger.child({ file: "twitch_socket_server" });

const badgeDataReadyEvt: EventEmitter = new EventEmitter();
const globalData: { [key: string]: {} | string } = {};

class TwitchBadges {
  private badge_lkp_api: string =
    "https://badges.twitch.tv/v1/badges/global/display?language=en";
  private badge_lkp: any = {};
  constructor() {
    const self = this;

    badgeDataReadyEvt.on("update", () => {
      if (globalData.hasOwnProperty("badges")) {
        self.badge_lkp = JSON.parse(globalData.badges as string);
        delete globalData.badges;
      }
    });

    httpsGet(this.badge_lkp_api, (res) => {
      let rawBadgeData: string = "";
      res.on("data", (chunk) => {
        rawBadgeData += chunk;
      });
      res.on("end", () => {
        if (!rawBadgeData) {
          console.error("Data returned from badge API is blank.");
          return;
        }
        rawBadgeData = rawBadgeData.trim();
        globalData.badges = rawBadgeData;
        badgeDataReadyEvt.emit("update");
      });
    });
  }

  public getBadgeURI = (badgeName: string, version: string): string => {
    let badgeURI = "";
    badgeURI = this.badge_lkp["badge_sets"][badgeName]["versions"][version];
    return badgeURI;
  };
}

// Lookup the badge URIs so we can display the images nicely
const transformBadges = (
  badges: TwitchBadges,
  msgBadges?: Map<string, string>
): [string] | undefined => {
  const badgeURIs: [string] = new Array() as [string];
  try {
    if (!msgBadges) {
      return;
    }
    for (let [key, version] of msgBadges.entries()) {
      const uri = badges.getBadgeURI(key, version as string);
      if (uri) badgeURIs.push(uri);
    }
  } catch {}
  return badgeURIs;
};

export const ServeTwitchChat = (server: httpServer): Server => {
  const io = new Server(server);
  const badges = new TwitchBadges();
  const clients: { [key: string]: { connected: number; client: ChatClient } } =
    {};

  io.on("connection", (socket) => {
    logger.debug({ socketID: socket.id }, "Socket connected");
    socket.on("join", async ({ channel, fade, bot_activity }) => {
      logger.debug(
        { socketID: socket.id, channel, fade, bot_activity },
        "Socket requested to join"
      );

      // Don't create clients to the same channels over and over
      // Just connect ONCE
      if (!channel) return;
      if (!(channel in clients)) {
        clients[channel] = {
          connected: 1,
          client: new ChatClient({
            channels: [channel],
          }),
        };
      }
      const twitchClient = clients[channel].client;

      const msgListener: Listener = twitchClient.onMessage(
        (
          channel: string,
          user: string,
          message: string,
          msgObj: TwitchPrivateMessage
        ) => {
          const twitchMessage: TwitchMessage = getTwitchMessageObject({
            channel,
            message,
            msgObj,
          });
          twitchMessage.userInfo.badgeURIs = transformBadges(
            badges,
            msgObj.userInfo.badges
          );
          logger.debug(
            {
              socketID: socket.id,
              twitchMessage,
            },
            "Message recieved and sent on to socket"
          );
          socket.emit("message", twitchMessage);
        }
      );
      socket.on("disconnect", () => {
        msgListener.unbind();
        clients[channel].connected--;
        // If we have no active subscriptions to a channel, then quit the client and remove it from the internal cache
        if (clients[channel].connected < 1) {
          twitchClient.quit();
          delete clients[channel];
        }
      });
      await twitchClient.connect();
      logger.debug({ socketID: socket.id }, "Socket subscribed to messages");
    });
  });
  return io;
};
