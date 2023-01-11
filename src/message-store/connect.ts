import { NoopLogger } from "../noop-logger";
import { project } from "./project";
import { subscribeToStream } from "./subscribe-to-stream";
import { subscribeToCategory } from "./subscribe-to-category";
import { projectCategory } from "./project-category";
import { connectToMessageDB, getCategoryMessages, getLastStreamMessage, getStreamMessages, writeMessage } from "../message-db-client";
import { EntityProjection, Message, MessageHandlerFunc, MessageStore, MessageStoreConfig } from "../types";
import {Serializeable} from "../types/serializeable.type";

export async function connect(config: MessageStoreConfig): Promise<MessageStore> {
  const { connectionString, logger = NoopLogger } = config;
  const client = await connectToMessageDB({ connectionString, logger })

  const messageStore: MessageStore = {
    writeMessage: <T extends Serializeable = {}>(streamName: string, message: Pick<Message<T>, "id" | "type" | "data" | "metadata">, expectedVersion?: number) =>
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
    project: <EntityType>(
      streamName: string,
      entityProjection: EntityProjection<EntityType, any, any>,
      options?: {
        startingPosition?: number;
        batchSize?: number;
        condition?: string;
      }
    ) => project<EntityType>(client, streamName, entityProjection, options),
    projectCategory: <EntityType>(
      categoryName: string,
      entityProjection: EntityProjection<EntityType, any, any>,
      options?: {
        startingPosition?: number;
        batchSize?: number;
        correlation?: string;
        consumerGroupMember?: string;
        consumerGroupSize?: string;
        condition?: string;
      }
    ) => projectCategory(client, categoryName, entityProjection, options),
    disconnect: () => client.end(),
  };
  return messageStore;
}
