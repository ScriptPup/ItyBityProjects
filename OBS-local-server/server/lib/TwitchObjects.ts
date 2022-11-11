/** @format */

export type TwitchMessage = {
  message: string;
  channel: string;
  tags: {
    "badge-info": any;
    badges: {
      broadcaster: string;
      premium: string;
    };
    "client-nonce": string;
    color: string;
    "display-name": string;
    emotes: object;
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
};
