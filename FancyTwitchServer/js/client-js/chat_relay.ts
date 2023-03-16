/** @format */

import {
  TwitchMessageTagEmotes,
  TwitchMessageTagParsedEmotes,
  TwitchMessage,
} from "../shared/obj/TwitchObjects";

import type { io, Socket } from "socket.io-client";

const params = new URLSearchParams(window.location.search);
const channel = params.get("channel"),
  fade = Number.parseFloat(params.get("fade") || "0"),
  bot_activity = (params.get("bot_activity") || "false") === "true",
  debug = (params.get("debug") || "false") === "true",
  swipe = (params.get("swipe") || "true") === "true";

/**
 * Given the tags from a tmi.js twitch message and a container DOM element, will add badge icons to the message
 *
 *
 * @param tags - tmi.js twitch message object tags sub-object
 * @param parent - DOM element which will be used as the parent to the new badge icons to add
 * @returns void
 *
 */
const createBadgeImages = (parent: Element, badgeURIs?: [string]): void => {
  if (badgeURIs) {
    for (let i = 0; i < badgeURIs.length; i++) {
      const image_urls = new Array();
      let image_url: string = "";
      let image_count = 1;
      for (let [key, uri] of Object.entries(badgeURIs[i])) {
        if (key.startsWith("image_url")) {
          if (image_url === "") image_url = uri as string;

          image_urls.push(uri + ` x${image_count}`);
          image_count++;
        }
      }
      if (image_urls.length) {
        const img = document.createElement("img");
        img.src = image_url;
        img.srcset = image_urls.join(", ");
        parent.appendChild(img);
      }
    }
  }
  return;
};

/**
 * Given a tmi.js twitch message and the emotes object from the tmi.js tags, will recursivley replace all emote text with an emote image
 *
 * @remarks
 * Replaces the emotes in reverse order (furthest to the right, to the left) in order to ensure emote replacement positions are correct
 *
 * @param message - The tmi.js message which we'll be replacing emote references with an image from/to
 * @param emotes - The tmi.js emotes included in the message tags object. Dictionary of objects consisting of {emoteName: "posStart-posEnd"}
 * @param startOffset - Shouldn't be used externally, included for recursive replacement; NOT intended to be set outside of itself
 * @returns message, modified with the text-HTML including emote images
 *
 */
const replaceWithEmotes = (
  message: string,
  emotes: TwitchMessageTagEmotes,
  startOffset: number = 0
): string => {
  console.log("Replacing emotes");
  const emoteRoot: string =
    "https://static-cdn.jtvnw.net/emoticons/v1/{EMOTE_ID}/1.0";
  const sortedEmotes: Array<TwitchMessageTagParsedEmotes> =
    new Array<TwitchMessageTagParsedEmotes>();
  for (let [emote, position] of Object.entries<Array<string>>(emotes)) {
    const pos = position[0].split("-");
    const nemote: TwitchMessageTagParsedEmotes = {
      name: emote,
      start: Number.parseInt(pos[0]),
      end: Number.parseInt(pos[1]) + 1,
    };
    sortedEmotes.push(nemote);
  }
  sortedEmotes.sort((a, b) => a.start - b.start);

  console.log("Emotes sorted", sortedEmotes);

  let newMessage: string = message;
  let offset: number = startOffset;
  for (let emoteRec of sortedEmotes) {
    const emote: string = emoteRec["name"];
    const start: number = emoteRec["start"];
    const end: number = emoteRec["end"];
    const emoteElement: HTMLImageElement = document.createElement("img");
    console.log(`Start & end for ${emote} ${start}-${end}, offset ${offset}`);
    let thisEmoteURI: string = emoteRoot.replace("{EMOTE_ID}", emote);
    emoteElement.classList.add("emote");
    emoteElement.src = thisEmoteURI;
    console.log("New image", emoteElement);
    console.log("Image html", emoteElement.outerHTML);

    const msgBegin: string = newMessage.substring(0, start + offset);
    const msgReplace: string = newMessage.substring(
      start + offset,
      end + offset
    );
    const msgEnd: string = newMessage.substring(
      end + offset,
      newMessage.length
    );

    console.log(`Begin message ${msgBegin}, 0-${start + offset}`);
    console.log(
      `Replace message ${msgReplace}, ${start + offset}-${end + offset}`
    );
    console.log(`End message ${msgEnd}, ${end + offset}-${newMessage.length}`);

    const replaceMsg: string = msgBegin + emoteElement.outerHTML + msgEnd;
    offset = replaceMsg.length - message.length + startOffset;
    newMessage = replaceMsg;
    console.log("Done with a replacement", newMessage);
  }
  // console.log(`Done with replacements, returning ${newMessage}`);
  return newMessage;
};

