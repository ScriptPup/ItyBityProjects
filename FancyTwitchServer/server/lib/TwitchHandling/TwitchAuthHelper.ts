/** @format */

import { TwitchAuthorization } from "../../../shared/obj/TwitchObjects";
import { configDB } from "../DatabaseRef";
import {
  RefreshingAuthProvider,
  AccessToken,
  exchangeCode,
} from "@twurple/auth";

/**
 * Authorization helper class, will automatically pull from configDB as needed
 *
 *
 */
export class TwitchAuthHelper {
  get botAccount() {
    return this.getAuthProvider(this._botAccount, "bot");
  }

  get ownerAccount() {
    return this.getAuthProvider(this._ownerAccount, "owner");
  }

  /**
   * _botAccount is the internal variable storing the bot account information from the configDB to cut down on calls to AceBase
   */
  private _botAccount?: TwitchAuthorization;

  /**
   * _ownerAccount is the internal variable storing the owner account information from the configDB to cut down on calls to AceBase
   */
  private _ownerAccount?: TwitchAuthorization;

  constructor() {}

  private async getAuthProvider(
    authorization: TwitchAuthorization | undefined,
    forWhomst: "owner" | "bot"
  ): Promise<RefreshingAuthProvider | null> {
    if (!authorization) {
      authorization = (
        await configDB.ref(`twitch-${forWhomst}-acct`).get()
      ).val();
    }
    if (!authorization) {
      return null;
    }

    let initialToken: AccessToken | null = null;
    if (!authorization.token) {
      if (authorization.auth_code)
        initialToken = await exchangeCode(
          authorization.clientId,
          authorization.clientSecret,
          authorization.auth_code,
          "http://localhost:9000/setup"
        );
    } else {
      initialToken = authorization.token;
    }

    if (authorization.token && initialToken !== null) {
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
      return refreshingAuthProvider;
    }
    return null;
  }
}

const saveAuthTokenToDB = async (
  token: AccessToken,
  forWhomst: "owner" | "bot"
): Promise<void> => {
  let acct: TwitchAuthorization[] | TwitchAuthorization = (
    await configDB.ref("twitch-bot-acct").get()
  ).val();
  let nacct: TwitchAuthorization;
  if (typeof acct === typeof [])
    if ((acct as TwitchAuthorization[]).length > 0)
      acct = (acct as TwitchAuthorization[])[0];
  nacct = acct as TwitchAuthorization;
  nacct["token"] = token;
  if (forWhomst === "bot") {
    await configDB.ref("twitch-bot-acct").set([acct]);
  } else if (forWhomst === "owner") {
    await configDB.ref("twitch-owner-acct").set([acct]);
  }
};
