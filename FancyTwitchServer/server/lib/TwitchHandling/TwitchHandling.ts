/** @format */

import { DataSnapshot } from "acebase";
import {
  BotAccount,
  TwitchMessage,
  TwitchUserInfo,
} from "../../../shared/obj/TwitchObjects";
import { FancyCommand, UserTypes } from "../../../shared/obj/FancyCommandTypes";
import { configDB, commandVarsDB } from "../DatabaseRef";
import { FancyCommandListener } from "../FancyCommandExecutor/FancyCommandListener";
import { FancyCommandParser } from "../FancyCommandParser/FancyCommandParser";
import { TwitchFancyPreParser } from "../FancyCommandParser/middlewares/TwitchFancyPreParse";
import { TwitchSayHelper } from "./TwitchSayHelper";
import { MainLogger } from "../logging";
import { TwitchPrivateMessage } from "@twurple/chat/lib/commands/TwitchPrivateMessage";

const logger = MainLogger.child({ file: "TwitchHandling" });

type MessageCommandFindResult = {
  cmd: FancyCommand;
  match: string;
  type: "startsWith" | "regex";
};

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

  private twitchSayClient?: TwitchSayHelper;

  constructor(FCL: FancyCommandListener) {
    logger.debug("Creating TwitchListener class");
    this.FCL = FCL;
    this.init();
  }

  /**
   * Create a twitch client connection and setup listeners and such
   * (if there's already a twitch client, then disconnect it before creating a new one)
   *
   */
  private async init() {
    logger.debug("Initializing TwitchListener");
    await this.getAndListenForAccounts();
    logger.debug("");
    if (!this.botAccount) {
      logger.error(
        { acct: this.botAccount },
        "No bot account information available, initialization halted"
      );
      return;
    }
    await this.handleTwitchMessages();
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
  public async getAndListenForAccounts(): Promise<void> {
    return configDB
      .ref("twitch-bot-acct")
      .get()
      .then(async (ss: DataSnapshot) => {
        let botAcct = ss.val();
        if (botAcct) {
          if (typeof botAcct === typeof [] && botAcct.length > 0) {
            botAcct = botAcct[0];
          }
        }
        this.botAccount = botAcct;
        logger.debug(
          { botAcct: this.botAccount },
          "Pulled bot account info from twitch-bot-acct"
        );

        this.twitchSayClient = new TwitchSayHelper(botAcct);
        return await this.twitchSayClient.isReady;
      })
      .catch((err) => {
        logger.error({ err }, "Failed to getAndListenForAccounts");
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
    if (!this.twitchSayClient) {
      logger.error(
        "The twitchSayClient is null, so we can't do anything, sorry"
      );
      return;
    }
    logger.info("Setting up listener for twitch messages");
    // this.twitchSayClient.twitchClient?.removeAllListeners("message");
    this.twitchSayClient.twitchClient?.onMessage(
      async (
        channel: string,
        user: string,
        message: string,
        msgObj: TwitchPrivateMessage
      ) => {
        const tags = msgObj.tags;
        const msgKey = `${tags
          .get("tmi-sent-ts")
          ?.toString()}:${message.substring(0, 8)}`;
        logger.debug(
          { channel, tags, message, msgKey },
          "Twitch message recieved"
        );
        // If a bot account isn't setup, then do nothing
        if (this.botAccount) {
          if (
            tags.get("username")?.toLowerCase() ===
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
        const cmdsToProc = this.findMessageCommands({ message, tags });
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
        logger.debug({ msgKey, cmdsToProc }, "Processing found commands");
        const finalMessages: string[] = await this.processMessageCommands(
          cmdsToProc,
          { message, channel, tags }
        );
        logger.debug(
          { msgKey, finalMessages: finalMessages },
          "Processed found commands"
        );
        // Before processing the commands, make sure the authentication token we're using is still valid, if not create a new client to use for writing
        // Once the commands have been processed, send the response for each message in the stack back to twitch
        finalMessages.forEach(async (msg) => {
          if (!this.twitchSayClient) return; // Shouldn't need this, given the parent has it, but typescript is too stupid to figure that out
          if (msg === "") {
            logger.debug(
              { msg },
              "Skipping message because it returned an empty string, we don't need to send that"
            );
            return;
          }
          logger.debug(
            { msgKey, msg },
            "Sending reply based on command parsing"
          );
          try {
            await this.twitchSayClient.say(channel, msg);
          } catch (err) {
            logger.error(
              { err },
              `Failed to 'say' ${msg} in ${channel} chat, reconnecting and trying again`
            );
            this.twitchSayClient.connectTwitchClient().then(() => {
              try {
                this.twitchSayClient?.say(channel, msg);
              } catch (err) {
                logger.fatal(
                  { err },
                  `Failed to 'say' ${msg} after reconnecting, something is wrong!`
                );
              }
            });
          }
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
    cmds: MessageCommandFindResult[],
    message: any
  ): Promise<string[]> {
    logger.debug({ cmds }, `Starting processMessageCommands`);
    const msgRes: Promise<string>[] = [];
    cmds.forEach((findRes: MessageCommandFindResult) => {
      let parsedCmd: Promise<string> = new Promise<string>((res) =>
        res(
          "Ooo... This is embarasing, but looks like there's something wrong with this command!"
        )
      );
      try {
        const cmd = findRes.cmd;
        message.message = message.message.replace(
          new RegExp(`${findRes.match}[ ]*`),
          ""
        );
        logger.debug(
          { command: cmd.command, name: cmd.name },
          `Processing command`
        );
        try {
          const nCmdParser: FancyCommandParser = TwitchFancyPreParser(
            new FancyCommandParser(cmd.command, commandVarsDB)
          );
          parsedCmd = nCmdParser.parse(null, message);
          logger.debug({ parsedCmd }, `Parsed command '${cmd.name}'`);
        } catch (err) {}
        // Regardless of whether the command previously existed, or was added, parse and return it now
        msgRes.push(parsedCmd);
      } catch (err) {
        logger.error({ findRes, message }, "Failed to process message command");
      }
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
  ): MessageCommandFindResult | null {
    // If the command is a regex, then treat it as such
    if (cmd.name[0] === "/" && cmd.name[-1] === "/") {
      const cmdRe: RegExp = new RegExp(cmd.name);
      const found: RegExpMatchArray | null = message.match(cmdRe);
      if (found) {
        return { cmd: cmd, match: found[0], type: "regex" };
      }
    }
    // If the command is NOT a regex, then check if the string STARTS with the command name
    if (message.startsWith(cmd.name)) {
      return { cmd, match: cmd.name, type: "startsWith" };
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
  private findMessageCommands({
    message,
    tags,
  }: {
    message: string;
    tags: any;
  }): MessageCommandFindResult[] {
    const foundCommands = new Set<MessageCommandFindResult>();
    this.FCL.commands.forEach((cmd) => {
      const actualUserLevel: UserTypes = this.getUserLevel(tags);
      if (actualUserLevel <= cmd.usableBy) {
        logger.debug(
          { usableBy: cmd.usableBy, actualUserLevel, cmd: cmd.name },
          "Not evaluating command eligibility due to incompatible user level"
        );
        return;
      }
      const useCmd: MessageCommandFindResult | null = this.getMessageCommand(
        cmd,
        message
      );
      if (useCmd) {
        foundCommands.add(useCmd);
      }
    });
    logger.debug(
      { foundCommands },
      "Finished searching FCL commands for matches"
    );
    return [...foundCommands];
  }

  /**
   * Returns the user types of a user, given its twitch tags
   *
   * @remarks
   * There may be a better way to do this
   *
   * @param tags - The twitch tags passed with the message
   * @returns The HIGHEST permissiveness level of a user
   *
   */
  private getUserLevel(tags: TwitchUserInfo): UserTypes {
    // if (tags.get("badges")?.get("broadcaster") || tags.badges?.admin) {
    //   return UserTypes.OWNER;
    // }
    // if (tags.mod) {
    //   return UserTypes.MODERATOR;
    // }
    // if (tags.badges?.vip) {
    //   return UserTypes.VIP;
    // }
    // if (tags.badges?.subscriber) {
    //   return UserTypes.SUBSCRIBER;
    // }
    // TODO: Need to figure out how to tell if someone is a follower
    // if(tags.follower?) {
    //   return UserTypes.FOLLOWER;
    // }
    // TODO: Need to figure out how to tell if someone is a regular
    // if(tags.regular){
    //   return UserTypes.REGULAR;
    // }
    return UserTypes.EVERYONE;
  }
}
