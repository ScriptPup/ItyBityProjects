/** @format */

import { FancyCommandParser } from "../server/lib/FancyCommandParser/FancyCommandParser";
import { TwitchMessage } from "../server/obj/TwitchObjects";
import { TwitchFancyPreParser } from "../server/lib/FancyCommandParser/middlewares/TwitchFancyPreParse";
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
  twitchMessage.tags["display-name"] = "xx_somejerk_xx";
  let FCP: FancyCommandParser;
  before(async () => {
    return contextDB.ready;
  });
  describe("Replace variables in string with strich message values", () => {
    before(async () => {
      FCP = TwitchFancyPreParser(
        new FancyCommandParser(null, contextDB),
        twitchMessage
      );
    });
    it("Should replace @usernames", async () => {
      const command: string = "@user";
      const res: string = await FCP.parse(command);
      expect(res).to.equal(twitchMessage.tags["display-name"]);
    });
    it("Should replace @channel", async () => {
      const command: string = "@channel";
      const res: string = await FCP.parse(command);
      expect(res).to.equal(twitchMessage.channel);
    });
    it("Should replace @message", async () => {
      const command: string = "@message";
      const res: string = await FCP.parse(command);
      expect(res).to.equal(twitchMessage.message);
    });

    it("Should replace @Usernames", async () => {
      const command: string = "@User";
      const res: string = await FCP.parse(command);
      expect(res).to.equal(twitchMessage.tags["display-name"]);
    });
    it("Should replace @Channel", async () => {
      const command: string = "@Channel";
      const res: string = await FCP.parse(command);
      expect(res).to.equal(twitchMessage.channel);
    });
    it("Should replace @Message", async () => {
      const command: string = "@Message";
      const res: string = await FCP.parse(command);
      expect(res).to.equal(twitchMessage.message);
    });
  });
});
