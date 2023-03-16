/** @format */

import { FancyCommandParser } from "../../server/lib/FancyCommandParser/FancyCommandParser";
import { TwitchMessage } from "../../js/shared/obj/TwitchObjects";
import { TwitchFancyPreParser } from "../../server/lib/FancyCommandParser/middlewares/TwitchFancyPreParse";
import { expect } from "chai";
import "mocha";
import { AceBase } from "acebase";
import { createMock } from "ts-auto-mock";

describe("TwitchFancyPreParse Middleware", () => {
  let contextDB: AceBase = new AceBase("test_variables", {
    sponsor: true,
    logLevel: "error",
  });
  let twitchMessage = createMock<TwitchMessage>();
  twitchMessage.channel = "scriptpup";
  twitchMessage.message = "This is a test message";
  twitchMessage.userInfo.displayName = "xx_somejerk_xx";
  let FCP: FancyCommandParser;
  before(async () => {
    return contextDB.ready;
  });
  describe("Replace variables in string with strich message values", () => {
    before(async () => {
      FCP = TwitchFancyPreParser(new FancyCommandParser(null, contextDB));
    });
    it("Should replace @user", async () => {
      const command: string = "@user";
      const res: string = await FCP.parse(command, twitchMessage);
      expect(res).to.equal(twitchMessage.userInfo.displayName);
    });
    it("Should replace @channel", async () => {
      const command: string = "@channel";
      const res: string = await FCP.parse(command, twitchMessage);
      expect(res).to.equal(twitchMessage.channel);
    });
    it("Should replace @message", async () => {
      const command: string = "@message";
      const res: string = await FCP.parse(command, twitchMessage);
      expect(res).to.equal(twitchMessage.message);
    });

    it("Should replace @User", async () => {
      const command: string = "@User";
      const res: string = await FCP.parse(command, twitchMessage);
      expect(res).to.equal(twitchMessage.userInfo.displayName);
    });
    it("Should replace @Channel", async () => {
      const command: string = "@Channel";
      const res: string = await FCP.parse(command, twitchMessage);
      expect(res).to.equal(twitchMessage.channel);
    });
    it("Should replace @Message", async () => {
      const command: string = "@Message";
      const res: string = await FCP.parse(command, twitchMessage);
      expect(res).to.equal(twitchMessage.message);
    });

    it("Should replace all instances of @[Uu]ser", async () => {
      const command: string = "@user and @User is @user";
      const res: string = await FCP.parse(command, twitchMessage);
      expect(res).to.equal(
        "xx_somejerk_xx and xx_somejerk_xx is xx_somejerk_xx"
      );
    });

    it("Should replace all instances of @[Cc]hannel", async () => {
      const command: string = "@channel and @Channel is @channel";
      const res: string = await FCP.parse(command, twitchMessage);
      expect(res).to.equal("scriptpup and scriptpup is scriptpup");
    });

    it("Should replace all instances of @[Mm]essage", async () => {
      const command: string = "@Message and @Message is @message";
      const res: string = await FCP.parse(command, twitchMessage);
      expect(res).to.equal(
        "This is a test message and This is a test message is This is a test message"
      );
    });

    it("Should replace numbered params with the corresponding word from the mssage", async () => {
      const command: string =
        "So I see your first word is @1, second word is @2 and third word is @3";
      const res: string = await FCP.parse(command, twitchMessage);
      expect(res).to.equal(
        "So I see your first word is This, second word is is and third word is a"
      );
    });
  });
});
