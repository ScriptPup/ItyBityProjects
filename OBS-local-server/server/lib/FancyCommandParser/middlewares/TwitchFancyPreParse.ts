/** @format */

import { Next, FancyCommandParser } from "../FancyCommandParser";
import { TwitchMessage } from "../../../../shared/obj/TwitchObjects";

/**
 * FancyCommandParser middleware which will replace some variables with data from a twitch message
 *
 * @remarks
 * Implements <FancyMiddleware>
 *
 * @param FCP - Expects the FancyCommandParser object which will be used
 * @param tmsg - Expects the twitch message object passed with the keys {message: string, tags: object, channel: string}
 * @returns returns the FCP, which has the new middleware added on
 *
 */
export function TwitchFancyPreParser(
  FCP: FancyCommandParser,
  tmsg: TwitchMessage
): FancyCommandParser {
  const twitchFancyPreParse = (context: { val: string }, next: Next): void => {
    context.val = context.val.replace(/\@channel/i, tmsg.channel);
    context.val = context.val.replace(/\@user/i, tmsg.tags["display-name"]);
    context.val = context.val.replace(/\@message/i, tmsg.message);
    next();
  };
  FCP.preParse(twitchFancyPreParse);
  return FCP;
}
