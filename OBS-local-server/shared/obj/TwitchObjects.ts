/** @format */

export type TwitchMessage = {
  message: string;
  channel: string;
  tags: TwitchMessageTags;
};

export type TwitchMessageTags = {
  "badge-info": any;
  badges: {
    broadcaster: string;
    premium: string;
  };
  "client-nonce": string;
  color: string;
  "display-name": string;
  emotes: TwitchMessageTagEmotes;
  "first-msg": boolean;
  flags: object;
  id: string;
  mod: boolean;
  "returning-chatter": boolean;
  "room-id": string;
  subscriber: boolean;
  "tmi-sent-ts": string;
  turbo: false;
  "user-id": string;
  "user-type": null;
  "emotes-raw": null;
  "badge-info-raw": null;
  "badges-raw": string;
  username: string;
  "message-type": string;
  badgeURIs: [object];
};

export type TwitchMessageTagEmotes = {
  [key: string]: [];
};

export type TwitchMessageTagParsedEmotes = {
  name: string;
  start: number;
  end: number;
};
