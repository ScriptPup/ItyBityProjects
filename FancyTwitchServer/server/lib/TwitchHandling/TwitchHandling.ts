/** @format */

import { DataSnapshot } from "acebase";
import { Client } from "tmi.js";
import { BotAccount } from "../FancyConifg/FancyConfig";
import { FancyCommand } from "../../../shared/obj/FancyCommandTypes";
import { configDB, commandVarsDB } from "../DatabaseRef";
import { FancyCommandListener } from "../FancyCommandExecutor/FancyCommandListener";
import { FancyCommandParser } from "../FancyCommandParser/FancyCommandParser";
import { TwitchFancyPreParser } from "../FancyCommandParser/middlewares/TwitchFancyPreParse";
import { TwitchSayHelper } from "./TwitchSayHelper";
import { pino } from "pino";

const logger = pino(
  { level: "debug" },
  pino.destination({
    mkdir: true,
    writable: true,
    dest: `${__dirname}/../../logs/TwitchHandling.log`,
    append: false,
  })
);

/**
 * Listener class for commands, then parse them via the FancyCommandParser (with plugins)
 *
 *
 * @param twitchListenClient - The tmi.js client which we're going to subscribe to events on
 * @returns void
 *
 */
export class TwitchListener {
  /**
   * botAccount is the object containing the bot information provided by the user, if one isn't provided then this listener doesn't really do anything
   */
  private botAccount: BotAccount | null = null;
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
   * twitchListenClient is the twitch client provided at initialization which will LISTEN to commands, but will not SAY any commands
   * the LISTEN and SAY roles are split up to avoid interuptions in the service due to bearer token timeouts (although that IS very unlikely anyway)
   */
  private twitchListenClient: Client | null = null;

  private twitchSayClient?: TwitchSayHelper;

  constructor(FCL: FancyCommandListener) {
    logger.debug("Creating TwitchListener class");
    this.FCL = FCL;
    this.getAndListenForAccounts();
  }

