import { Logger } from "./logger.type";

export type MessageStoreConfig = {
  messageStoreHost: string;
  messageStorePassword: string;
  logger?: Logger;
};
