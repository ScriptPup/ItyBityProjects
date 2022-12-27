/** @format */

export type TwitchMessage = {
  message: string;
  channel: string;
  userInfo: TwitchUserInfo;
  emotes: TwitchMessageTagEmotes;
};

export type TwitchMessageTagEmotes = { [emoteid: string]: string[] };

export type TwitchMessageTagParsedEmotes = {
  name: string;
  start: number;
  end: number;
};

export type TwitchUserInfo = {
  displayName: string;
  badgeURIs?: [string];
  color?: string;
};

export type BotAccount = {
  channel: string;
  client_id: string;
  client_secret: string;
  username: string;
  auth_code?: string;
  token?: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
    access_timestamp?: Date;
  };
};