  /**
   * Create a twitch client connection and setup listeners and such
   * (if there's already a twitch client, then disconnect it before creating a new one)
   *
   */
  private async init() {
    logger.debug("Initializing TwitchListener");
    if (!this.botAccount) {
      return;
    }
    if (this.twitchListenClient) {
      if (this.twitchListenClient.readyState() === "OPEN") {
        try {
          await this.twitchListenClient.disconnect();
        } catch (err) {
          logger.error(
            { err, twitchListenClient: this.twitchListenClient },
            "Tried to disconnect twitch client, but failed"
          );
        }
      }
    }

    logger.debug("Creating new twitch client, connection anonymously");

    this.twitchListenClient = new Client({
      channels: [this.botAccount.channel],
      options: { debug: process.env.NODE_ENV === "development" },
    });
    this.twitchListenClient
      .connect()
      .catch((err) => {
        logger.error({ err }, "Failed to connect twitch client aononymously");
      })
      .then(() => {
        logger.debug("Created and connected new twitch client anonymously");
      });
    this.twitchSayClient = new TwitchSayHelper(this.botAccount);
    await this.twitchSayClient.isReady;
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
        const botAcct = ss.val();
        this.botAccount = botAcct;
        logger.debug(
          { botAcct },
          "Pulled bot account info from twitch-bot-acct"
        );
        if (!this.twitchSayClient || !this.botAccount) {
          logger.error(
            {
              twitchSayClient: this.twitchListenClient,
              botAccount: this.botAccount,
            },
            "Either TwitchSayClient or botAccount isn't defined, so we can't setBotAccount"
          );
          return;
        }
        this.twitchSayClient.setBotAccount(this.botAccount);
      })
      .catch((err) => {
        logger.error(
          { err },
          "Failed to getAndListenForAccounts due to a database listener setup failure getting from twitch-bot-acct"
        );
      });
    configDB.ref("twitch-bot-acct").on("child_changed", (ss: DataSnapshot) => {
      const botAcct = ss.val();
      if (botAcct === this.botAccount) {
        logger.warn(
          "Child supposedly changed for twitch-bot-acct, but the account is the same so not re-initializing"
        );
        return;
      }
      logger.debug(
        { botAcct },
        "Child changed for twitch-bot-acct, reset botAccount and reinitializing"
      );
      if (!this.twitchSayClient || !this.botAccount) {
        logger.error(
          {
            twitchSayClient: this.twitchListenClient,
            botAccount: this.botAccount,
          },
          "Either TwitchSayClient or botAccount isn't defined, so we can't setBotAccount"
        );
        return;
      }
      this.twitchSayClient.setBotAccount(this.botAccount);
    });
    configDB.ref("twitch-bot-acct").on("child_removed", (ss: DataSnapshot) => {
      const botAcct = ss.val();
      if (botAcct === this.botAccount) {
        logger.warn(
          "Child supposedly removed for twitch-bot-acct, but the account is the same so not re-initializing"
        );
        return;
      }
      logger.debug(
        { botAcct },
        "Child removed for twitch-bot-acct, reset botAccount and reinitializing"
      );
      if (!this.twitchSayClient || !this.botAccount) {
        logger.error(
          {
            twitchSayClient: this.twitchListenClient,
            botAccount: this.botAccount,
          },
          "Either TwitchSayClient or botAccount isn't defined, so we can't setBotAccount"
        );
        return;
      }
      this.twitchSayClient.setBotAccount(this.botAccount);
    });
  }

  /**
   * Function to handle twitch messages as they come in, applying command logic as needed and replying
   *
   *
   *
   */
  private async handleTwitchMessages() {
    if (!this.twitchSayClient) {
      logger.error(
        "The twitchSayClient is null, so we can't do anything, sorry"
      );
      return;
    }
    if (!this.twitchListenClient) {
      logger.error(
        "The twitchListenClient is null, so we can't do anything, sorry"
      );
      return;
    }
    logger.info("Setting up listener for twitch messages");
    this.twitchListenClient.on(
      "message",
      async (channel, tags, message, self) => {
        const msgKey = `${tags["tmi-sent-ts"]?.toString()}:${message.substring(
          0,
          8
        )}`;
        logger.debug(
          { channel, tags, message, msgKey },
          "Twitch message recieved"
        );
        // If a bot account isn't setup, then do nothing
        if (this.botAccount) {
          if (
            tags.username?.toLowerCase() !==
            this.botAccount.username.toLowerCase()
          ) {
            logger.debug(
              { msgKey },
              "Twitch message discarded due to being from the bot"
            );
            return;
          }
        }
        // If a bot account IS setup, then do stuff!
        logger.debug({ msgKey }, "Twitch message being processed");
        const cmdsToProc = this.findMessageCommands(message);
        logger.debug(
          { cmdsToProc, msgKey },
          "Commands matching the message found"
        );
        // If the message doesn't match any of the commands defined, do nothing
        if (cmdsToProc.length === 0) {
          logger.debug({ msgKey }, "No matching commands found, stopping here");
          return;
        }
        // If the message DOES match any of the commands defined, then process them
        logger.debug({ msgKey }, "Processing found commands");
        const finalMessages: string[] = await this.processMessageCommands(
          cmdsToProc,
          message
        );
        logger.debug({ msgKey }, "Processed found commands");
        // Before processing the commands, make sure the authentication token we're using is still valid, if not create a new client to use for writing
        // Once the commands have been processed, send the response for each message in the stack back to twitch
        finalMessages.forEach((msg) => {
          if (!this.twitchSayClient) return; // Shouldn't need this, given the parent has it, but typescript is too stupid to figure that out
          logger.debug(
            { msgKey, msg },
            "Sending reply based on command parsing"
          );
          this.twitchSayClient.say(channel, msg);
        });
      }
    );
    logger.info("Listening for twitch messages");
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
      if (!(cmd.name in this.parseCommands)) {
        // If we don't have the parser cached, then create it and then use it
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
