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

export async function connect(config: MessageStoreConfig): Promise<MessageStore> {
  const { messageStoreHost, messageStorePassword, logger = NoopLogger } = config;
  const client = await connectToMessageDB(messageStoreHost, messageStorePassword, logger);

  const messageStore: MessageStore = {
    writeMessage: (streamName: string, message: Pick<Message, "id" | "type" | "data" | "metadata">, expectedVersion?: number) =>
      writeMessage.call(null, client, streamName, message, expectedVersion),
    getStreamMessages: (streamName: string, startingPosition?: number, batchSize?: number, condition?: string) =>
      getStreamMessages.call(null, client, streamName, startingPosition, batchSize, condition),
    getCategoryMessages: (
      categoryName: string,
      startingPosition: number,
      batchSize?: number,
      correlation?: string,
      consumerGroupMember?: string,
      consumerGroupSize?: string,
      condition?: string
    ) =>
      getCategoryMessages.call(
        null,
        client,
        categoryName,
        startingPosition,
        batchSize,
        correlation,
        consumerGroupMember,
        consumerGroupSize,
        condition
      ),
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
    project: <T>(
      streamName: string,
      entityProjection: EntityProjection<T>,
      options?: {
        startingPosition?: number;
        batchSize?: number;
        condition?: string;
      }
    ) => project(client, streamName, entityProjection, options), //project.call(null, client, streamName, entityProjection) as Promise<T>,
    disconnect: () => client.end(),
  };
  return messageStore;
}
