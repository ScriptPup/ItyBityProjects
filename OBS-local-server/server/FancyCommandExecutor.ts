/** @format */

import {
  AceBase,
  DataReference,
  DataReferencesArray,
  DataSnapshot,
  DataSnapshotsArray,
} from "acebase";

export enum UserTypes {
  STREAMER,
  MODERATOR,
  VIEWER,
  BOT,
}

export type FancyCommand = {
  name: string;
  command: string;
  allowed: UserTypes;
};

export class FancyCommandExecutor {
  public Ready: Promise<boolean>;
  private db: AceBase;

  constructor(testing: boolean = false) {
    this.db = new AceBase("commandDB", {
      sponsor: testing,
      logLevel: "error",
      info: "",
    }); // Sponsors can turn off the logo. I am not a sponsor and have no intention of using the software without it without the creator's consent; but when testing it's incredibly annoying and hides my test results... So this is a compromise :)
    this.Ready = new Promise((res, rej) => {
      this.db.ready(() => {
        res(true);
      });
    });
  }

  public flushCommands(): Promise<any> {
    return this.Ready.then(() => {
      return this.db.ref("commands").query().remove();
    });
  }

  // Save a new command to the local database
  // At the same time, add the command to local execution memory
  public addCommand(ncmd: FancyCommand): Promise<DataReference> {
    return this.Ready.then(() => {
      return this.db.ref("commands").push(ncmd);
    });
  }

  public removeCommand(key: string): Promise<DataReference> {
    return this.Ready.then(() => {
      return this.db.ref(`commands/${key}`).remove();
    });
  }

  // Pull all commands currently saved to the database
  public getAllCommands(): Promise<DataSnapshotsArray | DataReferencesArray> {
    return this.Ready.then(() => {
      return this.db.query("commands").take(1000).get();
    });
  }

  public async updateCommand(
    key: string,
    cmd: FancyCommand
  ): Promise<FancyCommand> {
    const item = this.db.ref(`commands/${key}`);
    await item.set(cmd);
    return cmd;
  }

  // Get a specific command saved to the database
  // After thinking about it more I realized this is probably unecissary since I'll in all likelyhood already be storing all of the commands in-memory
  // But... It's here if needed I guess
  public async getCommand(key: string): Promise<FancyCommand> {
    const content = this.db.ref(`commands/${key}`).get();
    return new Promise((res, rej) => {
      content.then((snapshot) => {
        res(snapshot.val());
      });
    });
  }
}
