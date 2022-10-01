/** @format */
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServeTwitchChat = void 0;
const tmi = __importStar(require("tmi.js"));
const socket_io_1 = require("socket.io");
const https_1 = require("https");
const events_1 = require("events");
const badgeDataReadyEvt = new events_1.EventEmitter();
const globalData = {};
class TwitchBadges {
    constructor() {
        this.badge_lkp_api = "https://badges.twitch.tv/v1/badges/global/display?language=en";
        this.badge_lkp = {};
        this.getBadgeURI = (badgeName, version) => {
            let badgeURI = "";
            badgeURI = this.badge_lkp["badge_sets"][badgeName]["versions"][version];
            return badgeURI;
        };
        const self = this;
        badgeDataReadyEvt.on("update", () => {
            if (globalData.hasOwnProperty("badges")) {
                self.badge_lkp = JSON.parse(globalData.badges);
                delete globalData.badges;
            }
        });
        (0, https_1.get)(this.badge_lkp_api, (res) => {
            let rawBadgeData = "";
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
}
// Lookup the badge URIs so we can display the images nicely
const transformTags = (badges, tags) => {
    const badgeURIs = new Array();
    try {
        const badgeList = tags.badges;
        for (let [key, version] of Object.entries(badgeList)) {
            const uri = badges.getBadgeURI(key, version);
            if (uri)
                badgeURIs.push(uri);
        }
    }
    catch (_a) { }
    tags.badgeURIs = badgeURIs;
    return tags;
};
const ServeTwitchChat = (server) => {
    const io = new socket_io_1.Server(server);
    const badges = new TwitchBadges();
    io.on("connection", (socket) => {
        socket.on("join", ({ channel, fade, bot_activity }) => {
            if (!channel)
                return;
            const twitchClient = new tmi.Client({
                channels: [channel],
                options: { debug: true },
            });
            twitchClient.connect();
            twitchClient.on("message", (channel, tags, message, self) => {
                tags = transformTags(badges, tags);
                socket.emit("message", { channel, tags, message, self });
            });
        });
    });
    return io;
};
exports.ServeTwitchChat = ServeTwitchChat;
