/** @format */

import { access, readdir } from "fs/promises";
import path from "path";
import { cwd } from "process";
import { ShowcaseItem } from "../../../js/shared/obj/ShowcaseTypes";
import { showcaseDB } from "../DatabaseRef";
import { MainLogger } from "../logging";
import { DataSnapshot } from "acebase";

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
    try {
      await access(artShowPath);
      return true;
    } catch (err) {
      logger.info(
        { filename, artShowPath },
        "Art does not exist within artshow folder"
      );
      return false;
    }
  }

  /**
   * Method which may be used to return a list of all available artworks for showcase
   *
   *
   * @returns list of art file names
   *
   */
  public async getArtShowFiles(): Promise<string[] | []> {
    try {
      return await readdir(artShowCasePath);
    } catch (err) {
      logger.error(
        { artShowCasePath, err },
        "Failed to find art showcase folder"
      );
    }
    return [];
  }

  /**
   * Returns a promise containing a collection of art showcase redemptions from position start-end
   *
   *
   *
   * @param start - the start position of art showcase to return
   * @param end - the end position of art showcase to return
   * @returns Promise of an array of showcase items
   *
   * @alpha
   */
  public async getArtShowcaseRedemptions(
    start: number,
    end: number
  ): Promise<ShowcaseItem[] | []> {
    await this.isReady;
    const artWorks: ShowcaseItem[] | [] = (
      await showcaseDB
        .query(`art/works`)
        .take(end)
        .skip(start)
        .sort("redemption_time", false)
        .get()
    ).map((snap: DataSnapshot): ShowcaseItem => {
      return { key: snap.key, ...snap.val() };
    });
    return artWorks;
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
    const showcaseItems: ShowcaseItem[] | [] =
      await this.getArtShowcaseRedemptions(0, pos);
    const showcaseItem: ShowcaseItem | null =
      showcaseItems.length < 1 ? null : showcaseItems[0];
    return showcaseItem;
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
    const savedObject = await showcaseDB.ref(`art/works`).push(art);
    logger.debug(
      { art, savedObject },
      "Showcase art redemption pushed to database"
    );
    return true;
  }

  public async onShowcaseAdd(cb: showCaseAddCB) {
    showcaseDB.ref("art/works").off("child_added", cb);
    showcaseDB.ref("art/works").on("child_added", cb);
  }
}

/**
 * Added type to describe usable callbacks for onShowcaseAdd
 *
 *
 * @param ref - This is an acebase DataSnapshot which represents the added child
 *
 */
type showCaseAddCB = (ref: DataSnapshot) => Promise<void>;
