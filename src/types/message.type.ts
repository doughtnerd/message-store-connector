import { Serializeable } from "./serializeable.type";

export type Message<T extends Serializeable = {}, K extends string = string> = {
  /** Unique identifier for the message. */
  id: string;

  /** The name of the message (e.g. ItemAddedToCart or AddItemToCart). */
  type: K;

  /** The stream position of the message */
  position: number;

  /** The global position of the message */
  globalPosition: number;

  /** The name of the stream that the message was written to. */
  streamName: string;

  /** The data of the message. */
  data: T;

  metadata: {
    /** The name of the stream that a reply message should be sent to. */
    replyStreamName?: string;

    /** When using event workflows, this indicates the name of the stream that started to workflow. */
    correlationStreamName?: string;

    /** Stream position of the message that caused this message to be written. */
    causationMessagePosition?: string;

    /** The global position of the message that caused this message to be written. */
    causationMessageGlobalPosition?: string;

    /** Name of the stream that contains the message that caused this message to be written. */
    causationMessageStreamName?: string;

    /** Id that can be used to trace messages related to eachother. */
    traceId?: string;

    /** The user that initiated the message. */
    userId?: string;

    /** The version of the message. */
    schemaVersion?: string;
  };
  time: Date;
};

export type MinimalWritableMessage<T extends Message> = {id?: string} & Pick<T, 'type' | 'data' | 'metadata'>
