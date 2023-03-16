/** @format */

import { FancyBaseClient } from "./FancyClient";
import { FancyRedemption } from "../../shared/obj/FancyCommandTypes";

export class FancyRedemptionClient extends FancyBaseClient<FancyRedemption> {
  protected override commandType = "redemption";
}
