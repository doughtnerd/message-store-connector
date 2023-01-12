import {Message, MinimalWritableMessage} from "../types";

export type MessageBatchConfig<T extends Message = Message> = {
  message: MinimalWritableMessage<T> | T,
  streamName: string;
  expectedVersion?: number;
}

export type GetCategoryMessagesOptions = {
  startingPosition?: number;
  batchSize?: number;
  correlation?: string;
  consumerGroupMember?: string;
  consumerGroupSize?: string;
  condition?: string;
}

export type GetStreamMessagesOptions = {
  startingPosition?: number;
  batchSize?: number;
  condition?: string;
}

export interface IMessageDBClient {
  getCategoryMessages(
    categoryName: string,
    options?: GetCategoryMessagesOptions
  ): Promise<Message[]>

  getLastStreamMessage(streamName: string): Promise<Message[]>;

  getStreamMessages(
    streamName: string,
    options?: GetStreamMessagesOptions
  ): Promise<Message[]>

  getStreamVersion(streamName: string): Promise<{ streamVersion: number | null }>;

  writeMessage<T extends Message>(
    streamName: string,
    message: MinimalWritableMessage<T> | T,
    expectedVersion?: number
  ): Promise<{ streamPosition: string }>;

  writeBatch(messageBatch: Array<MessageBatchConfig<Message>>): Promise<Array<{ streamPosition: string }>>;

  // loadStreamSubscriberPosition(
  //   subscriberId: string,
  //   defaultPosition: number
  // ): Promise<number>;

  // saveStreamSubscriberPosition(subscriberId: string, newPosition: number): Promise<void>
}
