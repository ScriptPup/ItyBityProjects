/** @format */

import {
  FancyCommand,
  FancyClientItemBase,
  getUserType,
} from "../../../shared/obj/FancyCommandTypes";
import { Server, Socket } from "socket.io";
import { DataReference, DataSnapshot } from "acebase";
import { MainLogger } from "../logging";
import { FancyStorage } from "./FancyStorage";

export class FancyListener<T extends FancyClientItemBase> {
  protected evtPrefix: string = "undefined";
  private logger = MainLogger.child({ file: this.constructor.name });
  private IO: Server;
  /**
   * FS is the FancyCommandExecutor used internally by the event server
   * This property is exposed for testing purposes since AceBase doesn't have thread saftey
   * It should NOT be used outsie of testing
   */
  public FS: FancyStorage<T>;
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
  public commands: Set<FancyCommand> = new Set<FancyCommand>();

  constructor(IO: Server, FS: FancyStorage<T>, testing: boolean = false) {
    this.IO = IO;
    this.FS = FS;
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
    this.logger.debug(`Fancy Command Listener initializing`);

    this.logger.debug(`Setting up acebase DB child_added event listener`);
    this.FS.db
      .ref(this.FS.dbPath)
      .on("child_added", (cmdAdded: DataSnapshot) => {
        const cmd = cmdAdded.val();
        this.logger.debug(
          { cache: this.commands, cmd },
          "Database command has been added, syncing internal cache"
        );
        this.cache_add_command(cmd);
        this.logger.debug(
          { cache: this.commands },
          "Database command has been added, synced internal cache"
        );
      });

    this.logger.debug(`Setting up acebase DB child_remove event listener`);
    this.FS.db
      .ref(this.FS.dbPath)
      .on("child_removed", (cmdRmvd: DataSnapshot) => {
        this.logger.debug(
          { cache: this.commands },
          "Database command has been removed, syncing internal cache"
        );
        const cmd: FancyCommand = cmdRmvd.val();
        this.cache_remove_command(cmd);
        this.logger.debug(
          { cache: this.commands },
          "Database command has been removed, synced internal cache"
        );
      });

    this.logger.debug(`Setting up acebase DB child_changed event listener`);
    this.FS.db
      .ref(this.FS.dbPath)
      .on("child_changed", (cmdRmvd: DataSnapshot) => {
        const cmd: FancyCommand = cmdRmvd.val();
        this.logger.debug(
          { cache: this.commands },
          "Database command has been changed, syncing internal cache"
        );
        this.cache_add_command(cmd);
        this.logger.debug(
          { cache: this.commands },
          "Database command has been changed, syncing internal cache"
        );
      });

    this.IO.on("connection", (socket: Socket): void => {
      this.logger.debug(
        `New socket connection started, listening for socket messages`
      );
      this.listenToJoin(socket);
      this.listenForAdd(socket);
      this.listenForRemove(socket);
      this.listenForList(socket);
    });
  }

  private cache_remove_command(cmd: FancyCommand) {
    const rmvVal: FancyCommand | undefined = [...this.commands].find(
      (x) => x.name === cmd.name
    );
    this.logger.debug(
      { command: cmd, rmvVal: rmvVal },
      "Removed child from database, removing from cache"
    );
    if (rmvVal) {
      this.commands.delete(rmvVal);
    }
  }

  private cache_add_command(cmd: FancyCommand) {
    this.cache_remove_command(cmd);
    this.commands.add(cmd);
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
    this.logger.debug({ function: `listenToJoin` }, "Start");
    // TODO: Add some conditional logic to ONLY join the room if the client is on a page where it actually matters

    // Join setup-commands when on the /setup page
    socket.on("join-setup-commands", () => {
      this.logger.debug(
        { function: `listenToJoin`, firedEvent: "join-setup-commands" },
        `Joined socket ${socket.id} to setup-commands`
      );
      socket.join("setup-commands");
      socket.emit("joined-setup-commands");
    });

    // Join the fire-commands when on the / page
    socket.join("fire-commands");
    this.logger.debug({ function: `listenToJoin` }, "Listening");
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
    this.logger.debug({ function: `listenForAdd` }, "Start");
    socket.on(`${this.evtPrefix}-add`, async (command: T) => {
      this.logger.debug(
        { function: `listenForAdd`, command: command },
        "Add fired"
      );
      if (command.usableBy) {
        command.usableBy = getUserType(command.usableBy.toString());
      }
      const dataref: DataReference = await this.FS.addCommand(command);
      this.logger.debug(
        {
          function: `listenForAdd`,
          command: command,
          ref_snapshot: await (await dataref.get()).val(),
        },
        "Command added"
      );
      this.IO.to("setup-commands").emit(`${this.evtPrefix}-add`, command);
    });
    this.logger.debug({ function: `listenForAdd` }, "Listening");
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
    this.logger.debug({ function: `listenForRemove` }, "Start");
    socket.on(`${this.evtPrefix}-remove`, async ({ name }) => {
      this.logger.debug({ function: `listenForRemove` }, "Remove fired");
      await this.FS.removeCommand(name);
      this.logger.debug(
        { function: `listenForRemove`, command: { name } },
        "Command removed"
      );
      this.IO.to("setup-commands").emit(`${this.evtPrefix}-remove`, { name });
    });
    this.logger.debug({ function: `listenForRemove` }, "Listening");
  }

  /**
   * Socket handler which will send an array of all currently available commands stored in the local DB
   *
   * @returns void
   *
   */
  private async listenForList(socket: Socket): Promise<void> {
    this.logger.debug({ function: `listenForList` }, "Start");
    socket.on(`${this.evtPrefix}-list`, async () => {
      this.logger.debug(
        { function: `listenForList` },
        "Command list requested"
      );
      const cmdList: FancyCommand[] = await (
        await this.FS.getAllCommands()
      ).getValues();
      socket.emit(`${this.evtPrefix}-list`, cmdList);
    });
  }
}
