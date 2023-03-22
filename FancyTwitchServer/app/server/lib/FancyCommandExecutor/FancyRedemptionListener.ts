/** @format */

import { FancyRedemption } from "../../../shared/obj/FancyCommandTypes";
import { FancyListener } from "./FancyListener";

export class FancyRedemptionListener extends FancyListener<FancyRedemption> {
  protected override evtPrefix: string = "redemption";
}
