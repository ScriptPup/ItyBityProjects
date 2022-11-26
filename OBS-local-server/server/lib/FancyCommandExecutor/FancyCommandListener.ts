/** @format */

import {
  FancyCommandExecutor,
  UserTypes,
  getUserType,
} from "./FancyCommandExecutor";
import { Server, Socket } from "socket.io";

export class FancyCommandListener {
  private IO: Server;
  private FCE: FancyCommandExecutor;
  /**
   * FancyCommandListener is a IO server middleware. It will return the IO server after attaching its listeners.
   *
   * @remarks
   *
   *
   * @param IO - expects an IO server
   * @returns returns the FancyCommandListener class instance
   *
   */
  constructor(IO: Server, testing: boolean = false) {
    this.IO = IO;
    this.FCE = new FancyCommandExecutor(testing);
    this.init();
  }

  /**
   * Initializes all listeners for the command server
   *
   *
   * @returns void
   *
   */
  public init() {
    this.IO.on("Connection", (socket: Socket): void => {
      this.listToJoin(socket);
      this.listenForAdd(socket);
      this.listenForRemove(socket);
    });
  }

  /**
   * Join whichever rooms make sense given the context of the client
   *
   * @remarks
   * Context is calculated based on the URL path; so any logic changes need to be manually altered directly in this function
   *
   * @param socket - The IO.socket connection to the client
   * @returns void
   *
   */
  private listToJoin(socket: Socket): void {
    // TODO: Add some conditional logic to ONLY join the room if the client is on a page where it actually matters

    // Join setup-commands when on the /setup page
    socket.join("setup-commands");

    // Join the fire-commands when on the / page
    socket.join("fire-commands");
  }

  /**
   * Socket handler which will create a new command given a name and command
   *
   * @remarks
   * Will replace an existing command if there's one of the same name
   *
   * @param socket - the IO socket to listen to
   * @returns void
   *
   * @alpha
   */
  private async listenForAdd(socket: Socket): Promise<void> {
    socket.on("command-add", async ({ name, command, usableBy }) => {
      const allowed: UserTypes = getUserType(usableBy);
      await this.FCE.addCommand({ name, command, allowed });
      this.IO.to("setup-commands").emit("command-add", {
        name,
        command,
        usableBy,
      });
    });
  }

  /**
   * Socket handler which will remove a command given a name
   *
   *
   * @param name - expected to be the name of a command
   * @returns void
   *
   */
  private async listenForRemove(socket: Socket): Promise<void> {
    socket.on("command-remove", async ({ name }) => {
      await this.FCE.removeCommand(name);
      this.IO.to("setup-commands").emit("command-remove", { name });
    });
  }
}