/**
 * Parse a twitch message returned by tmi.js; escape any HTML present in the message (don't let chatters inject HTML into your chat!) and then replace emotes with their associated image
 *
 *
 * @param message - The tmi.js message
 * @param tags - The tmi.js tags object
 * @returns an HTML string, with any pre-existing HTML escaped and emote images agged as img elements
 *
 */
const parseMessage = (
  message: string,
  emotes: TwitchMessageTagEmotes
): string => {
  let parsedMsg = escapeHTML(message);
  if (emotes) {
    parsedMsg = replaceWithEmotes(
      message,
      emotes,
      parsedMsg.length - message.length
    );
  }
  return parsedMsg;
};

/**
 * Stylized visual method of fading out and removing messages from the screen. Optionally, may swipe the message away instead of just gently fading them.
 *
 *
 * @param chatRecord - The HTMLElement which should be faded and deleted
 * @param duration - How long the fade should take to complete
 * @returns void
 *
 */
const fadeDelete = (chatRecord: HTMLElement, duration: number): void => {
  let fading = true;
  (function decrement() {
    if (!chatRecord.style.opacity) {
      chatRecord.style.opacity = (1).toString();
    }
    chatRecord.style.opacity = (
      Number.parseFloat(chatRecord.style.opacity) - 0.1
    ).toString();
    if (Number.parseFloat(chatRecord.style.opacity) < 0) {
      fading = false;
      chatRecord.remove();
    } else {
      setTimeout(() => {
        decrement();
      }, duration / 10);
    }
  })();

  if (swipe == true) {
    (function swipeaway() {
      if (fading) {
        console.log("Swiping away...");
        if (!chatRecord.style.right) chatRecord.style.right = "0";
        chatRecord.style.right = (
          Number.parseInt(chatRecord.style.right.replace("px", "")) - 10
        ).toString();
        setTimeout(() => {
          swipeaway();
        }, duration / 40);
      }
    })();
  }
};

/**
 * Set a timeout for a chat element, whereupon the chat row will be faded out and optionally swiped away
 *
 *
 *
 * @param chatRecord - The HTMLElement which should be faded out after the given time period
 * @returns void
 *
 */
const setTimeoutOnRecord = (chatRecord: HTMLElement): void => {
  if (fade < 1) return;
  setTimeout(() => {
    fadeDelete(chatRecord, 500);
  }, fade * 1000);
};

/**
 * Given a string, will escape any characters which may be dangerous when used directly as an innerHTML assignment
 *
 *
 * @param message - The tmi.js chat message to escape
 * @returns An HTML escaped version of the tmi.js message provides
 *
 */
