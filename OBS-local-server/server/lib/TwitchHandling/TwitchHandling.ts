/** @format */

import { DataSnapshot } from "acebase";
import { Client } from "tmi.js";
import { FancyCommand } from "../../../shared/obj/FancyCommandTypes";
import { configDB, commandVarsDB } from "../DatabaseRef";
import { FancyCommandListener } from "../FancyCommandExecutor/FancyCommandListener";
import { FancyCommandParser } from "../FancyCommandParser/FancyCommandParser";
import { TwitchFancyPreParser } from "../FancyCommandParser/middlewares/TwitchFancyPreParse";

/**
 * Listener class for commands, then parse them via the FancyCommandParser (with plugins)
 *
 *
 * @param twitchClient - The tmi.js client which we're going to subscribe to events on
 * @returns void
 *
 */
export class TwitchListener {
  /**
   * botAccount is the object containing the bot information provided by the user, if one isn't provided then this listener doesn't really do anything
   */
  private botAccount: {
    username: string;
    password: string;
    channel: string;
  } | null = null;
  /**
   * FCL is the FancyCommandListener, which must be passed through upon creation
   */
  private FCL: FancyCommandListener;

  /**
   * parsCommands is a dictionary containing the command parser for each command which we've had to parse already, cached for faster re-use
   * Currently I have no cleanup mechanism... So if a command is removed, the parser will still be in the cache. I should probably add a timeout function or something to drop items in the cache after a certain amount of time, or setup more db events to remove when it's removed from the db... But I can't be bothered rn
   */
  private parseCommands: { [key: string]: FancyCommandParser } = {};

  /**
   * twitchClient is the twitch client provided at initialization
   */
  private twitchClient: Client | null = null;

  constructor(FCL: FancyCommandListener) {
    this.FCL = FCL;
    this.getAndListenForAccounts();
  }

  /**
   * Create a twitch client connection and setup listeners and such
   * (if there's already a twitch client, then disconnect it before creating a new one)
   *
   */
  private async init() {
    if (!this.botAccount) {
      return;
    }
    if (this.twitchClient) {
      await this.twitchClient.disconnect();
    }
    this.twitchClient = new Client({
      channels: [this.botAccount.channel],
      options: { debug: process.env.NODE_ENV === "development" },
      identity: {
        username: this.botAccount.username,
        password: this.botAccount.password,
      },
    });
    this.twitchClient.connect();
    this.handleTwitchMessages();
  }

  /**
   * Load in any existing twitch bot account information.
   *
   * @remarks
   * If there isnt' currently any bot account information available, then as soon as some is added it will be used
   *
   * @returns void
   *
   */
  private getAndListenForAccounts() {
    configDB
      .ref("twitch-bot-acct")
      .get()
      .then((ss: DataSnapshot) => {
        this.botAccount = ss.val();
        configDB
          .ref("twitch-bot-acct")
          .on("child_added", (ss: DataSnapshot) => {
            this.botAccount = ss.val();
            this.init();
          });
        configDB
          .ref("twitch-bot-acct")
          .on("child_changed", (ss: DataSnapshot) => {
            this.botAccount = ss.val();
            this.init();
          });
        configDB
          .ref("twitch-bot-acct")
          .on("child_removed", (ss: DataSnapshot) => {
            this.botAccount = null;
            this.init();
          });
      });
    this.init();
  }

  private async handleTwitchMessages() {
    if (!this.twitchClient) {
      return;
    }
    this.twitchClient.on("message", async (channel, tags, message, self) => {
      // If a bot account isn't setup, then do nothing
      if (this.botAccount) {
        if (
          tags.username?.toLowerCase() !==
          this.botAccount.username.toLowerCase()
        ) {
          return;
        }
      }
      // If a bot account IS setup, then do stuff!
      const cmdsToProc = this.findMessageCommands(message);
      // If the message doesn't match any of the commands defined, do nothing
      if (cmdsToProc.length === 0) return;
      // If the message DOES match any of the commands defined, then process them
      const finalMessages: string[] = await this.processMessageCommands(
        cmdsToProc,
        message
      );
      // Once the commands have been processed, send the response for each message in the stack back to twitch
      finalMessages.forEach((msg) => {
        if (!this.twitchClient) return; // Shouldn't need this, given the parent has it, but typescript is too stupid to figure that out
        this.twitchClient.say(channel, msg);
      });
    });
  }

  /**
   * Process a message using the relevant commands
   *
   * @remarks
   * Uses the FancyCommandParser to parse commands, if the command has already been processed then it'll use the preexisting parser to avoid wasting resources spinning up every time
   *
   * @param cmds - The commands to process
   * @returns A list of messages after all command parses have been applied
   *
   */
  private async processMessageCommands(
    cmds: FancyCommand[],
    message: string
  ): Promise<string[]> {
    const msgRes: Promise<string>[] = [];
    cmds.forEach((cmd: FancyCommand) => {
      // If we already have the parser cached, use that
      if (cmd.name in this.parseCommands) {
      }
      // If we don't have the parser cached, then create it and then use it
      else {
        const nCmdParser: FancyCommandParser = TwitchFancyPreParser(
          new FancyCommandParser(cmd.command, commandVarsDB)
        );
        this.parseCommands[cmd.name] = nCmdParser;
      }
      // Regardless of whether the command previously existed, or was added, parse and return it now
      msgRes.push(this.parseCommands[cmd.name].parse(message));
    });
    return Promise.all(msgRes);
  }

  /**
   * Determine whether or not a message meets the criteria to trigger a command
   *
   * @remarks
   * based on the command "name", multiple commands might overlap in some circumstances
   *
   * @param cmd - The command to be tested
   * @param message - The message to be tested
   * @returns either null, or the command
   *
   */
  private getMessageCommand(
    cmd: FancyCommand,
    message: string
  ): FancyCommand | null {
    // If the command is a regex, then treat it as such
    if (cmd.name[0] === "/" && cmd.name[-1] === "/") {
      const cmdRe: RegExp = new RegExp(cmd.name);
      if (cmdRe.test(message)) {
        return cmd;
      }
    }
    // If the command is NOT a regex, then check if the string STARTS with the command name
    if (message.startsWith(cmd.name)) {
      return cmd;
    }
    // If the command fails all tests, return false
    return null;
  }

  /**
   * returns command(s) to trigger matching the command names stored in the FCL commands list
   *
   * @remarks
   * This has to loop evey time a twitch message comes in, so it needs to be efficient
   *
   * @param message - The twitch message which we're looking for the command patterns within
   * @returns the commands which match the twitch message. For example, if there is a command named !help configured then a twitch message which comes in as "!help i've lost my pants!" would match
   *
   */
  private findMessageCommands(message: string): FancyCommand[] {
    const foundCommands = new Array<FancyCommand>();
    this.FCL.commands.forEach((cmd) => {
      const useCmd: FancyCommand | null = this.getMessageCommand(cmd, message);
      if (useCmd) {
        foundCommands.push(useCmd);
      }
    });
    return foundCommands;
  }
}
