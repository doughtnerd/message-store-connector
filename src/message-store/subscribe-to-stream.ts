import { Client } from "pg";
import promisePoller from "promise-poller";
import { getStreamMessages } from "../message-db-client/get-stream-messages";
import { loadStreamSubscriberPosition, saveStreamSubscriberPosition } from "../message-db-client/stream-subscriber-position";
import { NoopLogger } from "../noop-logger";
import { MessageHandlerContext, MessageHandlerFunc } from "../types/message-handler.type";

export async function subscribeToStream(
  client: Client,
  subscriberId: string,
  streamName: string,
  handlers: {
    [key: string]: MessageHandlerFunc;
  },
  options: {
    logger?: any;
    pollingInterval?: number;
    retries?: number;
    startingPosition?: number;
    batchSize?: number;
    condition?: string;
  }
): Promise<{ unsubscribe: () => void }> {
  const { pollingInterval = 1000, logger = NoopLogger, batchSize, condition, retries = 1 } = options;
  let { startingPosition } = options;

  let position: number = await loadStreamSubscriberPosition(client, subscriberId, logger, startingPosition);

  let shouldUnsubscribe = false;

  let unsubscribe = () => {
    shouldUnsubscribe = true;
  };

  const poll: () => Promise<boolean> = async () => {
    const messages = await getStreamMessages(client, streamName, { startingPosition: position, batchSize, condition });
    position += messages.length;

    for (const message of messages) {
      if (Object.prototype.hasOwnProperty.call(handlers, message.type)) {
        const handler = handlers[message.type];
        const successFullyHandled = await handler(message, {
          logger,
          /* @ts-ignore */
          messageStore: this,
          unsubscribe,
        } as MessageHandlerContext);
      }
    }

    await saveStreamSubscriberPosition(client, subscriberId, position, logger);
    return true;
  };

  const poller = promisePoller({
    taskFn: poll,
    interval: pollingInterval,
    name: `${subscriberId} Poll to ${streamName}`,
    retries,
    shouldContinue: (reason, resolvedValue) => {
      if (shouldUnsubscribe) return false;
      return resolvedValue ? true : false;
    },
  });

  // This is kinda weird check logic that needs to happen for promisePoller library on cancelled subscriptions
  poller.then().catch((e) => {
    if (e instanceof Array) {
      logger.log("Subscription Closed");
    } else {
      throw e;
    }
  });

  return { unsubscribe };
}
