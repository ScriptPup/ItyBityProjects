/** @format */

import {
  Next,
  FancyCommandParser,
} from "../FancyCommandParser/FancyCommandParser";
import { TwitchMessage } from "../../../shared/obj/TwitchObjects";
import { MainLogger } from "../logging";
import { Showcase } from "./Showcase";

const logger = MainLogger.child({ file: "ImgShowcaseAssignment" });
const showcase: Showcase = new Showcase();

/**
 * ImgShowcaseAssignment middleware, given a filename, will add to the showcase assignment list
 *
 * @remarks
 * Implements <FancyMiddleware>
 *
 * @param context - Expects an object { val: string } where val is the command being executed
 * @param FCP - Expects the FancyCommandParser object which will be used
 * @param tmsg - Expects the twitch message object passed with the keys {message: string, tags: object, channel: string}
 * @returns returns the FCP, which has the new middleware added on
 *
 */
export function ArtShowcaseAssignment(
  FCP: FancyCommandParser
): FancyCommandParser {
  const artShowcasePreParse = async (
    context: { val: string },
    next: Next,
    tmsg: TwitchMessage
  ): Promise<void> => {
    if (!tmsg) {
      // This is debug instead of error, as it seems a "blank" message fires every so often.
      // This doesn't appear to be a bug, just a weird quirk of tmi.js?
      logger.debug({ tmsg }, "No data provided, cannot proceed");
      return;
    }
    if (!context.val.startsWith("~showart")) {
      logger.debug({ tmsg }, "Command not ~showart, proceeding without action");
      return;
    }

    const cmdContent: Array<string> = context.val.split(" ");
    context.val = "BREAK";

    try {
    } catch (err) {
      logger.error(
        { context, tmsg },
        "Failed to assign image showcase priority"
      );
    }
    next();
  };
  FCP.preParse(artShowcasePreParse);
  return FCP;
}
