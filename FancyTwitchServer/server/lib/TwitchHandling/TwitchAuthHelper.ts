/** @format */

import { TwitchAuthorization } from "../../../shared/obj/TwitchObjects";
import { configDB } from "../DatabaseRef";
import {
  RefreshingAuthProvider,
  AccessToken,
  exchangeCode,
} from "@twurple/auth";
import { MainLogger } from "../logging";
const logger = MainLogger.child({ file: "TwitchAuthHelper" });

/**
 * Authorization helper class, will automatically pull from configDB as needed
 *
 *
 */
export class TwitchAuthHelper {
  /**
   * botAccount returns a promise which will resolve to the TwitchAuthorization object for the bot
   */
  get botAccount() {
    return this.getAuthProvider("bot");
  }

  /**
   * ownerAccount returns as promise which will resolve to the TwitchAuthorization object for the streamer (channel owner)
   */
  get ownerAccount() {
    return this.getAuthProvider("owner");
  }

  private _authProviders: {
    owner: RefreshingAuthProvider | null;
    bot: RefreshingAuthProvider | null;
  } = { bot: null, owner: null };

  constructor() {}

  private async getAuthProvider(
    forWhomst: "owner" | "bot"
  ): Promise<RefreshingAuthProvider | null> {
    const provider: RefreshingAuthProvider | null =
      this._authProviders[forWhomst];
    if (provider) {
      return provider;
    }

    const authorization: TwitchAuthorization | null = await getAuthorizationFor(
      forWhomst
    );
    if (!authorization) {
      logger.debug({ forWhomst }, `No authorization found`);
      return null;
    }
    logger.debug({ forWhomst }, `Authorization found`);

    let initialToken: AccessToken | null = null;
    if (!authorization.token) {
      logger.debug({ forWhomst }, `No token saved for authorization`);
      if (authorization.auth_code) {
        logger.debug(
          { forWhomst },
          `There IS an authorization code available to request an initial token, doing that`
        );
        initialToken = await exchangeCode(
          authorization.clientId,
          authorization.clientSecret,
          authorization.auth_code,
          "http://localhost:9000/setup"
        );
        logger.debug({ forWhomst, initialToken }, `Initial token provided`);
      }
    } else {
      logger.debug(
        { forWhomst, initialToken },
        `Token found in authorization, using that as initial token`
      );
      initialToken = authorization.token;
    }

    if (initialToken !== null) {
      logger.debug(
        {
          forWhomst,
          clientId: authorization.clientId,
          clientSecret: authorization.clientSecret,
          initialToken,
        },
        `Requesting RefreshingAuthProvider`
      );
      const refreshingAuthProvider: RefreshingAuthProvider =
        new RefreshingAuthProvider(
          {
            clientId: authorization.clientId,
            clientSecret: authorization.clientSecret,
            onRefresh: async (newTokenData) => {
              saveAuthTokenToDB(newTokenData, forWhomst);
            },
          },
          initialToken
        );
      saveAuthTokenToDB(initialToken, forWhomst);
      this._authProviders[forWhomst] = refreshingAuthProvider;
      return refreshingAuthProvider;
    }
    return null;
  }
}

const saveAuthTokenToDB = async (
  token: AccessToken,
  forWhomst: "owner" | "bot"
): Promise<void> => {
  logger.debug({ forWhomst }, "Requested adding authTokenToDB");
  let acct: TwitchAuthorization | null = await getAuthorizationFor(forWhomst);
  if (!acct) {
    logger.error(
      { forWhomst },
      `Failed to save token due to not being able to find an existing authorization config`
    );
    return;
  }
  logger.debug(
    { forWhomst },
    "Found existing config, updating token and setting"
  );
  acct["token"] = token;
  await configDB.ref(`twitch-${forWhomst}-acct`).set([acct]);
  logger.debug({ forWhomst }, "Token added to config");
  const newAccountData = await getAuthorizationFor(forWhomst);
  logger.debug(
    { forWhomst, newAccountData, key: `twitch-${forWhomst}-acct` },
    "New data stored looks like this"
  );
};

export const getAuthorizationFor = async (
  whomst: "owner" | "bot"
): Promise<TwitchAuthorization | null> => {
  let acct: TwitchAuthorization[] | TwitchAuthorization = (
    await configDB.ref(`twitch-${whomst}-acct`).get()
  ).val();
  if (!acct) {
    return null;
  }
  if (typeof acct === typeof [])
    if ((acct as TwitchAuthorization[]).length > 0)
      acct = (acct as TwitchAuthorization[])[0];
  return acct as TwitchAuthorization;
};

export const twitchAuthHelper = new TwitchAuthHelper();
