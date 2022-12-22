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
    if (!tmsg) {
      // This is debug instead of error, as it seems a "blank" message fires every so often.
      // This doesn't appear to be a bug, just a weird quirk of tmi.js?
      logger.debug({ tmsg }, "Cannot make replacements, no data provided!");
      return;
    }
    try {
      context.val = context.val.replace(/\@channel/gi, tmsg.channel);
    } catch (err) {
      logger.error({ tmsg: tmsg, err }, "Failed to replace @channel");
    }
    if (!("tags" in tmsg)) {
      logger.error(
        { tmsg },
        "Message came in with no tags, cannot make tag replacements"
      );
    } else {
      if ("display-name" in tmsg.tags) {
        try {
          const username = tmsg.tags["display-name"] || "unknown";
          context.val = context.val.replace(/\@user/gi, username);
        } catch (err) {
          logger.error({ tmsg: tmsg, err }, "Failed to replace @user");
        }
      }
    }
    try {
      context.val = context.val.replace(/\@message/gi, tmsg.message);
    } catch (err) {
      logger.error({ tmsg: tmsg, err }, "Failed to replace @message");
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
