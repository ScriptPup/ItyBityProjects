/** @format */
/* Support command syntaxes
@username has been bonked {@username/bonk} times

*/
import { AceBase, DataReference, DataSnapshotsArray } from "acebase";
import { commandDB } from "../DatabaseRef";
import { QueryRemoveResult } from "acebase-core/dist/types/data-reference";
import { FancyClientItemBase } from "../../../shared/obj/FancyCommandTypes";

export abstract class FancyStorage<T extends FancyClientItemBase> {
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
   * ThedbPath is the reference path within which we should store objects
   */
  protected dbPath: string = "undefined";

  /**
   * Construct the FancyStorage class
   *
   * @remarks
   * The constructor has a Ready property which is a boolean promise, feel free to use that to know whether the class is ready to be used
   *
   * @returns Itself, it's a constructor!
   *
   */
  constructor() {
    this.db = commandDB;
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
   * @param ncmd - The new command to be added, must honor `T` dict structure
   * @returns A promise which will evaluate to an AceBase DataReference of the resultant DB record
   *
   */
  public addCommand(ncmd: T): Promise<DataReference> {
    return this.Ready.then(() => {
      return this.db.ref(`${this.dbPath}/${ncmd.name}`).set(ncmd);
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
      return this.db.ref(`${this.dbPath}/${key}`).remove();
    });
  }

  /**
   * Get all of the commands currently stored locally
   *
   * @remarks
   * Limited to 1k commands, if there are more than that then we've got other problems (and this project is probably being used outside of its intended purpose)
   *
   * @returns A promise which will evaluate to a DataSnapshotsArray, which will include the properties from a T typed dict
   *
   */
  public getAllCommands(): Promise<DataSnapshotsArray> {
    return this.Ready.then(() => {
      return this.db.query(`${this.dbPath}`).take(1000).get();
    });
  }

  /**
   * Update a specific command which was saved to the AceBase database
   *
   * @remarks
   * This method OVERWRITES the entire stored object; it doesn't just update a single piece of it.
   *
   * @param key - The database reference key to be updated
   * @param cmd - The new command to be inserted into the database, must be a T dict object
   * @returns A promise which will evaluate to the T which has been set on the command referenced by `key`
   *
   */
  public async updateCommand(key: string, cmd: T): Promise<T> {
    const item = this.db.ref(`${this.dbPath}/${key}`);
    await item.set(cmd);
    return cmd;
  }

  /**
   * Get a specific command which was saved to the AceBase database
   *
   *
   * @param key - The database reference key to be looked up
   * @returns A promise which will evaluate to a T
   *
   */
  public async getCommand(key: string): Promise<T> {
    const content = this.db.ref(`${this.dbPath}/${key}`).get();
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
      return this.db.ref("${this.dbPath}").query().remove();
    });
  }
}
