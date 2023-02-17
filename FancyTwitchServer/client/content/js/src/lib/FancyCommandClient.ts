/** @format */

// import type { Socket } from "socket.io-client";
import { FancyBaseClient } from "./FancyClient";
import type { FancyCommand } from "../../../../../shared/obj/FancyCommandTypes";

export class FancyCommandClient extends FancyBaseClient<FancyCommand> {
  protected override commandType = "command";
}
