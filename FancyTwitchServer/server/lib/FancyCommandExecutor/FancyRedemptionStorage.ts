/** @format */
import { MainLogger } from "../logging";
import { FancyStorage } from "./FancyStorage";
import { FancyRedemption } from "../../../js/shared/obj/FancyCommandTypes";

export class FancyRedemptionStorage extends FancyStorage<FancyRedemption> {
  public override dbPath: string = "redemptions";
}
