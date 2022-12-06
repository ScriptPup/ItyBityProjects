/** @format */

import { FancyCommandExecutor } from "../../server/lib/FancyCommandExecutor/FancyCommandExecutor";
import { FancyCommand, UserTypes } from "../../shared/obj/FancyCommandTypes";

import { expect } from "chai";
import "mocha";

describe("FancyCommandExecutor storage operations", () => {
  let addedCMDKey: string;
  let keyCount: number;
  let FCE: FancyCommandExecutor;
  it("Should be able to instantiate and wait until ready", (done) => {
    const cmdTmt = setTimeout(() => done(Error("Command timed out")), 1500);
    FCE = new FancyCommandExecutor(true);
    FCE.Ready.then((res) => {
      expect(res).to.be.true;
      clearTimeout(cmdTmt);
      done();
    }).catch((err) => {
      clearTimeout(cmdTmt);
      done(err);
    });
  });

  it('Should be able to add a "test" command', (done) => {
    const new_fancy_command: FancyCommand = {
      name: "!test",
      command: 'console.log("Test command run successfully!")',
      allowed: UserTypes.EVERYONE,
    };
    const cmdTmt = setTimeout(() => done(Error("Command timed out")), 1500);
    FCE.addCommand(new_fancy_command)
      .then((nCmd) => {
        addedCMDKey = nCmd.key;
        expect(nCmd).to.not.be.null;
        expect(nCmd).to.not.be.undefined;
        clearTimeout(cmdTmt);
        done();
      })
      .catch((err) => {
        clearTimeout(cmdTmt);
        done(err);
      });
  });

  it("Should be able to list all contents", (done) => {
    const cmdTmt = setTimeout(() => done(Error("Command timed out")), 1500);
    FCE.getAllCommands()
      .then((contents) => {
        keyCount = contents.length;
        expect(contents.length).to.greaterThan(0);
        clearTimeout(cmdTmt);
        done();
      })
      .catch((err) => {
        clearTimeout(cmdTmt);
        done(err);
      });
  });

  it("Should be able to lookup added key", (done) => {
    const cmdTmt = setTimeout(() => done(Error("Command timed out")), 1500);
    FCE.getCommand(addedCMDKey)
      .then((cmd) => {
        expect(cmd.name).to.equal("!test");
        expect(cmd.command).to.equal(
          'console.log("Test command run successfully!")'
        );
        clearTimeout(cmdTmt);
        done();
      })
      .catch((err) => {
        clearTimeout(cmdTmt);
        done(err);
      });
  });

  it("Should be able to update item by ID", (done) => {
    const new_fancy_command: FancyCommand = {
      name: "!test",
      command: 'console.log("Test command run successfully AGAIN!")',
      allowed: UserTypes.EVERYONE,
    };
    const cmdTmt = setTimeout(() => done(Error("Command timed out")), 1500);
    FCE.updateCommand(addedCMDKey, new_fancy_command).then((res) => {
      FCE.getCommand(addedCMDKey)
        .then((ncmd) => {
          expect(ncmd.command).to.equal(
            'console.log("Test command run successfully AGAIN!")'
          );
          clearTimeout(cmdTmt);
          done();
        })
        .catch((err) => {
          clearTimeout(cmdTmt);
          done(err);
        });
    });
  });

  it("Should be able to remove key by ID", (done) => {
    const cmdTmt = setTimeout(() => done(Error("Command timed out")), 1500);
    FCE.removeCommand(addedCMDKey).then(() => {
      FCE.getAllCommands()
        .then((contents) => {
          expect(contents.length).to.equal(keyCount - 1);
          clearTimeout(cmdTmt);
          done();
        })
        .catch((err) => {
          clearTimeout(cmdTmt);
          done(err);
        });
    });
  });
});
