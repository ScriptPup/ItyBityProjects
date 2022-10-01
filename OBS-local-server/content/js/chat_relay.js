/** @format */

const params = new URLSearchParams(window.location.search);
const channel = params.get("channel"),
  fade = params.get("fade") || 0,
  bot_activity = params.get("bot_activity") || false;
debug = params.get("debug") || false;

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

{
  /* <img alt="Broadcaster" aria-label="Broadcaster badge" class="chat-badge" src="https://static-cdn.jtvnw.net/badges/v1/5527c58c-fb7d-422d-b71b-f309dcb85cc1/1" srcset="https://static-cdn.jtvnw.net/badges/v1/5527c58c-fb7d-422d-b71b-f309dcb85cc1/1 1x, https://static-cdn.jtvnw.net/badges/v1/5527c58c-fb7d-422d-b71b-f309dcb85cc1/2 2x, https://static-cdn.jtvnw.net/badges/v1/5527c58c-fb7d-422d-b71b-f309dcb85cc1/3 4x"></img> */
}

const fadeDelete = (chatRecord, duration) => {
  (function decrement() {
    if ((chatRecord.style.opacity -= 0.1) < 0) {
      chatRecord.remove();
    } else {
      setTimeout(() => {
        decrement();
      }, duration);
    }
  })();
};

const setTimeoutOnRecord = (chatRecord) => {
  if (fade < 1) return;
  setTimeout(() => {
    fadeDelete(chatRecord, 4 * 1000);
  }, fade * 1000);
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
  chatMessage.innerText = message;
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
