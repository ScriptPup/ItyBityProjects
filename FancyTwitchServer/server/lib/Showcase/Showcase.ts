/** @format */

import { access } from "fs";
import path from "path";
import { cwd } from "process";
import { ShowcaseItem } from "../../../shared/obj/ShowcaseTypes";
import { showcaseDB } from "../DatabaseRef";
import { MainLogger } from "../logging";

const logger = MainLogger.child({ file: "Showcase.ts" });
const artShowCasePath: string = path.join(cwd(), "artshow");

export class Showcase {
  /**
   * isReady is a simple promise property which provides an easy method of verifying
   */
  isReady: Promise<Boolean>;

  /**
   * Showcase class is provided to easily add/retrieve the most recent showcase and potentially other stuff
   *
   *
   * @returns Showcase class
   *
   */
  constructor() {
    this.isReady = this.init();
  }

  /**
   * initalize any internal components
   *
   * @remarks
   * Currently this class is over-engineered and this is unecissary. I'm designing it like this with the assumption that it'll become more complex over time as Cynder and I want to add more to it.
   *
   * @returns Promise which returns true when the class is ready for use. All method should wait for isReady to have returned before running.
   *
   */
  private async init(): Promise<Boolean> {
    return new Promise((resolve) => {
      logger.debug({ artShowCasePath }, "Showcase class initialized");
      resolve(true);
    });
  }

  /**
   * Verifies that the file for the redemption exists
   *
   *
   * @param filename - The name of the art file to be checked
   * @returns promise containing true/false of whether the art file is available/exists or not
   *
   */
  public async verifyArtShowFile(filename: string): Promise<boolean> {
    await this.isReady;
    const artShowPath = path.join(artShowCasePath, filename);
    return new Promise((resolve) => {
      access(artShowPath, (err) => {
        if (err) {
          logger.info(
            { filename, artShowPath },
            "Art does not exist within artshow folder"
          );
          resolve(false);
          return;
        }
        resolve(true);
      });
    });
  }

  /**
   * Returns a promise containing the nth redeemed art showcase
   *
   *
   *
   * @param pos - return the art showcase redeemed at this position from the most recent (0 is most recent, 1 is the last redemption, etc.)
   * @returns Promise of a showcase item
   *
   * @alpha
   */
  public async getArtShowcaseRedeem(pos: number): Promise<ShowcaseItem | null> {
    await this.isReady;
    const artWork: ShowcaseItem | null = (
      await showcaseDB.ref(`art/works[${pos}]`).get()
    ).val();
    return artWork;
  }

  /**
   * Adds showcase item to be displayed at position 0
   *
   *
   * @param art - The showcase item to add to the "top" of the list
   * @returns void
   *
   */
  public async addArtShowcaseRedeem(art: ShowcaseItem): Promise<boolean> {
    await this.isReady;
    const artExists: boolean = await this.verifyArtShowFile(
      art.redemption_name
    );
    if (!artExists) {
      logger.warn(
        { art },
        "Redemption for art showcase requested, but requested redemption not available"
      );
      return false;
    }
    await showcaseDB.ref(`art/works`).push(art);
    return true;
  }
}
