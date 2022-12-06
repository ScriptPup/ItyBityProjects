/** @format */
/* Support command syntaxes
@username has been bonked {@username/bonk} times

*/
import { AceBase, DataReference, DataSnapshotsArray } from "acebase";

import { QueryRemoveResult } from "acebase-core/dist/types/data-reference";
import { UserTypes, FancyCommand } from "../../../shared/obj/FancyCommandTypes";

export const getUserType = (userType: string) => {
  switch (userType) {
    case "owner":
      return UserTypes.OWNER;
    case "moderator":
      return UserTypes.MODERATOR;
    case "vip":
      return UserTypes.VIP;
    case "regular":
      return UserTypes.REGULAR;
    case "subscriber":
      return UserTypes.SUBSCRIBER;
    case "follower":
      return UserTypes.FOLLOWER;
    case "everyone":
      return UserTypes.EVERYONE;
    default:
      return UserTypes.EVERYONE;
  }
};

export class FancyCommandExecutor {
  /**
   * Ready is a Promise which will evaluate to True when AceBase is initialized and ready for use
   */
  public Ready: Promise<boolean>;
  /**
   * db is the internal AceBase database which we'll be using for everything
   * This property is exposed for testing purposes since AceBase doesn't have thread saftey
   * It should NOT be used outsie of testing
   */
  public db: AceBase;

  /**
   * Construct the FancyCommandExecutor
   *
   * @remarks
   * The constructor has a Ready property which is a boolean promise, feel free to use that to know whether the class is ready to be used
   *
   * @param testing - The testing paramater should be set to True in a dev environment and False in a prod environment
   * @returns Itself, it's a constructor!
   *
   */
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

  /**
   * Save a new command to the local AceBase DB (or overwrite an existing one)
   *
   * @remarks
   * While saving the command to the database, also adds the command to the local execution memory
   *
   * @param ncmd - The new command to be added, must honor `FancyCommand` dict structure
   * @returns A promise which will evaluate to an AceBase DataReference of the resultant DB record
   *
   */
  public addCommand(ncmd: FancyCommand): Promise<DataReference> {
    return this.Ready.then(() => {
      return this.db.ref(`commands/${ncmd.name}`).set(ncmd);
    });
  }

  /**
   * Remove an existing command from the local AceBase DB
   *
   *
   * @param key - The database reference key referencing the command to delete
   * @returns A promise which will evaluate to an AceBase DataReference of the removed item (idk what the point is either so pls don't ask, I'm just returning it to match with the AceBase implementation)
   *
   */
  public removeCommand(key: string): Promise<DataReference> {
    return this.Ready.then(() => {
      return this.db.ref(`commands/${key}`).remove();
    });
  }

  /**
   * Get all of the commands currently stored locally
   *
   * @remarks
   * Limited to 1k commands, if there are more than that then we've got other problems (and this project is probably being used outside of its intended purpose)
   *
   * @returns A promise which will evaluate to a DataSnapshotsArray, which will include the properties from a FancyCommand typed dict
   *
   */
  public getAllCommands(): Promise<DataSnapshotsArray> {
    return this.Ready.then(() => {
      return this.db.query("commands").take(1000).get();
    });
  }

  /**
   * Update a specific command which was saved to the AceBase database
   *
   * @remarks
   * This method OVERWRITES the entire stored object; it doesn't just update a single piece of it.
   *
   * @param key - The database reference key to be updated
   * @param cmd - The new command to be inserted into the database, must be a FancyCommand dict object
   * @returns A promise which will evaluate to the FancyCommand which has been set on the command referenced by `key`
   *
   */
  public async updateCommand(
    key: string,
    cmd: FancyCommand
  ): Promise<FancyCommand> {
    const item = this.db.ref(`commands/${key}`);
    await item.set(cmd);
    return cmd;
  }

  /**
   * Get a specific command which was saved to the AceBase database
   *
   *
   * @param key - The database reference key to be looked up
   * @returns A promise which will evaluate to a FancyCommand
   *
   */
  public async getCommand(key: string): Promise<FancyCommand> {
    const content = this.db.ref(`commands/${key}`).get();
    return new Promise((res, rej) => {
      content.then((snapshot) => {
        res(snapshot.val());
      });
    });
  }

  /**
   * Delete ALL commands from internal AceBase database
   *
   * @remarks
   * This should probably be considered a "dangerous" function, as it doesn't take any backups or anything. Use at your own risk, fool!
   *
   * @param param1 - expected param usage
   * @returns A promise which evaluates to a dict in the structure of QueryRemoveResult[]
   *
   * @dangerous
   */
  public flushCommands(): Promise<QueryRemoveResult[]> {
    return this.Ready.then(() => {
      return this.db.ref("commands").query().remove();
    });
  }

  /**
   * Add or update a variable in the AceBase database
   *
   *
   * @param varName - The name of the variable to add, variable names MUST be unique
   * @param varVal - The value of the variable to add, can be a string or int. Nothing else supported (yet?)
   * @returns Promise which evaluates to the DataReference to the variable just added to the DB
   *
   */
  public async setVariable(
    varName: string,
    varVal: string | number
  ): Promise<DataReference> {
    return this.Ready.then(() => {
      return this.db.ref(`variables/${varName}`).set(varVal);
    });
  }

  /**
   * Increment an existing AceBase variable (numeric) by the amount specified (positive or negative)
   *
   *
   * @param varName - The name of the variable to add
   * @param incVal - The amount by which to increment the variable (positive or negative)
   * @returns The newly incremented number
   *
   */
  public async incVariable(
    varName: string,
    incVal: number
  ): Promise<DataReference> {
    return this.Ready.then(() => {
      const _var: DataReference = this.db.ref(`variables/${varName}`);
      return new Promise((res, rej) => {
        _var.get((val) => {
          if (typeof val.val() != typeof Number) {
            rej("Unable to increment non-numeric variable");
            return;
          }
          _var
            .set(val.val() + incVal)
            .then(() => {
              res(val.val() + incVal);
            })
            .catch((reason) => rej(reason));
        });
      });
    });
  }
}
