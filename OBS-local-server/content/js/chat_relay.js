/** @format */

const params = new URLSearchParams(window.location.search);
const channel = params.get("channel"),
  fade = params.get("fade") || 0,
  bot_activity = (params.get("bot_activity") || "false") === "true",
  debug = (params.get("debug") || "false") === "true",
  swipe = (params.get("swipe") || "true") === "true";

const createBadgeImages = (tags, parent) => {
  if (tags.hasOwnProperty("badgeURIs")) {
    for (let i = 0; i < tags.badgeURIs.length; i++) {
      const image_urls = new Array();
      let image_url;
      let image_count = 1;
      for (let [key, uri] of Object.entries(tags.badgeURIs[i])) {
        if (key.startsWith("image_url")) {
          if (!image_url) image_url = uri;

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

const replaceWithEmotes = (message, emotes, startOffset = 0) => {
  console.log("Replacing emotes");
  const emoteRoot = "https://static-cdn.jtvnw.net/emoticons/v1/{EMOTE_ID}/1.0";
  const sortedEmotes = [];
  for (let [emote, position] of Object.entries(emotes)) {
    const pos = position[0].split("-");
    const nemote = {};
    nemote["name"] = emote;
    nemote["start"] = Number.parseInt(pos[0]);
    nemote["end"] = Number.parseInt(pos[1]) + 1;
    sortedEmotes.push(nemote);
  }
  sortedEmotes.sort((a, b) => a.start - b.start);

  console.log("Emotes sorted", sortedEmotes);

  let newMessage = message;
  let offset = startOffset;
  for (let emoteRec of sortedEmotes) {
    emote = emoteRec["name"];
    start = emoteRec["start"];
    end = emoteRec["end"];
    const emoteElement = document.createElement("img");
    console.log(
      `Start & end for ${emote} ${Number.parseInt(start)}-${Number.parseInt(
        end
      )}, offset ${offset}`
    );
    let thisEmoteURI = emoteRoot.replace("{EMOTE_ID}", emote);
    emoteElement.classList.add("emote");
    emoteElement.src = thisEmoteURI;
    console.log("New image", emoteElement);
    console.log("Image html", emoteElement.outerHTML);

    let msgBegin = newMessage.substring(0, start + offset);

    let msgReplace = newMessage.substring(start + offset, end + offset);

    let msgEnd = newMessage.substring(end + offset, newMessage.length);

    console.log(`Begin message ${msgBegin}, 0-${start + offset}`);
    console.log(
      `Replace message ${msgReplace}, ${start + offset}-${end + offset}`
    );
    console.log(`End message ${msgEnd}, ${end + offset}-${newMessage.length}`);

    let replaceMsg = msgBegin + emoteElement.outerHTML + msgEnd;
    offset = replaceMsg.length - message.length + startOffset;
    newMessage = replaceMsg;
    console.log("Done with a replacement", newMessage);
  }
  // console.log(`Done with replacements, returning ${newMessage}`);
  return newMessage;
};

const parseMessage = (message, tags) => {
  let parsedMsg = escapeHTML(message);
  if (tags.emotes) {
    parsedMsg = replaceWithEmotes(
      message,
      tags.emotes,
      parsedMsg.length - message.length
    );
  }
  return parsedMsg;
};

const fadeDelete = (chatRecord, duration) => {
  let fading = true;
  (function decrement() {
    if (!chatRecord.style.opacity) {
      chatRecord.style.opacity = 1;
    }
    if ((chatRecord.style.opacity -= 0.1) < 0) {
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
        if (!chatRecord.style.right) chatRecord.style.right = 0;
        chatRecord.style.right =
          Number.parseInt(chatRecord.style.right.replace("px", "")) - 10;
        setTimeout(() => {
          swipeaway();
        }, duration / 40);
      }
    })();
  }
};

const setTimeoutOnRecord = (chatRecord) => {
  if (fade < 1) return;
  setTimeout(() => {
    fadeDelete(chatRecord, 500);
  }, fade * 1000);
};

const escapeHTML = (message) => {
  let lookup = {
    "&": "&",
    '"': '"',
    "'": "'",
    "<": "<\\",
    ">": "\\>;",
  };
  return message.replace(/[&"'<>]/g, (c) => lookup[c]);
};

const createChatRecord = (channel, tags, message, self) => {
  const chat_box = document.getElementById("chat_box");
  const chatWrapper = document.createElement("div");
  chatWrapper.classList.add("chat_line_wrapper");
  const chat = document.createElement("div");
  chat.classList.add("chat");
  const chatRecord = document.createElement("div");
  chatRecord.classList.add("chat_line");
  const chatNick = document.createElement("span");
  chatNick.classList.add("nick");
  chatNick.innerText = tags["display-name"];
  chatNick.style.color = tags.color;
  const chatBadges = document.createElement("span");
  chatBadges.classList.add("badges");
  const chatMessage = document.createElement("span");
  chatMessage.innerHTML = parseMessage(message, tags);
  chatMessage.classList.add("message");

  const chatTail = document.createElement("div");
  chatTail.classList.add("tail");
  const chatTailInner = document.createElement("div");
  chatTailInner.classList.add("inner");

  createBadgeImages(tags, chatBadges);
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

const setupSockets = () => {
  const socket = io("http://localhost:9000");
  const client = socket.on("connect", () => {});
  client.emit("join", { channel, fade, bot_activity });
  client.on("message", (res) => {
    const { channel, tags, message, self } = res;
    createChatRecord(channel, tags, message, self);
    if (debug) {
      console.log(res);
    }
  });
  socket.on("disconnect", () => {});
};
document.addEventListener("DOMContentLoaded", function () {
  if (channel) {
    setupSockets();
  }

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
