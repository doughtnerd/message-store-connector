import { EntityProjection } from "./entity-projection.type";
import { MessageHandlerFunc } from "./message-handler.type";
import { Message } from "./message.type";

export interface MessageStore {
  writeMessage<T>(
    streamName: string,
    message: Pick<Message<T>, "id" | "type" | "data" | "metadata">,
    expectedVersion?: number
  ): Promise<{ streamPosition: string }>;
  getStreamMessages(
    streamName: string,
    options?: {
      startingPosition?: number;
      batchSize?: number;
      condition?: string;
    }
  ): Promise<Message[]>;
  getCategoryMessages(
    categoryName: string,
    options?: {
      startingPosition?: number;
      batchSize?: number;
      correlation?: string;
      consumerGroupMember?: string;
      consumerGroupSize?: string;
      condition?: string;
    }
  ): Promise<Message[]>;
  getLastStreamMessage(streamName: string): Promise<Message[]>;
  subscribeToStream(
    subscriberId: string,
    streamName: string,
    handlers: {
      [key: string]: MessageHandlerFunc;
    },
    options: {
      pollingInterval?: number;
      startingPosition?: number;
      retries?: number;
      batchSize?: number;
      condition?: string;
    }
  ): Promise<{ unsubscribe: () => void }>;
  subscribeToCategory(
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
  ): Promise<{ unsubscribe: () => void }>;
  project<EntityType>(
    streamName: string,
    entityProjection: EntityProjection<EntityType, any, any>,
    options?: {
      startingPosition?: number;
      batchSize?: number;
      condition?: string;
    }
  ): Promise<EntityType>;
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
  ) => Promise<EntityType>;
  disconnect(): Promise<void>;
}
