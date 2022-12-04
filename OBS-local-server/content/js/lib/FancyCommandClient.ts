/** @format */

import { io, Socket } from "socket.io-client";
import { FancyCommand } from "../../../server/lib/FancyCommandExecutor/FancyCommandExecutor";

/**
 * Simple typing to explain the expected structure of a next() function
 *
 */
export type Next = () => void;

/**
 * Simple typing to explain the expected structure of a FancyCommandClient use function or lambda
 *
 */
export type FancyCommandClientMiddleware<T> = (context: T, next: Next) => void;

export class FancyCommandClient {
  /**
   * _onAdd is the list of commands to run when a command-add event is recieved from the server
   */
  private _onAdd: FancyCommandClientMiddleware<FancyCommand>[] = new Array<
    FancyCommandClientMiddleware<FancyCommand>
  >();
  /**
   * _onRemove is the list of commands to run when a command-remove event is recieved from the server
   */
  private _onRemove: FancyCommandClientMiddleware<{ name: string }>[] =
    new Array<FancyCommandClientMiddleware<{ name: string }>>();

  /**
   * socket is the socket.io socket connection we'll use for command modification
   */
  private socket: Socket;

  /**
   * The FancyCommandClient class provides an easy way to reactively make changes based on adding/removing commands
   *
   *
   *
   * @param socket - Optional socket, if not provided then a new socket connection will be created on class creation
   * @returns returned value explanation
   *
   */
  constructor(socket?: Socket) {
    const opts = { forceNew: false, reconnect: true };
    if (socket) {
      this.socket = socket;
    } else {
      this.socket = io(opts);
    }

    this.setupServerListeners();
  }

  /**
   * provides a simple interface for reacting to added command events sent from the server
   *
   * @remarks
   * Essentially a wrapper for io.on('command-add',()=>{}), intended to keep the codebase cleaner
   *
   * @param middleware - The function to run when a new command is recieved from the server
   * @returns void
   *
   */
  public onAdd(
    ...middleware: FancyCommandClientMiddleware<FancyCommand>[]
  ): void {
    this._onAdd.push(...middleware);
  }

  /**
   * provides a simple interface for reacting to removed command events sent from the server
   *
   * @remarks
   * Essentially a wrapper for the io.on('command-remove',()=>{}), intended to keep the coadbase cleaner
   *
   * @param middleware - The function to run when a command is removed from the server
   * @returns void
   *
   */
  public onRemove(
    ...middleware: FancyCommandClientMiddleware<{ name: string }>[]
  ): void {
    this._onRemove.push(...middleware);
  }

  private doAdd(
    context: FancyCommand,
    middlewares: FancyCommandClientMiddleware<FancyCommand>[]
  ): void {
    if (!middlewares.length) {
      return;
    }
    const mw: FancyCommandClientMiddleware<FancyCommand> = middlewares[0];
    return mw(context, () => {
      this.doAdd(context, middlewares.slice(1));
    });
  }

  /**
   * Executes all the middlewares provided in onRemove when the server event is recieved
   *
   *
   * @returns void
   *
   */
  private doRemove(
    context: { name: string },
    middlewares: FancyCommandClientMiddleware<{ name: string }>[]
  ): void {
    if (!middlewares.length) {
      return;
    }
    const mw = middlewares[0];
    return mw(context, () => {
      this.doRemove(context, middlewares.slice(1));
    });
  }

  /**
   * Join the setup-commands room, and listen for server events once joined
   *
   * @returns void
   *
   */
  private setupServerListeners(): void {
    this.socket.once("joined-setup-commands", () => {
      this.socket.on("command-add", (cmd: FancyCommand) => {
        this.doAdd(cmd, this._onAdd);
      });

      this.socket.on("command-remove", (rmv: { name: string }) => {
        this.doRemove(rmv, this._onRemove);
      });
    });
    this.socket.emit("join-setup-commands");
  }
}
