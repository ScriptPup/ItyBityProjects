/** @format */

import { Socket } from "socket.io-client";
import type { ShowcaseItem } from "../../../../../shared/obj/ShowcaseTypes";

let $: JQueryStatic;

export class ShowcaseClient {
  /**
   * socket is the socket.io socket connection we'll use for command modification
   */
  public socket: Socket | undefined;

  /**
   * isReady is a promise which may be used to determine whether the class' async setup functions have been completed
   */
  public isReady: Promise<void>;

  /**
   * showcaseContainer is the HTMLElement which contains the art showcase image and other info
   */
  private showcaseContainer: HTMLElement;

  /**
   * showcasePos is showcase position which this client is responsible for monitoring
   */
  private showcasePos: Number;

  constructor(
    showcaseContainer: HTMLElement,
    showcasePos: Number = 0,
    socket?: Socket
  ) {
    this.showcaseContainer = showcaseContainer;
    this.showcasePos = showcasePos;
    this.isReady = this.init(socket);
  }

  // ************************ \\
  // BEGIN - PUBLIC methods
  // ************************ \\
  public getArtShowCase() {
    if (!this.socket) {
      throw "Socket not available, cannot request art showcase";
    }
    this.socket.emit("show-art", this.showcasePos);
  }

  // ************************ \\
  // END - PUBLIC methods
  // ************************ \\

  // ************************ \\
  // BEGIN - PRIVATE methods
  // ************************ \\
  /**
   * Initialize the class, setup all listeners, etc
   *
   * @param socket? - Optional paramater to pass an existing IO instead of creating a new one
   * @returns void
   *
   */
  private async init(socket?: Socket): Promise<void> {
    $ = (await import("jquery")).default;
    const opts = { forceNew: false, reconnect: true };
    if (socket) {
      this.socket = socket;
    } else {
      const io = (await import("socket.io-client")).default;
      this.socket = io(opts);
    }
    await this.join();
    await this.listenForShowcase();
  }

  /**
   * Join the socket.io room dedicated to showcase
   *
   *
   * @returns void
   *
   */
  private async join(): Promise<void> {
    await this.isReady;
    if (!this.socket) {
      throw "Socket not available, cannot join showcase room";
    }
    this.socket.emit("join-showcase", this.showcasePos);
  }

  /**
   * Sets up listeners for showcase changes
   *
   * @returns void
   */
  private async listenForShowcase(): Promise<void> {
    await this.isReady;
    if (!this.socket) {
      throw "Socket not available, cannot listen for showcase";
    }
    this.socket.on(`show-art-${this.showcasePos}`, (showcase: ShowcaseItem) => {
      // Change the background-image for the element dedicated to containing the image
      const showcaseURL = `artshow/${showcase.redemption_name}`;
      let showcaseMsg = `Thanks to ${showcase.redeemed_by}!`;
      $(this.showcaseContainer)
        .find("#img")
        .css("backgraound-image", `url('${showcaseURL}')`);
      if (showcase.redemption_thanks) {
        showcaseMsg = showcase.redemption_thanks;
      }
      $(this.showcaseContainer).find("#label").text(showcaseMsg);
    });
  }

  // ************************ \\
  // END - PRIVATE methods
  // ************************ \\
}
