import { Message } from "./message.type";
import { Serializeable } from "./serializeable.type";

/**
* Function called by the projection runner to handle a message for an entity.
* @param entity The entity to handle the message for.
* @param message The message to handle.
* @returns The updated entity.
*/
export type ProjectionHandlerFunc<
  EntityType,
  MessageType extends Message
> = (entity: EntityType, message: MessageType) => EntityType

export type EntityInitFn<T> = () => T;

export type Projection<EntityType = any, MessageTypes extends Message = Message> = {
  /** Used in debugging to verify the projection running. */
  projectionName: string;
  /** The initial state of the entity. Can either be a function or a constant. */
  entity: EntityType | EntityInitFn<EntityType>
  /**
  * Handlers for each available message type for the given entity.
  * Used to bring the entity back to current state.
  * @example
  * handlers: {
  *     ItemAddedToCart: (entity: ShoppingCart, message: ItemAddedToCart) => {
  *         entity.addItem(message.data.item);
  *         return entity;
  *     },
  * }
  */
  handlers: Partial<{
    [Property in MessageTypes['type'] as Extract<Property, string>]: ProjectionHandlerFunc<EntityType, Extract<MessageTypes, Message<Serializeable, Property>>>
  }>;
};
