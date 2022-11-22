/** @format */

import {
  FancyCommandExecutor,
  FancyCommand,
  UserTypes,
} from "../server/FancyCommandExecutor";

import { expect } from "chai";
import "mocha";

describe("FancyCommandExector storage operations", () => {
  let addedCMDKey: string;
  let keyCount: number;
  let FCE: FancyCommandExecutor;
  it("Should be able to instantiate and wait until ready", async () => {
    FCE = new FancyCommandExecutor(true);
    expect(await FCE.Ready).to.be.true;
  });
  it('Should be able to add a "test" command', async () => {
    const new_fancy_command: FancyCommand = {
      name: "!test",
      command: 'console.log("Test command run successfully!")',
      allowed: UserTypes.VIEWER,
    };
    const nCmd = await FCE.addCommand(new_fancy_command);
    addedCMDKey = nCmd.key;
    expect(nCmd).to.not.be.null;
    expect(nCmd).to.not.be.undefined;
  });

  it("Should be able to list all contents", async () => {
    const contents = await FCE.getAllCommands();
    keyCount = contents.length;
    expect(contents.length).to.greaterThan(0);
  });

  it("Should be able to lookup added key", async () => {
    const cmd: FancyCommand = await FCE.getCommand(addedCMDKey);
    expect(cmd.name).to.equal("!test");
    expect(cmd.command).to.equal(
      'console.log("Test command run successfully!")'
    );
  });

  it("Should be able to update item by ID", async () => {
    const new_fancy_command: FancyCommand = {
      name: "!test",
      command: 'console.log("Test command run successfully AGAIN!")',
      allowed: UserTypes.VIEWER,
    };
    await FCE.updateCommand(addedCMDKey, new_fancy_command);
    const ncmd = await FCE.getCommand(addedCMDKey);
    expect(ncmd.command).to.equal(
      'console.log("Test command run successfully AGAIN!")'
    );
  });

  it("Should be able to remove key by ID", async () => {
    FCE.removeCommand(addedCMDKey);
    const contents = await FCE.getAllCommands();
    expect(contents.length).to.equal(keyCount - 1);
  });
});
