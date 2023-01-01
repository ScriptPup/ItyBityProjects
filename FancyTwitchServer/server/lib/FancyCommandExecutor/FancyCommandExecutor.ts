/** @format */
/* Support command syntaxes
@username has been bonked {@username/bonk} times

*/
import { DataReference } from "acebase";
import { FancyCommand } from "../../../shared/obj/FancyCommandTypes";
import { FancyStorage } from "./FancyStorage";

export class FancyCommandExecutor extends FancyStorage<FancyCommand> {
  protected override dbPath: string = "commands";

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
