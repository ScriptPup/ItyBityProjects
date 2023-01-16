/** @format */

import { Server, Socket } from "socket.io";
import { ShowcaseItem } from "../../../shared/obj/ShowcaseTypes";
import { Showcase } from "./Showcase";

const showcase = new Showcase();

export const showcaseListener = (IO: Server): Server => {
  IO.on("connection", (socket: Socket): void => {
    socket.on("join-showcase", () => {
      socket.join("showcase");
      socket.on("show-art", async (pos: number) => {
        const artRedemption: ShowcaseItem =
          (await showcase.getArtShowcaseRedeem(pos)) || {
            redeemed_by: "Streamer",
            redemption_name: "not_found.png",
            redemption_thanks: "",
            redemption_time: new Date(),
          };
        socket.emit("show-art", artRedemption);
      });
    });
  });
  return IO;
};
