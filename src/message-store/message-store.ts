import promisePoller from 'promise-poller';
import { loadStreamSubscriberPosition, saveStreamSubscriberPosition } from "../message-db-client";
import { GetCategoryMessagesOptions, GetStreamMessagesOptions, IMessageDBClient } from "../message-db-client/message-db-client.interface";
import { NoopLogger } from '../noop-logger';
import { EntityInitFn, IMessageStore, Logger, Message, MessageHandlerContext, MessageHandlers, MinimalWritableMessage, Projection, ProjectOptions, SubscribeToCategoryOptions, Subscription } from "../types";

export class MessageStore implements IMessageStore {

  constructor(private client: IMessageDBClient, private logger: Logger = NoopLogger) {}

  /**
  * Tells the message store to subscribe to a particular stream category.
  * When a message for that category is received, the message will be dispatched to the appropriate handler (if one exists).
  *
  * @param subscriberId Unique id for the subscriber. This is used for position tracking and should be unique to a message store.
  * @param streamName The name of the stream category to subscribe to (e.g. 'shoppingCart:command').
  * @param handlers An object containing message handlers for each message type.
  * @param options Options for the subscription.
  */
  async subscribeToCategory(subscriberId: string, streamName: string, handlers: MessageHandlers, options: SubscribeToCategoryOptions): Promise<Subscription> {
    const { pollingInterval = 1000, positionUpdateInterval = 100, retries = 1, ...remainingOptions } = options;
    let { startingPosition = 0 } = options;

    let position: number = await loadStreamSubscriberPosition(this.client, streamName, subscriberId, this.logger, startingPosition);
    let lastSavedPosition: number = position;

    const poll: () => Promise<void> = async () => {
      const messages = await this.client.getCategoryMessages(streamName, { startingPosition: position, ...remainingOptions });
      for (const message of messages) {
        if (Object.prototype.hasOwnProperty.call(handlers, message.type)) {
          const handler = handlers[message.type];
          await handler(message, {
            logger: this.logger,
            /* @ts-ignore */
            messageStore: this,
          } as MessageHandlerContext);
        }
        position = message.globalPosition + 1;
        if (position >= lastSavedPosition + positionUpdateInterval) {
          await saveStreamSubscriberPosition(this.client, streamName, subscriberId, position, this.logger);
          lastSavedPosition = position;
        }
      }
    };

    const subscription = new Subscription({
        id: subscriberId,
        pollFn: poll,
        pollingInterval,
        retries,
        retryStrategy: 'fixed-interval',
    });

    subscription.start();

    return subscription;
  }

  async project<EntityType, MessageTypes extends Message>(streamName: string, entityProjection: Projection<EntityType, MessageTypes>, options?: ProjectOptions): Promise<EntityType> {
    options = options ?? {};
    let { startingPosition = 0 } = options;
    const { batchSize, condition } = options;

    let entity = initializeEntity<EntityType, MessageTypes>(entityProjection);

    const latestStreamVersion = await this.client.getStreamVersion(streamName);

    if (latestStreamVersion.streamVersion === null) {
      return entity;
    }

    const parsedStreamVersion = latestStreamVersion.streamVersion;

    while (startingPosition <= parsedStreamVersion) {
      const messages = await this.client.getStreamMessages(streamName, { startingPosition, batchSize, condition });
      for (const message of messages) {
        entity = doProjection<EntityType, MessageTypes>(entity, message, entityProjection);
      }

      startingPosition += messages.length;
    }
 
    return entity;
  }

  getCategoryMessages(categoryName: string, options?: GetCategoryMessagesOptions): Promise<Message[]> {
    return this.client.getCategoryMessages(categoryName, options);
  }

  getLastStreamMessage(streamName: string): Promise<Message[]> {
    return this.client.getLastStreamMessage(streamName);
  }

  getStreamMessages(streamName: string, options?: GetStreamMessagesOptions): Promise<Message[]> {
    return this.client.getStreamMessages(streamName, options);
  }

  getStreamVersion(streamName: string): Promise<{ streamVersion: number | null; }> {
    return this.client.getStreamVersion(streamName);
  }

  writeMessage<T extends Message>(streamName: string, message: T | MinimalWritableMessage<T>, expectedVersion?: number | undefined): Promise<{ streamPosition: string; }> {
    return this.client.writeMessage(streamName, message, expectedVersion);
  }

  writeBatch(streamName: string, messageBatch: MinimalWritableMessage<Message>[], expectedVersion?: number | undefined): Promise<{streamPosition: string;}[]> {
    return this.client.writeBatch(streamName, messageBatch, expectedVersion);
  }
}

function initializeEntity<EntityType, MessageTypes extends Message>(projection: Projection<EntityType, MessageTypes>): EntityType {
  let entity = projection.entity;
  if (typeof entity === "function") {
    return (entity as EntityInitFn<EntityType>)();
  }
  return entity;
}

function doProjection<EntityType, MessageTypes extends Message>(entity: EntityType, message: Message, projection: Projection<EntityType, MessageTypes>): EntityType {
  if (Object.prototype.hasOwnProperty.call(projection.handlers, message.type)) {
    const handlers = projection.handlers;
    /* @ts-ignore */
    const handler = handlers[message.type];
    const handlerReturn = handler?.(entity, message);
    entity = handlerReturn ? handlerReturn : entity;
  }

  return entity;
}