const escapeHTML = (message: string) => {
  let lookup: { [key: string]: string } = {
    "&": "&",
    '"': '"',
    "'": "'",
    "<": "<\\",
    ">": "\\>;",
  };
  return message.replace(/[&"'<>]/g, (c) => lookup[c]);
};

/**
 * Given a tmi.js tags object and message string, will create an HTML element and append it to the chatbox
 *
 * @remarks
 * additional details
 *
 * @param tags - The tmi.js tags objects
 * @param message - The tmi.js message
 * @returns void
 *
 */
const createChatRecord = (twitchMessage: TwitchMessage) => {
  const chat_box: HTMLElement | null = document.getElementById("chat_box");
  if (null === chat_box) {
    throw new Error("Chatbox not found, can't add new chat record!");
  }
  const chatWrapper = document.createElement("div");
  chatWrapper.classList.add("chat_line_wrapper");
  const chat = document.createElement("div");
  chat.classList.add("chat");
  const chatRecord = document.createElement("div");
  chatRecord.classList.add("chat_line");
  const chatNick = document.createElement("span");
  chatNick.classList.add("nick");
  chatNick.innerText = twitchMessage.userInfo.displayName;
  chatNick.style.color = twitchMessage.userInfo.color || "";
  const chatBadges = document.createElement("span");
  chatBadges.classList.add("badges");
  const chatMessage = document.createElement("span");
  chatMessage.innerHTML = parseMessage(
    twitchMessage.message,
    twitchMessage.emotes
  );
  chatMessage.classList.add("message");

  const chatTail = document.createElement("div");
  chatTail.classList.add("tail");
  const chatTailInner = document.createElement("div");
  chatTailInner.classList.add("inner");

  createBadgeImages(chatBadges, twitchMessage.userInfo.badgeURIs);
  chatTail.appendChild(chatTailInner);
  chatWrapper.appendChild(chatRecord);
  chatRecord.appendChild(chatTail);
  chatRecord.append(chat);
  chat.appendChild(chatBadges);
  chat.appendChild(chatNick);
  chat.appendChild(chatMessage);
  chat_box.appendChild(chatWrapper);
  document.body.scrollTop = document.body.scrollHeight;
  setTimeoutOnRecord(chatWrapper);
};

/**
 * Function to setup socket.io listeners for tmi.js, which is running on the server
 *
 * @remarks
 * NOT designed for scaling. This will probably not work well with a ton of different clients trying to use the chat relay page at one time. This isn't designed for that though, it's expected the streamer will be the only one connected and using this.
 *
 * @returns void
 *
 */
const setupSockets = async (): Promise<void> => {
  const { io } = await import("socket.io-client");
  const socket: Socket = io("http://localhost");
  const client = socket.on("connect", () => {
    console.log("connected and listening for messages");
  });
  client.emit("join", { channel, fade, bot_activity });
  client.on("message", (res: TwitchMessage) => {
    createChatRecord(res);
    if (debug) {
      console.log(res);
    }
  });
  socket.on("disconnect", () => {});
};

/**
 * Setup sockets when the page loads fully!
 *
 */
if (document.readyState === "complete") {
  if (channel) {
    setupSockets();
  }
} else {
  document.addEventListener("DOMContentLoaded", function () {
    if (channel) {
      setupSockets();
    }

    // Some nice testing stuff below, uncomment if you want to verify things are working as expected
    // const message =
    //   "This is a test message, a super cool test message. A super SUPER cool test message.";
    // const tags = {
    //   badgeURIs: [
    //     {
    //       image_url_1x:
    //         "https://static-cdn.jtvnw.net/badges/v1/5527c58c-fb7d-422d-b71b-f309dcb85cc1/1",
    //       image_url_2x:
    //         "https://static-cdn.jtvnw.net/badges/v1/5527c58c-fb7d-422d-b71b-f309dcb85cc1/2",
    //       image_url_4x:
    //         "https://static-cdn.jtvnw.net/badges/v1/5527c58c-fb7d-422d-b71b-f309dcb85cc1/3",
    //       description: "Broadcaster",
    //       title: "Broadcaster",
    //       click_action: "none",
    //       click_url: "",
    //       last_updated: null,
    //     },
    //   ],
    //   username: "scriptpup",
    //   "display-name": "ScriptPup",
    //   color: "#5F9EA0",
    // };
    // createChatRecord("ScriptPup", tags, message);
  });
}
