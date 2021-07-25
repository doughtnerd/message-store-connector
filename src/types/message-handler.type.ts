import { MessageStore } from "./message-store.type";
import { Message } from "./message.type";

export type MessageHandlerContext = {
  logger: any;
  messageStore: MessageStore;
};

export type MessageHandlerFunc = (message: Message, context: MessageHandlerContext) => Promise<boolean>;
