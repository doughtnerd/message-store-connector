import { Message } from "./message.type";
import {Serializeable} from "./serializeable.type";

export type ProjectionHandlerFunc<EntityType extends {} | Function, MessageDataType extends Serializeable, MessageType extends string = any> = (entity: EntityType, message: Message<MessageDataType, MessageType>) => EntityType

export type EntityProjection<EntityType, MessageDataType extends Serializeable, MessageTypes extends string = any> = {
  projectionName: string;
  entity: EntityType;
  handlers: Partial<{
    [Property in MessageTypes]: ProjectionHandlerFunc<EntityType, MessageDataType, Property>
  }>;
};
