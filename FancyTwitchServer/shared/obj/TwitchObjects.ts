/** @format */

import { TwitchPrivateMessage } from "@twurple/chat/lib/commands/TwitchPrivateMessage";

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

export const getTwitchMessageObject = ({
  channel,
  message,
  msgObj,
}: {
  channel: string;
  message: string;
  msgObj: TwitchPrivateMessage;
}): TwitchMessage => {
  return {
    channel,
    message,
    userInfo: {
      displayName: msgObj.userInfo.displayName,
      color: msgObj.userInfo.color,
    },
    emotes: Object.fromEntries(msgObj.emoteOffsets),
  };
};

export type TwitchCustomChannelRewards = {
  data: Array<TwitchCustomChannelReward>;
};
export type TwitchCustomChannelReward = {
  broadcaster_id: string;
  broadcaster_login: string;
  broadcaster_name: string;
  id: string;
  title: string;
  prompt: string;
  cost: number;
  image: TwitchImage;
  default_image: TwitchImage;
  background_color: string;
  is_enabled: boolean;
  is_user_input_required: boolean;
  max_per_stream_setting: {
    is_enabled: boolean;
    max_per_stream: number;
  };
  max_per_user_per_stream_setting: {
    is_enabled: boolean;
    max_per_user_per_stream: number;
  };
  global_cooldown_setting: {
    is_enabled: boolean;
    global_cooldown_seconds: number;
  };
  is_paused: boolean;
  is_in_stock: boolean;
  should_redemptions_skip_request_queue: boolean;
  redemptions_redeemed_current_stream: number;
  cooldown_expires_at: string;
};

export type TwitchImage = {
  url_1x: string;
  url_2x: string;
  url_4x: string;
};

export type TwitchUserEntities = { data: Array<TwitchUserEntity> };
export type TwitchUserEntity = {
  id: string;
  login: string;
  display_name: string;
  type: string;
  broadcaster_type: string;
  description: string;
  profile_image_url: string;
  offline_image_url: string;
  view_count: number;
  email: string;
  created_ad: string;
};
