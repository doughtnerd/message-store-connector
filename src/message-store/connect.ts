import { connectToMessageDB } from "../message-db-client/connect-to-messagedb";
import { getCategoryMessages } from "../message-db-client/get-category-messages";
import { getLastStreamMessage } from "../message-db-client/get-last-stream-message";
import { getStreamMessages } from "../message-db-client/get-stream-messages";
import { writeMessage } from "../message-db-client/write-message";
import { NoopLogger } from "../noop-logger";
import { EntityProjection } from "../types/entity-projection.type";
import { MessageHandlerFunc } from "../types/message-handler.type";
import { MessageStoreConfig } from "../types/message-store-config.type";
import { MessageStore } from "../types/message-store.type";
import { Message } from "../types/message.type";
import { project } from "./project";
import { subscribeToStream } from "./subscribe-to-stream";
import { subscribeToCategory } from "./subscribe-to-category";

export async function connect(config: MessageStoreConfig): Promise<MessageStore> {
  const { messageStoreHost, messageStorePassword, logger = NoopLogger } = config;
  const client = await connectToMessageDB(messageStoreHost, messageStorePassword, logger);

  const messageStore: MessageStore = {
    writeMessage: <T>(streamName: string, message: Pick<Message<T>, "id" | "type" | "data" | "metadata">, expectedVersion?: number) =>
      writeMessage.call(null, client, streamName, message, expectedVersion),
    getStreamMessages: (
      streamName: string,
      options?: {
        startingPosition?: number;
        batchSize?: number;
        condition?: string;
      }
    ) => getStreamMessages.call(null, client, streamName, options),
    getCategoryMessages: (
      categoryName: string,
      options?: {
        startingPosition?: number;
        batchSize?: number;
        correlation?: string;
        consumerGroupMember?: string;
        consumerGroupSize?: string;
        condition?: string;
      }
    ) => getCategoryMessages.call(null, client, categoryName, options),
    getLastStreamMessage: (streamName: string) => getLastStreamMessage.call(null, client, streamName),
    subscribeToStream: (
      subscriberId: string,
      streamName: string,
      handlers: {
        [key: string]: MessageHandlerFunc;
      },
      options: {
        pollingInterval?: number;
        retries?: number;
        startingPosition?: number;
        batchSize?: number;
        condition?: string;
      }
    ) => subscribeToStream.call(messageStore, client, subscriberId, streamName, handlers, { ...options, logger: logger }),
    subscribeToCategory: (
      subscriberId: string,
      streamName: string,
      handlers: {
        [key: string]: MessageHandlerFunc;
      },
      options: {
        pollingInterval?: number;
        retries?: number;
        startingPosition?: number;
        batchSize?: number;
        condition?: string;
        correlation?: string;
        consumerGroupMember?: string;
        consumerGroupSize?: string;
      }
    ) => subscribeToCategory.call(messageStore, client, subscriberId, streamName, handlers, { ...options, logger: logger }),
    project: <T>(
      streamName: string,
      entityProjection: EntityProjection<T>,
      options?: {
        startingPosition?: number;
        batchSize?: number;
        condition?: string;
      }
    ) => project(client, streamName, entityProjection, options),
    disconnect: () => client.end(),
  };
  return messageStore;
}
