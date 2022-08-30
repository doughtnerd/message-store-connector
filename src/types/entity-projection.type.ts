import { Message } from "./message.type";

export type ProjectionHandlerFunc<EntityType extends {} | Function, MessageDataType, MessageType extends string = any> = (entity: EntityType, message: Message<MessageDataType, MessageType>) => EntityType

export type EntityProjection<EntityType, MessageDataType, MessageTypes extends string = any> = {
  projectionName: string;
  entity: EntityType;
  handlers: Partial<{
    [Property in MessageTypes]: ProjectionHandlerFunc<EntityType, MessageDataType, Property>
  }>;
};