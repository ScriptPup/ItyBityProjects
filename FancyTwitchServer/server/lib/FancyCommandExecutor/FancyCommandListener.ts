/** @format */

import { FancyCommand } from "../../../js/shared/obj/FancyCommandTypes";
import { FancyListener } from "./FancyListener";

export class FancyCommandListener extends FancyListener<FancyCommand> {
  protected override evtPrefix: string = "command";
}
