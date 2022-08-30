import { Logger } from "./logger.type";

export type MessageStoreConfig = {
  connectionString: string
  logger?: Logger;
};
