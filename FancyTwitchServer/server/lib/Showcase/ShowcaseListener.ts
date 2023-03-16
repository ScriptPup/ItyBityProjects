/** @format */

import { Server, Socket } from "socket.io";
import { ShowcaseItem } from "../../../js/shared/obj/ShowcaseTypes";
import { Showcase } from "./Showcase";
import { MainLogger } from "../logging";
import { DataSnapshot } from "acebase";

const showcase = new Showcase();
const logger = MainLogger.child({ file: "ShowcaseListener" });

export const showcaseListener = (IO: Server): Server => {
  IO.on("connection", (socket: Socket): void => {
    socket.on("join-showcase", (pos: number) => {
      socket.join("showcase");

      // When new showcase redemptions occur, send it to the subscribed client
      showcase.onShowcaseAdd(async () => {
        sendArt(pos, socket);
      });

      // Listen for client requests to get the most recent redemption data
      socket.on("show-art", async () => {
        sendArt(pos, socket);
      });

      // Listen for client requests to add showcase redemptions
      socket.on("add-art-redemption", async (artRedemption: ShowcaseItem) => {
        logger.debug({ artRedemption }, "Requested to add art redemption");
        showcase.addArtShowcaseRedeem(artRedemption);
      });

      // Listen for client requests to get available redemption files
      socket.on("get-art-redemptions-available", async () => {
        const arts: string[] | [] = await showcase.getArtShowFiles();
        socket.emit("get-art-redemptions-available", arts);
      });

      // Listen for client requests to show past redemptions
      socket.on(
        "replay-redemption-item-added",
        async ({ start, end }: { start: number; end: number }) => {
          showcase.onShowcaseAdd(async (ref: DataSnapshot) => {
            const newRedemptionItem: ShowcaseItem & { key: string } = ref.val();
            newRedemptionItem["key"] = ref.key;
            socket.emit("redemption-item-added", [newRedemptionItem]);
          });
        }
      );
    });
  });
  return IO;
};

const sendArt = async (pos: number, socket: Socket) => {
  const artRedemption: ShowcaseItem = (await showcase.getArtShowcaseRedeem(
    pos
  )) || {
    redeemed_by: "Streamer",
    redemption_name: "not_found.png",
    redemption_thanks: "",
    redemption_time: new Date(),
  };
  socket.emit(`show-art-${pos}`, artRedemption);
};
