import promisePoller from "promise-poller";
import { getStreamMessages } from "../message-db-client/get-stream-messages";
import { NoopLogger } from "../noop-logger";
import { MessageHandlerFunc } from "../types/message-handler.type";
import { Client } from "pg";

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
): Promise<void> {
  const { pollingInterval = 1000, logger = NoopLogger, batchSize, condition, retries = 2 } = options;
  let { startingPosition: position = 0 } = options;

  const poll = async () => {
    const messages = await getStreamMessages(client, streamName, { startingPosition: position, batchSize, condition });
    position += messages.length;

    for (const message of messages) {
      if (Object.prototype.hasOwnProperty.call(handlers, message.type)) {
        const handler = handlers[message.type];
        const successFullyHandled = await handler(message, {
          logger,
          /* @ts-ignore */
          messageStore: this,
        });
        logger.log(`Successfully handled ${message.type}: ${successFullyHandled}`);
      }
    }
  };

  const poller = promisePoller({
    taskFn: poll,
    interval: pollingInterval,
    name: `${subscriberId} Poll to ${streamName}`,
    retries,
  });

  return poller.then();
}
