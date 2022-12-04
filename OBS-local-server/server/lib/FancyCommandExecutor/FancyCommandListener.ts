/** @format */

import {
  FancyCommandExecutor,
  UserTypes,
  getUserType,
  FancyCommand,
} from "./FancyCommandExecutor";
import { Server, Socket } from "socket.io";
import { pino } from "pino";
import { DataSnapshotsArray } from "acebase";
const logger = pino(
  { level: "debug" },
  pino.destination({
    mkdir: true,
    writable: true,
    dest: `${__dirname}/../logs/FancyCommandListener.log`,
    append: false,
  })
);

export class FancyCommandListener {
  private IO: Server;
  /**
   * FCE is the FancyCommandExecutor used internally by the event server
   * This property is exposed for testing purposes since AceBase doesn't have thread saftey
   * It should NOT be used outsie of testing
   */
  public FCE: FancyCommandExecutor;
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
      logger.debug(
        `New socket connection started, listening for socket messages`
      );
      this.listenToJoin(socket);
      this.listenForAdd(socket);
      this.listenForRemove(socket);
      this.listenForList(socket);
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
    logger.debug({ function: `listenToJoin` }, "Start");
    // TODO: Add some conditional logic to ONLY join the room if the client is on a page where it actually matters

    // Join setup-commands when on the /setup page
    socket.on("join-setup-commands", () => {
      socket.join("setup-commands");
      socket.emit("joined-setup-commands");
    });

    // Join the fire-commands when on the / page
    socket.join("fire-commands");
    logger.debug({ function: `listenToJoin` }, "Listening");
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
    logger.debug({ function: `listenForAdd` }, "Start");
    socket.on("command-add", async ({ name, command, usableBy }) => {
      logger.debug({ function: `listenForAdd` }, "Add fired");
      const allowed: UserTypes = getUserType(usableBy);
      await this.FCE.addCommand({ name, command, allowed });
      logger.debug(
        { function: `listenForAdd`, command: { name, command, usableBy } },
        "Command added"
      );
      this.IO.to("setup-commands").emit("command-add", {
        name,
        command,
        usableBy,
      });
    });
    logger.debug({ function: `listenForAdd` }, "Listening");
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
    logger.debug({ function: `listenForRemove` }, "Start");
    socket.on("command-remove", async ({ name }) => {
      logger.debug({ function: `listenForRemove` }, "Remove fired");
      await this.FCE.removeCommand(name);
      logger.debug(
        { function: `listenForRemove`, command: { name } },
        "Command removed"
      );
      this.IO.to("setup-commands").emit("command-remove", { name });
    });
    logger.debug({ function: `listenForRemove` }, "Listening");
  }

  /**
   * Socket handler which will send an array of all currently available commands stored in the local DB
   *
   * @returns void
   *
   */
  private async listenForList(socket: Socket): Promise<void> {
    logger.debug({ function: `listenForList` }, "Start");
    socket.on("command-list", async () => {
      const cmdList: FancyCommand[] = await (
        await this.FCE.getAllCommands()
      ).getValues();
      socket.emit("command-list", cmdList);
    });
  }
}
