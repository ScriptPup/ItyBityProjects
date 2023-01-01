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

    if (tmsg.userInfo.displayName) {
      try {
        const username = tmsg.userInfo.displayName || "unknown";
        context.val = context.val.replace(/\@user/gi, username);
      } catch (err) {
        logger.error({ tmsg: tmsg, err }, "Failed to replace @user");
      }
    } else {
      logger.error({ tmsg }, "Failed to replace @user");
    }

    try {
      context.val = context.val.replace(/\@message/gi, tmsg.message);
    } catch (err) {
      logger.error({ tmsg: tmsg, err }, "Failed to replace @message");
    }

    const paramPattern = /(?<pos_param>\@[0-9]+)/dgim;
    const paramReplacements: IterableIterator<RegExpMatchArray> =
      context.val.matchAll(paramPattern);
    const msgWords = tmsg.message.split(" ");
    for (const paramMatch of paramReplacements) {
      logger.debug({ paramMatch }, `Replacing positional param`);
      const param: string | undefined = paramMatch.groups?.pos_param;
      if (!param) {
        continue;
      }
      const paramIX = Number.parseInt(param.replace("@", ""));
      try {
        context.val = context.val.replace(param, msgWords[paramIX - 1]);
      } catch (err) {
        logger.error({ tmsg, err }, `Failed to replace @${paramIX - 1}`);
      }
    }
    next();
  };
  FCP.preParse(twitchFancyPreParse);
  return FCP;
}
