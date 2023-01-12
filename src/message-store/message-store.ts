import promisePoller from 'promise-poller';
import { loadStreamSubscriberPosition, saveStreamSubscriberPosition } from "../message-db-client";
import { GetCategoryMessagesOptions, GetStreamMessagesOptions, IMessageDBClient, MessageBatchConfig } from "../message-db-client/message-db-client.interface";
import { NoopLogger } from '../noop-logger';
import { EntityInitFn, IMessageStore, Logger, Message, MessageHandlerContext, MessageHandlers, MinimalWritableMessage, ProjectCategoryOptions, Projection, ProjectOptions, SubscribeToCategoryOptions, SubscribeToStreamOptions } from "../types";

export class MessageStore implements IMessageStore {

  constructor(private client: IMessageDBClient, private logger: Logger = NoopLogger) {}

  async subscribeToStream(subscriberId: string, streamName: string, handlers: MessageHandlers, options: SubscribeToStreamOptions): Promise<{ unsubscribe: () => void; }> {
    const { pollingInterval = 1000, batchSize, condition, retries = 1 } = options;
    let { startingPosition = 0 } = options;

    let position: number = await loadStreamSubscriberPosition(this.client, subscriberId, this.logger, startingPosition);

    let shouldUnsubscribe = false;

    let unsubscribe = () => {
      shouldUnsubscribe = true;
    };

    const poll: () => Promise<boolean> = async () => {
      const messages = await this.client.getStreamMessages(streamName, { startingPosition: position, batchSize, condition });

      for (const message of messages) {
        if (Object.prototype.hasOwnProperty.call(handlers, message.type)) {
          const handler = handlers[message.type];
          await handler(message, {
            logger: this.logger,
            /* @ts-ignore */
            messageStore: this,
            unsubscribe,
          } as MessageHandlerContext);
        }
        position = message.globalPosition + 1;
        await saveStreamSubscriberPosition(this.client, subscriberId, position, this.logger);
      }

      return true;
    };

    const poller = promisePoller({
      taskFn: poll,
      interval: pollingInterval,
      name: `${subscriberId} Poll to ${streamName}`,
      retries,
      shouldContinue: (_: any, resolvedValue: unknown) => {
        if (shouldUnsubscribe) return false;
        return resolvedValue ? true : false;
      },
    });

    // This is kinda weird check logic that needs to happen for promisePoller library on cancelled subscriptions
    poller.then().catch((e) => {
      if (e instanceof Array) {
        this.logger.log("Subscription Closed");
      } else {
        throw e;
      }
    });

    return { unsubscribe };
  }

  async subscribeToCategory(subscriberId: string, streamName: string, handlers: MessageHandlers, options: SubscribeToCategoryOptions): Promise<{ unsubscribe: () => void; }> {
    const { pollingInterval = 1000, retries = 1, ...remainingOptions } = options;
    let { startingPosition = 0 } = options;
  
    let position: number = await loadStreamSubscriberPosition(this.client, subscriberId, this.logger, startingPosition);
  
    let shouldUnsubscribe = false;
  
    let unsubscribe = () => {
      shouldUnsubscribe = true;
    };
  
    const poll: () => Promise<boolean> = async () => {
      const messages = await this.client.getCategoryMessages(streamName, { startingPosition: position, ...remainingOptions });
      for (const message of messages) {
        if (Object.prototype.hasOwnProperty.call(handlers, message.type)) {
          const handler = handlers[message.type];
          await handler(message, {
            logger: this.logger,
            /* @ts-ignore */
            messageStore: this,
            unsubscribe,
          } as MessageHandlerContext);
        }
        position = message.globalPosition + 1;
        await saveStreamSubscriberPosition(this.client, subscriberId, position, this.logger);
      }
  
      return true;
    };
  
    const poller = promisePoller({
      taskFn: poll,
      interval: pollingInterval,
      name: `${subscriberId} Poll to ${streamName}`,
      retries,
      shouldContinue: (_: any, resolvedValue: unknown) => {
        if (shouldUnsubscribe) return false;
        return resolvedValue ? true : false;
      },
    });
  
    // This is kinda weird check logic that needs to happen for promisePoller library on cancelled subscriptions
    poller.then().catch((e) => {
      if (e instanceof Array) {
        this.logger.log("Subscription Closed");
      } else {
        throw e;
      }
    });
  
    return { unsubscribe };
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

  async projectCategory<EntityType, MessageTypes extends Message>(categoryName: string, entityProjection: Projection<EntityType, MessageTypes>, options?: ProjectCategoryOptions): Promise<EntityType> {
    options = options ?? {};

    let entity = initializeEntity<EntityType, MessageTypes>(entityProjection);

    const messages = await this.client.getCategoryMessages(categoryName, options);
    for (const message of messages) {
      entity = doProjection<EntityType, MessageTypes>(entity, message, entityProjection);
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

  writeBatch(messageBatch: MessageBatchConfig[]): Promise<{ streamPosition: string; }[]> {
    return this.client.writeBatch(messageBatch);
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