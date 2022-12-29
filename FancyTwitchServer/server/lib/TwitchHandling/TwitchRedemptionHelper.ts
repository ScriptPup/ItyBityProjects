/** @format */

import { PubSubClient } from "@twurple/pubsub";
import { PubSubMessageData } from "@twurple/pubsub/lib/messages/PubSubMessage";
import { StaticAuthProvider } from "@twurple/auth";
import { TwitchSayHelper } from "./TwitchSayHelper";

import { MainLogger } from "../logging";
import { PubSubRedemptionMessage } from "@twurple/pubsub/lib/messages/PubSubRedemptionMessage";
import { PubSubListener } from "@twurple/pubsub/lib/PubSubListener";
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
  await TSH.isReady;
  const pubSub: PubSubClient = new PubSubClient();
  if (!TSH.botAccount.token) {
    logger.error(
      "Cannot setup redemptions due to botAccount access token not existing"
    );
    return;
  }
  const authProvider: StaticAuthProvider = new StaticAuthProvider(
    TSH.botAccount.client_id,
    TSH.botAccount.token.access_token,
    ["channel:read:redemptions", "channel_read"]
  );
  try {
    const userId: string = await pubSub.registerUserListener(
      authProvider,
      TSH.botAccount.channel
    );
    logger.debug(`Listening to user ${userId}`);
    const redemptionListener: PubSubListener = await pubSub.onRedemption(
      userId,
      (message: PubSubRedemptionMessage) => {
        logger.debug({ message }, "Recieved subscribed pubsub message");
      }
    );
    logger.info("pubSub redemption listener setup");
  } catch (err) {
    logger.error({ authProvider, err }, "Unable to setup redemptions listener");
  }
};
