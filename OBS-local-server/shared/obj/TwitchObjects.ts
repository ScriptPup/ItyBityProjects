/** @format */
import { ChatUserstate } from "tmi.js";

export type TwitchMessage = {
  message: string;
  channel: string;
  tags: TwitchMessageTags;
};

export type TwitchMessageTags = ChatUserstate;

export type TwitchMessageTagEmotes = {
  [key: string]: [];
};

export type TwitchMessageTagParsedEmotes = {
  name: string;
  start: number;
  end: number;
};
