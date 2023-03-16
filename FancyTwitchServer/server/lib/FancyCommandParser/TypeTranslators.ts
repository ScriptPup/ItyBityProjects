/** @format */

import {
  FancyCommand,
  FancyRedemption,
} from "../../../js/shared/obj/FancyCommandTypes";

export const CastFancyRedemptionToCommand = (
  fancyRedemption: FancyRedemption
): FancyCommand => {
  return {
    name: fancyRedemption.name,
    command: fancyRedemption.command,
    usableBy: 6,
  };
};
