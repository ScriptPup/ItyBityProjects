/** @format */

import {
  Next,
  FancyCommandParser,
} from "../FancyCommandParser/FancyCommandParser";
import { TwitchMessage } from "../../../shared/obj/TwitchObjects";
import { MainLogger } from "../logging";
import { Showcase } from "./Showcase";
import { ShowcaseItem } from "../../../shared/obj/ShowcaseTypes";
import { debug } from "console";

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
    logger.debug(
      { cmdContent, cmdContentLength: cmdContent.length },
      "Command content from command split"
    );
    const newArtShowcaseItem: ShowcaseItem = {
      redemption_time: new Date(),
      redeemed_by: tmsg.userInfo.displayName,
      // If a paramater is specified, then use that instead of the user displayname
      redemption_name:
        (cmdContent.length < 2
          ? tmsg.userInfo.displayName.toLowerCase().replace(" ", "_")
          : cmdContent[1]) + ".png",
    };
    try {
      logger.debug("Starting assignment showcase redemption");
      const added: boolean = await showcase.addArtShowcaseRedeem(
        newArtShowcaseItem
      );
      logger.debug("Completed assignment showcase redemption");
      if (!added) {
        context.val = `REJECT:Sorry, no art for ${newArtShowcaseItem.redemption_name} exists. Your bits have been refunded.`;
        logger.debug({ commandValue: context.val }, "Art redemption rejected.");
      } else {
        logger.debug(
          { newArtShowcaseItem, added },
          "Art redemption added to first position"
        );
      }
    } catch (err) {
      logger.error(
        { context, tmsg },
        "Failed to assign image showcase priority"
      );
    }
    await next();
    logger.debug("ArtShowcaseAssignment Completed, next called");
    return;
  };
  FCP.preParse(artShowcasePreParse);
  return FCP;
}
