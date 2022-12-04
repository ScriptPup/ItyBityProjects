"use strict";
/** @format */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FancyCommandClient = void 0;
const socket_io_client_1 = require("socket.io-client");
class FancyCommandClient {
    /**
     * The FancyCommandClient class provides an easy way to reactively make changes based on adding/removing commands
     *
     *
     *
     * @param socket - Optional socket, if not provided then a new socket connection will be created on class creation
     * @returns returned value explanation
     *
     */
    constructor(socket) {
        /**
         * _onAdd is the list of commands to run when a command-add event is recieved from the server
         */
        this._onAdd = new Array();
        /**
         * _onRemove is the list of commands to run when a command-remove event is recieved from the server
         */
        this._onRemove = new Array();
        this.commands = new Array();
        const opts = { forceNew: false, reconnect: true };
        if (socket) {
            this.socket = socket;
        }
        else {
            this.socket = (0, socket_io_client_1.io)(opts);
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
    onAdd(...middleware) {
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
    onRemove(...middleware) {
        this._onRemove.push(...middleware);
    }
    /**
     * Provide simple interface for adding a command to the server
     *
     * @remarks
     * additional details
     *
     * @param cmd - Expects ClientFancyCommand object {name: string, command: string, allowed: string}
     * @returns void
     *
     */
    addCommand(cmd) {
        this.socket.emit("command-add", cmd);
    }
    /**
     * Provide simple interface for removing a command from the server
     *
     * @remarks
     * additional details
     *
     * @param name - The name of the command to remove
     * @returns void
     *
     */
    removeCommand(name) {
        this.socket.emit("command-remove", { name });
    }
    /**
     * Provide a simple interface for renaming a command on the server
     *
     * @remarks
     * This is essentially a wrapper for removeCommand + addCommand
     * Will fail with an error if the new name already exists
     *
     * @param origName - Original name of the command
     * @param newCmd - New command object
     * @returns void
     *
     */
    renameCommand(origName, newCmd) {
        if (this.commands.find((x) => x.name === newCmd.name)) {
            throw new Error(`Sorry, can't rename ${origName} as ${newCmd.name}, because ${newCmd.name} is already defined`);
        }
        this.removeCommand(origName);
        this.addCommand(newCmd);
    }
    /**
     * Executes all the functions provided in onAdd when the server event is recieved
     *
     *
     * @returns void
     *
     */
    doAdd(context, middlewares) {
        if (!middlewares.length) {
            return;
        }
        const mw = middlewares[0];
        return mw(context, () => {
            this.doAdd(context, middlewares.slice(1));
        });
    }
    /**
     * Request all commands from the server in one list and then do something with the results
     *
     * @remarks
     * If no callback is supplied, then doAdd() is called for each command, effectively acting like command-add has been fired once per command
     *
     * @param callback - Optional callback, provided to do something with resulting list
     * @returns void
     *
     */
    cacheCommands(callback) {
        // this.socket.once("");
    }
    /**
     * Executes all the functions provided in onRemove when the server event is recieved
     *
     *
     * @returns void
     *
     */
    doRemove(context, middlewares) {
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
    setupServerListeners() {
        this.socket.once("joined-setup-commands", () => {
            this.socket.on("command-add", (cmd) => {
                this.doAdd(cmd, this._onAdd);
            });
            this.socket.on("command-remove", (rmv) => {
                this.doRemove(rmv, this._onRemove);
            });
        });
        this.socket.emit("join-setup-commands", true);
    }
}
exports.FancyCommandClient = FancyCommandClient;
