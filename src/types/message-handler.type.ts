import { IMessageStore } from "./message-store.interface";
import { Message } from "./message.type";

export type MessageHandlerContext = {
  logger: any;
  messageStore: IMessageStore;
};

export type MessageHandlerFunc<
  T extends Message = Message
> = (message: T, context: MessageHandlerContext) => Promise<boolean>;
