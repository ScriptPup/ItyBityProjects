/** @format */

import { BasicPubSubClient } from "@twurple/pubsub";
import { PubSubMessageData } from "@twurple/pubsub/lib/messages/PubSubMessage";
import { StaticAuthProvider } from "@twurple/auth";
import { TwitchSayHelper } from "./TwitchSayHelper";
import { got } from "got-cjs";
import { MainLogger } from "../logging";
import { FancyRedemptionListener } from "../FancyCommandExecutor/FancyRedemptionListener";
import { FancyRedemption } from "../../../shared/obj/FancyCommandTypes";
import {
  PubSubRedemptionMessageData,
  PubSubRedemptionMessageRedemptionData,
} from "@twurple/pubsub/lib/messages/PubSubRedemptionMessage.external";
import { FancyCommandParser } from "../FancyCommandParser/FancyCommandParser";
import { commandVarsDB } from "../DatabaseRef";
import { TwitchFancyPreParser } from "../FancyCommandParser/middlewares/TwitchFancyPreParse";
import { TwitchMessage } from "../../../shared/obj/TwitchObjects";

const logger = MainLogger.child({ file: "TwitchRedemptionHelper" });

type MessageRedemptionFindResult = {
  cmd: FancyRedemption;
  match: string;
  type: "startsWith" | "regex";
};

/**
 * Helper function which leverages the auth method already available from the TwitchSayHelper
 *
 * @remarks
 * This function uses PubSub and EventSub
 *
 * @param TSH - An instance of a TwitshSayHelper
 * @returns void
 *
 */
export class TwitchRedemptionHelper {
  private TSH: TwitchSayHelper;
  private FRL: FancyRedemptionListener;

  constructor(TSH: TwitchSayHelper, FRL: FancyRedemptionListener) {
    this.TSH = TSH;
    this.FRL = FRL;
  }

