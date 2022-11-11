/** @format */

import {
  VarBlock,
  Next,
  FancyCommandParser,
  VarBlockType,
} from "./FancyCommandParser";
import { TwitchMessage } from "./TwitchObjects";

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
  const twitchFancyPreParse = (context: VarBlock, next: Next): void => {
    context.name = context.name.replace("@channel", tmsg.channel);
    context.name = context.name.replace("@user", tmsg.channel);

    if (context.datatype === VarBlockType.STRING) {
      context.value = context.value
        .toString()
        .replace("@channel", tmsg.channel);
      context.value = context.name.replace("@user", tmsg.tags["display-name"]);
      context.value = context.name.replace("@message", tmsg.message);
    }
    next();
  };
  FCP.use(twitchFancyPreParse);
  return FCP;
}
