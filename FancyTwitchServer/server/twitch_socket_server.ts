/** @format */

"use strict";
import * as tmi from "tmi.js";
import { Server } from "socket.io";
import { Server as httpServer } from "http";
import { get as httpsGet } from "https";
import { EventEmitter } from "events";

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
const transformTags = (
  badges: TwitchBadges,
  tags: tmi.ChatUserstate
): tmi.ChatUserstate => {
  const badgeURIs: [string] = new Array() as [string];
  try {
    const badgeList = tags.badges;
    if (!badgeList) {
      return tags;
    }
    for (let [key, version] of Object.entries(badgeList)) {
      const uri = badges.getBadgeURI(key, version as string);
      if (uri) badgeURIs.push(uri);
    }
  } catch {}
  tags.badgeURIs = badgeURIs;
  return tags;
};

export const ServeTwitchChat = (server: httpServer): Server => {
  const io = new Server(server);
  const badges = new TwitchBadges();

  io.on("connection", (socket) => {
    socket.on("join", ({ channel, fade, bot_activity }) => {
      if (!channel) return;
      const twitchClient = new tmi.Client({
        channels: [channel],
        options: { debug: true },
      });
      twitchClient.connect();
      twitchClient.on(
        "message",
        (channel: string, tags: tmi.ChatUserstate, message: string, self) => {
          tags = transformTags(badges, tags);
          socket.emit("message", { channel, tags, message, self });
        }
      );
    });
  });
  return io;
};
