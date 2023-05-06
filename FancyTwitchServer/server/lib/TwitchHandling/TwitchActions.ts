/** @format */

import { FancyRedemption } from "../../../shared/obj/FancyCommandTypes";
import { TwitchSayHelper } from "./TwitchSayHelper";
import { got, OptionsOfTextResponseBody, Response } from "got-cjs";
import {
  TwitchAuthorization,
  TwitchCustomChannelReward,
  TwitchCustomChannelRewards,
  TwitchUserEntities,
  TwitchUserEntity,
} from "../../../shared/obj/TwitchObjects";
import { MainLogger } from "../logging";

const logger = MainLogger.child({ file: "TwitchActions" });

export class TwitchActions {
  /**
   * TSH is the TwitchSayHelper which we'll get botAccountInfo from for any given command
   */
  private TSH: TwitchSayHelper;

  /**
   * channelInfo is essentially the cached results of getChannelInfo()
   */
  private channelInfo?: TwitchUserEntity;
  /**
   * TwitchActions class provides convinence methods for interfacing with twitch get/POST APIs
   *
   *
   *
   * @param TSH - TwitchSayHelper object which is where we'll get the authentication token for any given action.
   * @returns returned value explanation
   *
   * @alpha
   */
  constructor(TSH: TwitchSayHelper) {
    this.TSH = TSH;
  }

  /**
   * Given a `FancyRedemption` from the client, create and return the result of creating a custom twitch reward
   *
   *
   *
   * @param redemption - The redemption paramaters gathered from the client
   * @returns The Twitch redemption created
   *
   */
  public async createCustomRedemption(
    redemption: FancyRedemption
  ): Promise<TwitchCustomChannelReward> {
    const url: string =
      "https://api.twitch.tv/helix/channel_points/custom_rewards";
    const options: OptionsOfTextResponseBody = {
      json: {
        title: redemption.name,
        cost: redemption.cost,
        prompt: redemption.prompt,
        is_enabled: redemption.enabled,
        background_color: redemption.color,
        is_user_input_required: redemption.user_input,
        is_max_per_stream_enabled: (redemption.max_per_stream || 0) > 0,
        max_per_stream: redemption.max_per_stream,
        is_max_per_user_per_stream_enabled:
          (redemption.max_per_user_per_stream || 0) > 0,
        max_per_user_per_stream: redemption.max_per_user_per_stream,
        is_global_cooldown_enabled: (redemption.global_cooldown || 0) > 0,
        global_cooldown_seconds: redemption.global_cooldown,
        should_redemptions_skip_request_queue: false,
      },
    };
    const res = await this.postTwitch(url, options);
    this.validateResponse(res);
    const body: TwitchCustomChannelRewards =
      res.body as TwitchCustomChannelRewards;
    return body.data[0];
  }

  /**
   * Get the channel rewards that the bot is authroized to manage
   *
   *
   * @returns A list of twitch channel rewards that the bot account is authorized to manage
   *
   */
  public async getCustomRedemptions(): Promise<TwitchCustomChannelRewards> {
    const url = `https://api.twitch.tv/helix/channel_points/custom_rewards`;
    const form: OptionsOfTextResponseBody = {
      form: {
        broadcaster_id: (await this.getChannelInfo()).id,
        only_manageable_rewards: true,
      },
    };
    const res: Response = await this.getTwitch(url, form);
    this.validateResponse(res);
    return res.body as TwitchCustomChannelRewards;
  }

  public async getChannelInfo(): Promise<TwitchUserEntity> {
    if (this.channelInfo) {
      return this.channelInfo;
    }
    const url = `https://api.twitch.tv/helix/channel_points/custom_rewards`;
    const form: OptionsOfTextResponseBody = {
      form: {
        login: this.TSH.botAccount?.channel,
      },
    };
    const res: Response = await this.getTwitch(url, form);
    this.validateResponse(res);
    const body = res.body as TwitchUserEntities;
    this.channelInfo = body.data[0];
    return body.data[0];
  }

  /* ********************* */
  /* START PRIVATE METHODS */
  /* ********************* */

  /**
   * Generic post process for twitch API requests
   *
   * @remarks
   * Pretty much just a wrapper for got.post, but with the twitch Authorization and client-id included
   *
   * @param url - The URL to send the request to
   * @param options - The object representing the request paramaters including the data body
   * @returns The Response as a promise
   *
   */
  private async postTwitch(
    url: string,
    options: OptionsOfTextResponseBody
  ): Promise<Response> {
    const form: OptionsOfTextResponseBody = options;
    const token: TwitchAuthorization | null = this.TSH.botAccount;
    if (!token) {
      logger.error({ form, account_info: token });
      throw "Failed to execute requested twitch POST operation due to missing account details";
    }
    form.headers = {
      Authorization: `Bearer ${token.token?.accessToken}`,
      "Client-Id": token.clientId,
    };
    return new Promise((resolve, reject) => {
      got
        .post(url, form)
        .then((res) => {
          resolve(res);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }
  /**
   * Generic get process for twitch API requests
   *
   * @remarks
   * Pretty much just a wrapper for got.get, but with the twitch Authorization and client-id included
   *
   * @param url - The URL to send the request to
   * @param options - The object representing the request paramaters including the data body
   * @returns The Response as a promise
   *
   */
  private async getTwitch(
    url: string,
    options: OptionsOfTextResponseBody
  ): Promise<Response> {
    const form: OptionsOfTextResponseBody = options;
    const token: TwitchAuthorization | null = this.TSH.botAccount;
    if (!token) {
      logger.error({ form, account_info: token });
      throw "Failed to execute requested twitch GET operation due to missing account details";
    }
    form.headers = {
      Authorization: `Bearer ${token.token?.accessToken}`,
      "Client-Id": token.clientId,
    };
    return new Promise((resolve, reject) => {
      got
        .get(url, form)
        .then((res) => {
          resolve(res);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  /**
   * Run through validation of twitch response to ensure it's valid, if not throw and log an error
   *
   *
   * @param res - The response we're validating
   * @returns true
   *
   */
  private validateResponse(res: Response): boolean {
    if (!res.body) {
      logger.error({ response: res }, "No response body returned!");
      throw "No response body returned!";
    }
    if (res.statusCode !== 200) {
      logger.error({ response: res }, "Status code non-successful");
      throw "Status code non-successful";
    }
    if (typeof res.body !== typeof {}) {
      logger.error({ response: res }, "Body isn't the expected type {}");
      throw "Body isn't the expected type {}";
    }
    if (!(res.body as { data: any }).data) {
      logger.error(
        { body: res.body },
        "Data property not returned as expected!"
      );
      throw "Data property not returned as expected!";
    }
    return true;
  }
}
