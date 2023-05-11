import { IMessageDBClient } from "../message-db-client";
import { Projection } from "./entity-projection.type";
import { MessageHandlerFunc } from "./message-handler.type";
import { Message } from "./message.type";

export type MessageHandlers = {
  [key: string]: MessageHandlerFunc;
};

export type SubscribeToStreamOptions = {
  pollingInterval?: number;
  positionUpdateInterval?: number;
  startingPosition?: number;
  retries?: number;
  batchSize?: number;
  condition?: string;
};

export type SubscribeToCategoryOptions = {
  positionUpdateInterval?: number;
  pollingInterval?: number;
  retries?: number;
  startingPosition?: number;
  batchSize?: number;
  condition?: string;
  correlation?: string;
  consumerGroupMember?: string;
  consumerGroupSize?: string;
};

export type ProjectOptions = {
  startingPosition?: number;
  batchSize?: number;
  condition?: string;
};

export type ProjectCategoryOptions = {
  startingPosition?: number;
  batchSize?: number;
  correlation?: string;
  consumerGroupMember?: string;
  consumerGroupSize?: string;
  condition?: string;
};

export interface IMessageStore extends IMessageDBClient {
  subscribeToStream(
    subscriberId: string,
    streamName: string,
    handlers: MessageHandlers,
    options?: SubscribeToStreamOptions
  ): Promise<{ unsubscribe: () => void }>;

  subscribeToCategory(
    subscriberId: string,
    streamName: string,
    handlers: MessageHandlers,
    options?: SubscribeToCategoryOptions
  ): Promise<{ unsubscribe: () => void }>;

  project<EntityType, MessageTypes extends Message>(
    streamName: string,
    entityProjection: Projection<EntityType, MessageTypes>,
    options?: ProjectOptions
  ): Promise<EntityType>;
  
  projectCategory: <EntityType, MessageTypes extends Message>(
    categoryName: string,
    entityProjection: Projection<EntityType, MessageTypes>,
    options?: ProjectCategoryOptions
  ) => Promise<EntityType>;
}
