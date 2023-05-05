/** @format */

// import { Client } from "tmi.js";
import { RefreshingAuthProvider } from "@twurple/auth";
import { ChatClient } from "@twurple/chat";
import { MainLogger } from "../logging";
import { TwitchAuthorization } from "../../../shared/obj/TwitchObjects";
import { TwitchAuthHelper } from "./TwitchAuthHelper";

const logger = MainLogger.child({ file: "TwitchSayHelper" });

export class TwitchSayHelper {
  /**
   * twitchClient is the client which is used internally to actually send data back to twitch, it will be destroyed and replaced when the bearer token expires
   */
  public twitchClient?: ChatClient;

  /**
   * botAccount is the property which contains information relevant to the bot used to communicate with twitch
   */
  public botAccount: TwitchAuthorization;
  /**
   * streamerAccount is the property which contains information relevant to the bot used to subscribe to redemptions
   */
  public streamerAccount: TwitchAuthorization;

  public twitchAuthHelper: TwitchAuthHelper;

  /**
   * The TwitchSayHelper is provided to avoid race conditions when multiple messages come in on top of eachother
   * If multiple commands have to be sent back to the twitch service while a new token is being negotated we don't want the entire thing to fail.
   * So this class can be used to avoid that by introducing a layer which will check the status of negotiaton, and if the client isn't ready it'll wait until it is to send commands
   *
   *
   */
  public isReady: Promise<void>;

  public STATUS: "READY" | "PENDING" | "ERROR" | "NOT STARTED" = "NOT STARTED";

  constructor(botAccount: TwitchAuthorization) {
    // I know this is the same as setTwitchAuthorization()...
    // However, typescript insists on having the constructor DIRECTLY set the properties which are not optional
    // Therefore the same code has to be maintained twice. I'm sorry :(
    this.twitchAuthHelper = new TwitchAuthHelper();
    this.botAccount = botAccount;
    this.isReady = this.connectTwitchClient(true);
  }
  public setTwitchAuthorization(botAccount: TwitchAuthorization): void {
    this.botAccount = botAccount;
    // Call a connection immediately upon setting the bot account, don't check if the auth token is valid
    this.isReady = this.connectTwitchClient(true);
  }

  /**
   * Destroys (if necissary) the old twitchClient and creates a new one
   *
   * @remarks
   * This function calls verifyAuth internall. While verifyAuth may ALSO be called externally, it needs to be included here so we know whether to get a new auth token, or just move on with the one we already have.
   * There are multiple possible reasons for calling this function, so it doesn't ALWAYS mean we need to immediately get a new bearer token.
   *
   * @returns void promise
   *
   */
  public async connectTwitchClient(
    skipAuthCheck: boolean = false
  ): Promise<void> {
    logger.debug(
      { skipAuthCheck },
      "Setting up a new authenticated twitch client"
    );
    return new Promise<void>(async (resolve, reject) => {
      if (this.botAccount == null) {
        logger.info(
          "No bot account information available, not attempting to connect with twitch"
        );
        return;
      }
      // NEVER allow more than one event to try and create a twitchClient at the same time...
      if (this.STATUS === "PENDING") {
        logger.debug(
          "Current SayHelper connection status is pending, canceling workflow"
        );
        return;
      }
      this.STATUS = "PENDING";
      if (
        null === this.botAccount.username ||
        null === this.botAccount.clientId ||
        null === this.botAccount.clientSecret ||
        null === this.botAccount.channel ||
        typeof this.botAccount !== typeof {}
      ) {
        logger.error(
          { acct: this.botAccount },
          "Tried to connect to twitch client, but some account information is missing"
        );
        return;
      }

      if (!this.botAccount.token) {
        logger.debug(
          {
            acct: this.botAccount,
          },
          "Bot token doesn't exist, so can't proceed!"
        );
        return;
      }
      // const tokenPass = `${this.botAccount.token.token_type} ${this.botAccount.token.access_token}`;
      const authProvider: RefreshingAuthProvider | null = await this
        .twitchAuthHelper.botAccount;
      if (!authProvider) {
        logger.debug(
          {
            acct: this.botAccount,
          },
          "Authorization provider returned null. This could be due to missing data required to create it."
        );
        return;
      }
      this.twitchClient = new ChatClient({
        authProvider,
        channels: [this.botAccount.channel],
      });

      this.twitchClient.onDisconnect((reason) => {
        logger.debug(
          { reason, connected_status: this.twitchClient?.isConnected },
          "Twitch Client Disconnected"
        );
      });
      this.twitchClient.onConnect(() => {
        logger.debug("Twitch client connected");
      });

      try {
        await this.twitchClient.connect();
        this.STATUS = "READY";
        resolve();
        logger.debug("Created and connected new authenticated twitch client");
      } catch (err) {
        reject(err);
        this.STATUS = "ERROR";
        logger.error(
          { err },
          "Failed to connect new twitch authenticated client"
        );
      }
    });
  }

  /**
   * Pretty much as "safe" passthrough for the twitchClient.say() function, verifies that the client is not in a dirty state before proceeding
   *
   * @param channel - The twitch channel which the message will be sent
   * @returns void
   *
   */
  public async say(channel: string, message: string): Promise<void> {
    new Promise<void>((resolve, reject) => {
      if (this.STATUS === "READY") {
        this.isReady = this.connectTwitchClient();
      }

      this.isReady.then(() => {
        if (!this.twitchClient) {
          logger.error(
            { channel, message, twitchClient: this.twitchClient },
            "Tried to `say`, but no twitchClient exists??"
          );
          reject("Tried to `say`, but no twitchClient exists??");
          return;
        }
        this.twitchClient
          .say(channel, message)
          .then(() => {
            resolve();
          })
          .catch((err) => {
            logger.error(
              { channel, message, twitchClient: this.twitchClient, err },
              "Tried to `say`, but got ane error from the twitchClient"
            );
            reject(err);
          });
      });
    });
  }
}
