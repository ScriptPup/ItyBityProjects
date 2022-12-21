/** @format */

import { Next, FancyCommandParser } from "../FancyCommandParser";
import { TwitchMessage } from "../../../../shared/obj/TwitchObjects";
import { MainLogger } from "../../logging";

const logger = MainLogger.child({ file: "TwitchFancyPrepParse" });

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
  FCP: FancyCommandParser
): FancyCommandParser {
  const twitchFancyPreParse = (
    context: { val: string },
    next: Next,
    tmsg: TwitchMessage
  ): void => {
    try {
      context.val = context.val.replace(/\@channel/i, tmsg.channel);
    } catch (err) {
      logger.error({ tmsg, err }, "Failed to replace @channel");
    }
    if ("display-name" in tmsg.tags) {
      try {
        const username = tmsg.tags["display-name"] || "unknown";
        context.val = context.val.replace(/\@user/i, username);
      } catch (err) {
        logger.error({ tmsg, err }, "Failed to replace @user");
      }
    }
    try {
      context.val = context.val.replace(/\@message/i, tmsg.message);
    } catch (err) {
      logger.error({ tmsg, err }, "Failed to replace @message");
    }

    const paramPattern = /\@[0-9]+/gi;
    const paramReplacements: IterableIterator<RegExpMatchArray> =
      context.val.matchAll(paramPattern);
    const msgWords = tmsg.message.split(" ");
    let ix = 0;
    for (const [param] of paramReplacements) {
      ix++;
      if (ix === 1) {
        continue;
      }
      const paramIX = Number.parseInt(param.replace("@", ""));
      try {
        context.val = context.val.replace(param, msgWords[paramIX]);
      } catch (err) {
        logger.error({ tmsg, err }, `Failed to replace @${paramIX}`);
      }
    }
    next();
  };
  FCP.preParse(twitchFancyPreParse);
  return FCP;
}
