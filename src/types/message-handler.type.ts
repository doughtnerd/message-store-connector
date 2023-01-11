import { MessageStore } from "./message-store.type";
import { Message } from "./message.type";

export type MessageHandlerContext = {
  logger: any;
  messageStore: MessageStore;
};

export type MessageHandlerFunc<T extends Message = Message<any, string>> = (message: T, context: MessageHandlerContext) => Promise<boolean>;
