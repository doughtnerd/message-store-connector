export type Message<T extends Object = {}, K extends string = string> = {
  id: string;
  type: K;
  position: number;
  globalPosition: number;
  streamName: string;
  data: T;
  metadata: {
    replyStreamName?: string;
    correlationStreamName?: string;
    traceId?: string;
    userId?: string;
  };
  time: Date;
};
