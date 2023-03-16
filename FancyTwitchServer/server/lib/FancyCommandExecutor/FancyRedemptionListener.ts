/** @format */

import { FancyRedemption } from "../../../js/shared/obj/FancyCommandTypes";
import { FancyListener } from "./FancyListener";
// import type { Server, Socket } from "socket.io";
// import type { FancyStorage } from "./FancyStorage";

export class FancyRedemptionListener extends FancyListener<FancyRedemption> {
  protected override evtPrefix: string = "redemption";

  // TODO: Implement Twitch custom redemption creation/removals
  // constructor(
  //   IO: Server,
  //   FS: FancyStorage<FancyRedemption>,
  //   testing: boolean = false
  // ) {
  //   super(IO, FS, testing);
  // }

  // private handleTwitchCustomRedemptionIntegration() {
  //   this.IO.on("connection", (socket: Socket) => {
  //     // When redemption are added, if they're linked then we need to create them with Twitch
  //     socket.on(`${this.evtPrefix}-add`, async (command: FancyRedemption) => {
  //       if (!command.linked) return; // If the new redemption isn't supposed to be linked then we don't need to do anything at all
  //     });

  //     // When redemption are added, if they were linked then we need to delete them from Twitch
  //     socket.on(`${this.evtPrefix}-remove`, async ({ name }) => {
  //       const cmd: FancyRedemption = await this.FS.getCommand(name);
  //       if(!cmd.linked) return; // If the redemption wasn't linked then we don't need to do anything at all

  //     });
  //   });
  // }
}