  public async init(): Promise<void> {
    logger.debug(
      "Requested redemption helper setup, waiting until TwitchSayHelper is ready"
    );
    await this.TSH.isReady;
    logger.debug("Starting redemption helper setup");
    if (!this.TSH.botAccount.token) {
      logger.error(
        "Cannot setup redemptions due to botAccount access token not existing"
      );
      return;
    }
    const pubSub: BasicPubSubClient = new BasicPubSubClient();
    const userId: string = await this.getChannelUserId(this.TSH);

    const authProvider: StaticAuthProvider = new StaticAuthProvider(
      this.TSH.botAccount.client_id,
      this.TSH.botAccount.token.access_token,
      ["channel:read:redemptions"]
    );
    const redemption_topic: string = `channel-points-channel-v1.${userId}`;
    logger.debug({ redemption_topic }, "Setting up redemption lisenter");
    pubSub.listen(redemption_topic, authProvider, "channel:read:redemptions");
    pubSub.onPong(() => {
      logger.debug("Recieved pong message from pubsub client");
    });
    pubSub.onMessage(async (topic: string, message: PubSubMessageData) => {
      logger.debug({ topic, message }, "Recieved pubsub message");
      const msgKey: string = `${new Date().toISOString()}:${redemption_topic}`;
      const msg: PubSubRedemptionMessageData =
        message as PubSubRedemptionMessageData;
      const redemptionCmds: MessageRedemptionFindResult[] =
        this.findRedemptionCommands(msg.data.redemption.reward.title);
      logger.debug(
        { msgKey, redemptionCmds },
        "Commands matching the redemption found"
      );
      // If the redemption doesn't match any of the commands defined, do nothing
      if (redemptionCmds.length === 0) {
        logger.debug({ msgKey }, "No matching commands found, stopping here");
        return;
      }
      // If the redemption DOES match any of the commands defined, then process them
      logger.debug({ msgKey, redemptionCmds }, "Processing found commands");
      const finalMessages: string[] = await this.processRedemptionCommands(
        redemptionCmds,
        msg
      );
      // Before processing the commands, make sure the authentication token we're using is still valid, if not create a new client to use for writing
      // Once the commands have been processed, send the response for each message in the stack back to twitch
      finalMessages.forEach(async (msg) => {
        if (!this.TSH.twitchClient) return; // Shouldn't need this, given the parent has it, but typescript is too stupid to figure that out
        if (msg === "") {
          logger.debug(
            { msg },
            "Skipping message because it returned an empty string, we don't need to send that"
          );
          return;
        }
        logger.debug({ msgKey, msg }, "Sending reply based on command parsing");
        try {
          await this.TSH.twitchClient.say(this.TSH.botAccount.channel, msg);
        } catch (err) {
          logger.error(
            { err },
            `Failed to 'say' ${msg} in ${this.TSH.botAccount.channel} chat, reconnecting and trying again`
          );
          this.TSH.connectTwitchClient().then(() => {
            try {
              this.TSH.twitchClient?.say(this.TSH.botAccount.channel, msg);
            } catch (err) {
              logger.fatal(
                { err },
                `Failed to 'say' ${msg} after reconnecting, something is wrong!`
              );
            }
          });
        }
      });
    });
    pubSub.onConnect(() => {
      logger.debug("Pubsub connected");
    });
    try {
      await pubSub.connect();
    } catch (err) {
      logger.error({ err }, "Failed to connect pubSub");
    }
    logger.debug("Setup redemption subscriptions and connected");
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
  private async processRedemptionCommands(
    cmds: MessageRedemptionFindResult[],
    message: PubSubRedemptionMessageData
  ): Promise<string[]> {
    logger.debug({ cmds }, `Starting processMessageCommands`);
    const msgRes: Promise<string>[] = [];
    cmds.forEach((findRes: MessageRedemptionFindResult) => {
      let parsedCmd: Promise<string> = new Promise<string>((res) =>
        res(
          "Ooo... This is embarasing, but looks like there's something wrong with this command!"
        )
      );
      try {
        const cmd: FancyRedemption = findRes.cmd;
        logger.debug(
          { command: cmd.command, name: cmd.name },
          `Processing command`
        );
        try {
          const nCmdParser: FancyCommandParser = TwitchFancyPreParser(
            new FancyCommandParser(cmd.command, commandVarsDB)
          );
          const tmsg: TwitchMessage = {
            message: message.data.redemption.user_input || "",
            channel: this.TSH.botAccount.channel,
            userInfo: {
              displayName: message.data.redemption.user.display_name,
            },
            emotes: {},
          };
          parsedCmd = nCmdParser.parse(null, tmsg);
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
   * returns command(s) to trigger matching the redemption names stored in the FRL commands list
   *
   * @remarks
   * This has to loop evey time a twitch message comes in, so it needs to be efficient
   *
   * @param message - The twitch message which we're looking for the command patterns within
   * @returns the commands which match the twitch message. For example, if there is a command named !help configured then a twitch message which comes in as "!help i've lost my pants!" would match
   *
   */
  private findRedemptionCommands(
    redemption: string
  ): MessageRedemptionFindResult[] {
    const foundCommands = new Set<MessageRedemptionFindResult>();
    this.FRL.commands.forEach((cmd) => {
      logger.debug({ cmd, redemption }, "Checking for command match");
      const useCmd: MessageRedemptionFindResult | null =
        this.getRedemptionCommand(cmd, redemption);
      if (useCmd) {
        foundCommands.add(useCmd);
      }
    });
    logger.debug(
      { foundCommands },
      "Finished searching FRL commands for matches"
    );
    return [...foundCommands];
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

  private getRedemptionCommand(
    cmd: FancyRedemption,
    message: string
  ): MessageRedemptionFindResult | null {
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

  private parseRedemption(
    message: PubSubMessageData & { type?: string; "message-type"?: string }
  ) {
    const type: string = message.type || message["message-type"] || "unknown";
    switch (type) {
      case "":
        break;
      default:
        logger.debug(
          { type, message },
          "Redemption landed in the default bucket, we weren't able to parse a type."
        );
        return;
    }
  }

  /**
   * Gets the user/channel ID from twitch representing whatever channel is provided by the user
   *
   *
   * @param TSH - The TwitchSayHelper, just pass it through
   * @returns a promise containing the userID string (when resolved)
   *
   */
  private getChannelUserId(TSH: TwitchSayHelper): Promise<string> {
    if (!TSH.botAccount.token?.access_token) {
      throw "No access token set, cannot retrieve user channel ID";
    }
    const options = {
      headers: {
        Authorization: `Bearer ${TSH.botAccount.token.access_token}`,
        "Client-Id": TSH.botAccount.client_id,
      },
    };
    return new Promise((resolve, reject) => {
      got
        .get(
          `https://api.twitch.tv/helix/users?login=${TSH.botAccount.channel}`,
          options
        )
        .json()
        .then((json: any) => {
          try {
            const channelUserId: string = json["data"][0]["id"];
            if (!channelUserId) {
              logger.error({
                channelUserId: channelUserId,
                json,
                err: "Response JSON doesn't contain an Id",
              });
              reject("Response JSON doesn't contain an Id");
              return;
            }
            resolve(channelUserId);
            return;
          } catch (err) {
            logger.error({ json, err: "Response JSON doesn't contain an Id" });
            reject("Response JSON doesn't contain an Id");
            return;
          }
        });
    });
  }
}
