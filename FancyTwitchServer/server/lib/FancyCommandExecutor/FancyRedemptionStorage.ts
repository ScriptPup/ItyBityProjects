/** @format */
import { MainLogger } from "../logging";
import { FancyStorage } from "./FancyStorage";
import { FancyRedemption } from "../../../shared/obj/FancyCommandTypes";

export class FancyRedemptionStorage extends FancyStorage<FancyRedemption> {
  protected override dbPath: string = "redemptions";
}
