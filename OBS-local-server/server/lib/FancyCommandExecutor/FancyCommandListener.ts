/** @format */

import {
  FancyCommandExecutor,
  UserTypes,
  getUserType,
} from "./FancyCommandExecutor";
import { Server, Socket } from "socket.io";
import { pino } from "pino";
const logger = pino({"level": "debug"},pino.destination({"mkdir": true, "writable": true, "dest": `${__dirname}/../logs/FancyCommandListener.log`}));


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
    logger.debug(`Fancy Command Listener initializing`);
    this.IO.on("connection", (socket: Socket): void => {
      logger.debug(`New socket connection started, listening for socket messages`);
      this.listenToJoin(socket);
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
  private listenToJoin(socket: Socket): void {
    logger.debug({function: `listenToJoin`}, "Start");
    // TODO: Add some conditional logic to ONLY join the room if the client is on a page where it actually matters

    // Join setup-commands when on the /setup page
    socket.join("setup-commands");

    // Join the fire-commands when on the / page
    socket.join("fire-commands");
    logger.debug({function: `listenToJoin`}, "Listening");
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
    logger.debug({function: `listenForAdd`}, "Start");
    socket.on("command-add", async ({ name, command, usableBy }) => {
      const allowed: UserTypes = getUserType(usableBy);
      await this.FCE.addCommand({ name, command, allowed });
      this.IO.to("setup-commands").emit("command-add", {
        name,
        command,
        usableBy,
      });
    });
    logger.debug({function: `listenForAdd`}, "Listening");
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
    logger.debug({function: `listenForRemove`}, "Start");
    socket.on("command-remove", async ({ name }) => {
      await this.FCE.removeCommand(name);
      this.IO.to("setup-commands").emit("command-remove", { name });
    });
    logger.debug({function: `listenForRemove`}, "Listening");
  }
}
