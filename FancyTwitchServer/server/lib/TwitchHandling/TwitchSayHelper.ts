/** @format */

// import { Client } from "tmi.js";
import { StaticAuthProvider } from "@twurple/auth";
import { ChatClient } from "@twurple/chat";
import { BotAccount } from "../../../shared/obj/TwitchObjects";
import { got } from "got-cjs";
import { MainLogger } from "../logging";
import { configDB } from "../DatabaseRef";
const logger = MainLogger.child({ file: "TwitchSayHelper" });

export class TwitchSayHelper {
  /**
   * twitchClient is the client which is used internally to actually send data back to twitch, it will be destroyed and replaced when the bearer token expires
   */
  public twitchClient?: ChatClient;

  /**
   * botAccount is the property which contains information relevant to the bot used to communicate with twitch
   */
  public botAccount: BotAccount;
  /**
   * The TwitchSayHelper is provided to avoid race conditions when multiple messages come in on top of eachother
   * If multiple commands have to be sent back to the twitch service while a new token is being negotated we don't want the entire thing to fail.
   * So this class can be used to avoid that by introducing a layer which will check the status of negotiaton, and if the client isn't ready it'll wait until it is to send commands
   *
   *
   */
  public isReady: Promise<void>;

  public STATUS: "READY" | "PENDING" | "ERROR" | "NOT STARTED" = "NOT STARTED";

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

    const bodyToken = (await configDB.ref("twitch-bot-token").get()).val();
    if (bodyToken) {
      logger.debug(bodyToken, "Token retrieved from twitch-bot-token store");
      this.botAccount.token = bodyToken;
    }
    if (this.botAccount.token?.refresh_token) {
      return this.OAuthTokenRequest("refresh_token");
    } else {
      return this.OAuthTokenRequest("authorization_code");
    }
  }

  /**
   * Uses the authorization code to request a bearer token. The authorization token can get revoked if the user re-submits/reconnects with the rediret URL still in the banner.
   *
   */
  private async OAuthTokenRequest(
    grant_type: "refresh_token" | "authorization_code"
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      let form: Record<string, any> = {
        client_id: this.botAccount.client_id,
        client_secret: this.botAccount.client_secret,
        code: this.botAccount.auth_code,
        redirect_uri: "http://localhost:9000",
        grant_type: "authorization_code",
      };
      if (
        grant_type === "refresh_token" &&
        this.botAccount.token?.refresh_token
      ) {
        form = {
          client_id: this.botAccount.client_id,
          client_secret: this.botAccount.client_secret,
          refresh_token: this.botAccount.token.refresh_token,
          grant_type: "refresh_token",
        };
        logger.debug(
          { refresh_token: this.botAccount.token.refresh_token },
          "OAuth retrieving token using refresh_token"
        );
      } else {
        logger.debug("OAuth retrieving token using authorization_code");
      }

      try {
        const { body } = await got.post("https://id.twitch.tv/oauth2/token", {
          form,
        });
        const requestedDTM: Date = new Date();
        if (!this.botAccount) {
          logger.error(
            "Bot account somehow isn't set after recieving OAuth response from server"
          );
          reject(
            "Bot account somehow isn't set after recieving OAuth response from server"
          );
          return;
        }
        const bodyJSON:
          | {
              access_token: string;
              refresh_token: string;
              expires_in: number;
              token_type: string;
              access_timestamp?: Date;
            }
          | { status: string; message: string } = JSON.parse(body);
        logger.debug({ bodyJSON, body }, "Recieved token");
        if ("status" in bodyJSON) {
          logger.error(
            { bodyJSON },
            "Recieved unexpected status from twitch OAuth"
          );
          return;
        }
        this.botAccount.token = bodyJSON;
        if (this.botAccount.token) {
          this.botAccount.token.access_timestamp = requestedDTM;
          await configDB.ref("twitch-bot-token").set(this.botAccount.token);
          logger.debug(
            { token: this.botAccount.token },
            "Added token to twitch-bot-token"
          );
          resolve();
        }
      } catch (err: any) {
        delete this.botAccount["token"];
        logger.error(
          { responseBody: err.response.body, form },
          "Failed to get an OAuthToken"
        );
        switch (JSON.parse(err.response.body).message) {
          case "invalid client":
            reject("Failed to get an OAuthToken due to an invalid client ID");
            break;
          case "Invalid authorization code":
            reject(
              "Failed to get an OAuthToken due to an invalid authorization code. Re-authorize and try again."
            );
            break;
          default:
            reject("Failed to get an OAuthToken for an unknown reason");
            return;
        }
      }
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
        null === this.botAccount.client_id ||
        null === this.botAccount.client_secret ||
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
        logger.debug(
          { skipAuthCheck },
          "Twitch OAuth verification failed, or skipAuthCheck is true, requesting token"
        );
        try {
          await this.getOAuthToken();
          logger.debug("getOAuthToken request completed");
        } catch (err: any) {
          logger.debug({ err }, "getOAuthToken request failed");
          // TODO: Provide user feedback about the authentication failure!
        }
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
      const authProvider: StaticAuthProvider = new StaticAuthProvider(
        this.botAccount.client_id,
        this.botAccount.token.access_token
      );
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
