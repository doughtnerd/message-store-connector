import { Message } from "./message.type";
import { Serializeable } from "./serializeable.type";

export type ProjectionHandlerFunc<
  EntityType,
  MessageType extends Message
> = (entity: EntityType, message: MessageType) => EntityType

export type EntityInitFn<T> = () => T;

export type Projection<EntityType = any, MessageTypes extends Message = Message> = {
  projectionName: string;
  entity: EntityType | EntityInitFn<EntityType>
  handlers: Partial<{
    [Property in MessageTypes['type'] as Extract<Property, string>]: ProjectionHandlerFunc<EntityType, Extract<MessageTypes, Message<Serializeable, Property>>>
  }>;
};
