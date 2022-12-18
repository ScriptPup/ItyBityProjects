/** @format */

import { Client } from "tmi.js";
import { BotAccount } from "../FancyConifg/FancyConfig";
import { post } from "request";
import { MainLogger } from "../logging";

const logger = MainLogger.child({ file: "TwitchSayHelper" });

export class TwitchSayHelper {
  /**
   * twitchClient is the client which is used internally to actually send data back to twitch, it will be destroyed and replaced when the bearer token expires
   */
  private twitchClient?: Client;

  /**
   * botAccount is the property which contains information relevant to the bot used to communicate with twitch
   */
  private botAccount: BotAccount;
  /**
   * The TwitchSayHelper is provided to avoid race conditions when multiple messages come in on top of eachother
   * If multiple commands have to be sent back to the twitch service while a new token is being negotated we don't want the entire thing to fail.
   * So this class can be used to avoid that by introducing a layer which will check the status of negotiaton, and if the client isn't ready it'll wait until it is to send commands
   *
   *
   */
  public isReady: Promise<void>;

  private STATUS: "READY" | "PENDING" | "NOT STARTED" = "PENDING";

  constructor(botAccount: BotAccount) {
    // I know this is the same as setBotAccount()...
    // However, typescript insists on having the constructor DIRECTLY set the properties which are not optional
    // Therefore the same code has to be maintained twice. I'm sorry :(
    this.botAccount = botAccount;
    this.isReady = this.connectTwitchClient(true);
  }
  public setBotAccount(botAccount: BotAccount): void {
    this.botAccount = botAccount;
    // Call a connection immediately upon setting the bot account, don't check if the auth token is valid
    this.isReady = this.connectTwitchClient(true);
  }

  /**
   * Queries twitch dev and gets a bearer token to use, automatically requests a new token a few seconds before expiration
   * The resultant token is saved to the botAccount.token property
   *
   */
  private async getOAuthToken(): Promise<void> {
    if (!this.botAccount) {
      logger.error(
        { acct: this.botAccount },
        "Could not request OAuthToken, due to this.botAccount not being set"
      );
      throw new Error(
        "Could not request OAuthToken, due to this.botAccount not being set"
      );
    }

    const options = {
      url: "https://id.twitch.tv/oauth2/token",
      form: {
        client_id: this.botAccount.username,
        client_secret: this.botAccount.password,
        grant_type: "client_credentials",
      },
    };

    return new Promise((resolve, reject) => {
      post(options, (err, res, body) => {
        const requestedDTM: Date = new Date();
        if (err) {
          logger.error({ err, res, body }, "Failed to get an OAuthToken");
          reject("Failed to get an OAuthToken");
        }
        if (!this.botAccount) {
          logger.error(
            "Bot account somehow isn't set after recieving OAuth response from server"
          );
          reject();
          return;
        }
        const bodyJSON:
          | {
              access_token: string;
              expires_in: number;
              token_type: string;
              access_timestamp?: Date;
            }
          | { status: string; message: string } = JSON.parse(body);
        logger.debug({ body }, "Recieved token");
        if ("status" in bodyJSON) {
          return;
        }
        if (this.botAccount.token) {
          this.botAccount.token.access_timestamp = requestedDTM;
          this.botAccount.token = bodyJSON;
          resolve();
        }
      });
    });
  }

  /**
   * Verifies whether or not the current botAccount.token is valid or not
   *
   * @remarks
   * returns false if the token either doesn't exist, or is expires
   *
   * @returns boolean
   *
   */
  private verifyAuth(): boolean {
    // If any of the properties in the token access_timestamp chain are missing, the auth isn't valid
    if (!this.botAccount?.token?.access_timestamp) {
      return false;
    }
    // Check if the access_timestamp + expires_in from the OAuth reply is AFTER the current time
    //  If so, that indicates the token is still valid for use and we can continue on as normal
    const exp_dt: Date = this.botAccount.token.access_timestamp;
    exp_dt.setUTCSeconds(
      exp_dt.getUTCSeconds() + this.botAccount.token.expires_in
    );
    // If not expired, then return True (authentication is valid)
    if (exp_dt > new Date()) {
      return true;
    }
    // If the function makes it this far, then the authentication token is NOT valid and needs to be renewed
    return false;
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
  private async connectTwitchClient(
    skipAuthCheck: boolean = false
  ): Promise<void> {
    // NEVER allow more than one event to try and create a twitchClient at the same time...
    if (this.STATUS === "PENDING") {
      return;
    }
    this.STATUS = "PENDING";
    if (
      null === this.botAccount.username ||
      null === this.botAccount.password ||
      null === this.botAccount.channel ||
      typeof this.botAccount !== typeof {}
    ) {
      logger.error(
        { acct: this.botAccount },
        "Tried to connect to twitch client, but some account information is missing"
      );
      return;
    }

    if (!this.verifyAuth() || skipAuthCheck) {
      await this.getOAuthToken();
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
    const tokenPass = `oauth:${this.botAccount.token.access_token}`;
    this.twitchClient = new Client({
      channels: [this.botAccount.channel],
      options: { debug: process.env.NODE_ENV === "development" },
      identity: {
        username: this.botAccount.username,
        password: tokenPass,
      },
    });
    return this.twitchClient
      .connect()
      .catch((err) => {
        logger.error({ err }, "Failed to connect twitch client");
      })
      .then(() => {
        this.STATUS = "READY";
        logger.debug("Created and connected new twitch client");
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
      if (!this.verifyAuth() && this.STATUS === "READY") {
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
