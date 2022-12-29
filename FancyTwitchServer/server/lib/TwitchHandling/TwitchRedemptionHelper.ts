/** @format */

import { BasicPubSubClient } from "@twurple/pubsub";
import { PubSubMessageData } from "@twurple/pubsub/lib/messages/PubSubMessage";
import { StaticAuthProvider } from "@twurple/auth";
import { TwitchSayHelper } from "./TwitchSayHelper";
import { got } from "got-cjs";
import { MainLogger } from "../logging";
const logger = MainLogger.child({ file: "TwitchRedemptionHelper" });

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
export const TwitchRedemptionHelper = async (
  TSH: TwitchSayHelper
): Promise<void> => {
  logger.debug(
    "Requested redemption helper setup, waiting until TwitchSayHelper is ready"
  );
  await TSH.isReady;
  logger.debug("Starting redemption helper setup");
  if (!TSH.botAccount.token) {
    logger.error(
      "Cannot setup redemptions due to botAccount access token not existing"
    );
    return;
  }
  const pubSub: BasicPubSubClient = new BasicPubSubClient();
  const userId: string = await getChannelUserId(TSH);

  const authProvider: StaticAuthProvider = new StaticAuthProvider(
    TSH.botAccount.client_id,
    TSH.botAccount.token.access_token,
    ["channel:read:redemptions"]
  );
  const redemption_topic: string = `channel-points-channel-v1.${userId}`;
  logger.debug({ redemption_topic }, "Setting up redemption lisenter");
  pubSub.listen(redemption_topic, authProvider, "channel:read:redemptions");
  pubSub.onPong(() => {
    logger.debug("Recieved pong message from pubsub client");
  });
  pubSub.onMessage((topic: string, message: PubSubMessageData) => {
    logger.debug({ topic, message }, "Recieved pubsub message");
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
};

/**
 * Gets the user/channel ID from twitch representing whatever channel is provided by the user
 *
 *
 * @param TSH - The TwitchSayHelper, just pass it through
 * @returns a promise containing the userID string (when resolved)
 *
 */
const getChannelUserId = (TSH: TwitchSayHelper): Promise<string> => {
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
};
