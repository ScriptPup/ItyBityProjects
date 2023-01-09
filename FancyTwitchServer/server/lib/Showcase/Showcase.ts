/** @format */

import { ShowcaseItem } from "../../../shared/obj/ShowcaseTypes";
import { showcaseDB } from "../DatabaseRef";

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
   * Currently this class is over-engineered and this unecissary. I'm designing it like this with the assumption that it'll become more complex over time as Cynder and I want to add more to it.
   *
   * @returns Promise which returns true when the class is ready for use. All method should wait for isReady to have returned before running.
   *
   */
  private async init(): Promise<Boolean> {
    return new Promise((resolve) => {
      resolve(true);
    });
  }

  public async getArtShowcaseRedeem(pos: number): Promise<ShowcaseItem | null> {
    const artWork: ShowcaseItem | null = (
      await showcaseDB.ref(`art/works[${pos}]`).get()
    ).val();
    return artWork;
  }

  public async addArtShowcaseRedeem(art: ShowcaseItem): Promise<void> {
    await showcaseDB.ref(`art/works`).push(art);
  }
}
