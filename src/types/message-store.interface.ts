import { IMessageDBClient } from "../message-db-client";
import { Projection } from "./entity-projection.type";
import { MessageHandlerFunc } from "./message-handler.type";
import { Message } from "./message.type";

export type MessageHandlers = {
  [key: string]: MessageHandlerFunc;
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

export interface IMessageStore extends IMessageDBClient {
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
}
