import {Serializeable} from "./serializeable.type";

export type Message<T extends Serializeable = {}, K extends string = string> = {
  id: string;
  type: K;
  position: number;
  globalPosition: number;
  streamName: string;
  data: T;
  metadata: {
    replyStreamName?: string;
    correlationStreamName?: string;
    causationMessagePosition?: string;
    causationMessageGlobalPosition?: string;
    causationMessageStreamName?: string;
    traceId?: string;
    userId?: string;
    schemaVersion?: string;
  };
  time: Date;
};

export type MinimalWritableMessage<T extends Message> = Pick<T, 'id' | 'type' | 'data' | 'metadata'>
