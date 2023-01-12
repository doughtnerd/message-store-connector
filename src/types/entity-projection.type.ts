import { Message } from "./message.type";
import { Serializeable } from "./serializeable.type";

export type ProjectionHandlerFunc<
  EntityType,
  MessageType extends Message
> = (entity: EntityType, message: MessageType) => EntityType

export type EntityInitFn<T> = () => T;

export type Projection<EntityType, MessageTypes extends Message> = {
  projectionName: string;
  entity: EntityType | EntityInitFn<EntityType>
  handlers: Partial<{
    [Property in MessageTypes['type']]: ProjectionHandlerFunc<EntityType, Extract<MessageTypes, Message<Serializeable, Property>>>
  }>;
};