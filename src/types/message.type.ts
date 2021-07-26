export type Message = {
  id: string;
  type: string;
  position: string;
  globalPosition: string;
  data: Object;
  metadata: {
    correlationStreamName?: string;
    traceId?: string;
  };
  time: Date;
};
