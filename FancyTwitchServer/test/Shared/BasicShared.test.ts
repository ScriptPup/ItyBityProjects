/** @format */

import {} from "../../server/lib/FancyCommandParser/FancyCommandParser";
import { expect } from "chai";
import "mocha";
import { UserTypes, getUserType } from "../../js/shared/obj/FancyCommandTypes";

describe("UserType Parsing", () => {
  describe("Convert numeric position to type", () => {
    it("Should convert 6 to UserType.EVERYONE", () => {
      expect(getUserType("6")).to.equal(UserTypes.EVERYONE);
    });
    it("Should convert 5 to UserType.FOLLOWER", () => {
      expect(getUserType("5")).to.equal(UserTypes.FOLLOWER);
    });
    it("Should convert 4 to UserType.REGULAR", () => {
      expect(getUserType("4")).to.equal(UserTypes.REGULAR);
    });
    it("Should convert 3 to UserType.SUBSCRIBER", () => {
      expect(getUserType("3")).to.equal(UserTypes.SUBSCRIBER);
    });
    it("Should convert 2 to UserType.VIP", () => {
      expect(getUserType("2")).to.equal(UserTypes.VIP);
    });
    it("Should convert 1 to UserType.MODERATOR", () => {
      expect(getUserType("1")).to.equal(UserTypes.MODERATOR);
    });
    it("Should convert 0 to UserType.OWNER", () => {
      expect(getUserType("0")).to.equal(UserTypes.OWNER);
    });
  });

  describe("Convert string representation to type", () => {
    it("Should convert everyone to UserType.EVERYONE", () => {
      expect(getUserType("everyone")).to.equal(UserTypes.EVERYONE);
    });
    it("Should convert follower to UserType.FOLLOWER", () => {
      expect(getUserType("follower")).to.equal(UserTypes.FOLLOWER);
    });
    it("Should convert subscriber to UserType.SUBSCRIBER", () => {
      expect(getUserType("subscriber")).to.equal(UserTypes.SUBSCRIBER);
    });
    it("Should convert regular to UserType.REGULAR", () => {
      expect(getUserType("regular")).to.equal(UserTypes.REGULAR);
    });
    it("Should convert vip to UserType.VIP", () => {
      expect(getUserType("vip")).to.equal(UserTypes.VIP);
    });
    it("Should convert moderator to UserType.MODERATOR", () => {
      expect(getUserType("moderator")).to.equal(UserTypes.MODERATOR);
    });
    it("Should convert owner to UserType.OWNER", () => {
      expect(getUserType("owner")).to.equal(UserTypes.OWNER);
    });
  });
});
