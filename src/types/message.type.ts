export type Message = {
  id: string;
  type: string;
  position: number;
  global_position: number;
  data: Object;
  metadata: {
    correlationStreamName?: string;
    traceId?: string;
  };
  time: Date;
};
