/** @format */

import { FancyCommandParser } from "../../server/lib/FancyCommandParser/FancyCommandParser";
import { TwitchMessage } from "../../shared/obj/TwitchObjects";
import { ArtShowcaseAssignment } from "../../server/lib/Showcase/ArtShowcaseAssignment";
import { showcaseDB } from "../../server/lib/DatabaseRef";
import { expect } from "chai";
import "mocha";
import { AceBase } from "acebase";
import { createMock } from "ts-auto-mock";
import { ShowcaseItem } from "../../shared/obj/ShowcaseTypes";
import { Showcase } from "../../server/lib/Showcase/Showcase";

describe("TwitchFancyPreParse Middleware", () => {
  let contextDB: AceBase = new AceBase("test_variables", {
    sponsor: true,
    logLevel: "error",
  });
  let FCP: FancyCommandParser;
  let showcase: Showcase = new Showcase();
  before(async () => {
    return contextDB.ready;
  });
  describe("Handle art showcase redemptions via commands", () => {
    before(async () => {
      FCP = ArtShowcaseAssignment(new FancyCommandParser(null, contextDB));
    });

    describe("Username redemptions", () => {
      afterEach(async () => {
        await showcaseDB
          .query(`art/works`)
          .take(1)
          .sort("redemption_time", false)
          .remove();
      });
      it("Should add redemption for arts which exist via username redemption", async () => {
        let twitchMessage = createMock<TwitchMessage>();
        twitchMessage.channel = "scriptpup";
        // Not filling in the message to avoid failures due to upstream replacements. In the "real" world,
        //  the message would be something like `anotheruser` or something, while the command would be something like `~showart @1`
        //  Using it that way will rely on the TwitchFancyRedemption which isn't really in the UnitTest spirit. Maybe in another test I'll combine both to test they're working together
        twitchMessage.message = "";
        twitchMessage.userInfo.displayName = "TestUser";
        const command: string = "~showart";
        const res: string = await FCP.parse(command, twitchMessage);
        const redemption: ShowcaseItem | null =
          await showcase.getArtShowcaseRedeem(0);

        expect(res).to.equal("");
        expect(redemption).to.be.not.null;
        if (redemption) {
          expect(redemption.redemption_name).to.equal("testuser.png");
          expect(redemption.redeemed_by).to.equal("TestUser");
        }
      });
    });

    describe("Paramater redemptions", () => {
      afterEach(async () => {
        await showcaseDB
          .query(`art/works`)
          .take(1)
          .sort("redemption_time", false)
          .remove();
      });
      it("Should add redemption for arts which exist via paramater redemption", async () => {
        let twitchMessage = createMock<TwitchMessage>();
        twitchMessage.channel = "scriptpup";
        // Not filling in the message to avoid failures due to upstream replacements. In the "real" world,
        //  the message would be something like `anotheruser` or something, while the command would be something like `~showart @1`
        //  Using it that way will rely on the TwitchFancyRedemption which isn't really in the UnitTest spirit.
        twitchMessage.message = "";
        twitchMessage.userInfo.displayName = "TestUser";
        const command: string = "~showart anotheruser";
        const res: string = await FCP.parse(command, twitchMessage);
        const redemption: ShowcaseItem | null =
          await showcase.getArtShowcaseRedeem(0);

        expect(res).to.equal("");
        expect(redemption).to.be.not.null;
        if (redemption) {
          expect(redemption.redemption_name).to.equal("anotheruser.png");
          expect(redemption.redeemed_by).to.equal("TestUser");
        }
      });
    });

    describe("Rejections", () => {
      it("Should return rejection for arts on redemptions that don't exist", async () => {
        let twitchMessage = createMock<TwitchMessage>();
        twitchMessage.channel = "scriptpup";
        // Not filling in the message to avoid failures due to upstream replacements. In the "real" world,
        //  the message would be something like `anotheruser` or something, while the command would be something like `~showart @1`
        //  Using it that way will rely on the TwitchFancyRedemption which isn't really in the UnitTest spirit.
        twitchMessage.message = "";
        twitchMessage.userInfo.displayName = "TestUser";
        const command: string = "~showart nonexistantuser";
        const res: string = await FCP.parse(command, twitchMessage);
        const redemption: ShowcaseItem | null =
          await showcase.getArtShowcaseRedeem(0);

        expect(res).to.equal(
          "REJECT:Sorry, no art for nonexistantuser.png exists. Your bits have been refunded."
        );
      });
    });
  });
});
