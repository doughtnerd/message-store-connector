import { EntityProjection } from "./entity-projection.type";
import { MessageHandlerFunc } from "./message-handler.type";
import { Message } from "./message.type";

export type MessageStore = {
  writeMessage: (
    streamName: string,
    message: Pick<Message, "id" | "type" | "data" | "metadata">,
    expectedVersion?: number
  ) => Promise<{ streamPosition: string }>;
  getStreamMessages: (
    streamName: string,
    startingPosition?: number,
    batchSize?: number,
    condition?: string
  ) => Promise<Message[]>;
  getCategoryMessages: (
    categoryName: string,
    startingPosition: number,
    batchSize?: number,
    correlation?: string,
    consumerGroupMember?: string,
    consumerGroupSize?: string,
    condition?: string
  ) => Promise<Message[]>;
  getLastStreamMessage: (streamName: string) => Promise<Message[]>;
  subscribeToStream: (
    subscriberId: string,
    streamName: string,
    handlers: {
      [key: string]: MessageHandlerFunc;
    },
    options: { pollingInterval: number }
    // startingPosition?: number,
    // batchSize?: number,
    // condition?: string
  ) => Promise<void>;
  project: <T>(
    streamName: string,
    entityProjection: EntityProjection<T>
  ) => Promise<T>;
  disconnect: () => Promise<void>;
};
