export type Message<T extends Object = {}, K extends string = string> = {
  id: string;
  type: K;
  position: string;
  globalPosition: string;
  data: T;
  metadata: {
    correlationStreamName?: string;
    traceId?: string;
    userId?: string;
  };
  time: Date;
};
