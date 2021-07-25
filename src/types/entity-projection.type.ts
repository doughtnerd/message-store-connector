import { Message } from "./message.type";

export type projectionHandlerFunc<T> = (entity: T, message: Message) => T;

export type EntityProjection<T extends {} | Function> = {
  projectionName: string;
  entity: T;
  handlers: {
    [key: string]: projectionHandlerFunc<T>;
  };
};
