/** @format */

import { PubSubRedemptionMessageUserData } from "@twurple/pubsub/lib/messages/PubSubRedemptionMessage.external";
import {
  FancyCommand,
  FancyRedemption,
} from "../../../shared/obj/FancyCommandTypes";
import { TwitchUserInfo } from "../../../shared/obj/TwitchObjects";

export const CastFancyRedemptionToCommand = (
  fancyRedemption: FancyRedemption
): FancyCommand => {
  return {
    name: fancyRedemption.name,
    command: fancyRedemption.command,
    usableBy: 6,
  };
};
