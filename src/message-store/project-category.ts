import { Client } from "pg";
import { getCategoryMessages } from "../message-db-client/get-category-messages";
import { getStreamVersion } from "../message-db-client/get-stream-version";
import { EntityProjection } from "../types/entity-projection.type";
import { Message } from "../types/message.type";

export type ProjectFunctionType<T> = (
  client: Client,
  categoryName: string,
  entityProjection: EntityProjection<T>,
  options?: {
    startingPosition?: number;
    batchSize?: number;
    correlation?: string;
    consumerGroupMember?: string;
    consumerGroupSize?: string;
    condition?: string;
  }
) => Promise<T>;

export async function projectCategory<T>(
  client: Client,
  categoryName: string,
  entityProjection: EntityProjection<T>,
  options?: {
    startingPosition?: number;
    batchSize?: number;
    correlation?: string;
    consumerGroupMember?: string;
    consumerGroupSize?: string;
    condition?: string;
  }
): Promise<T> {
  options = options ?? {};
  let { startingPosition = 0 } = options;

  let entity = initializeEntity<T>(entityProjection);

  // while (startingPosition <= parsedStreamVersion) {

    const messages = await getCategoryMessages(client, categoryName, options);
    for (const message of messages) {
      entity = doProjection<T>(entity, message, entityProjection);
    }

    startingPosition += messages.length;
  // }

  return entity;
}

function initializeEntity<T>(entityProjection: EntityProjection<T>): T {
  let entity = entityProjection.entity;
  if (typeof entity === "function") {
    entity = entity();
  }
  return entity;
}

function doProjection<T>(entity: T, message: Message, entityProjection: EntityProjection<T>): T {
  if (Object.prototype.hasOwnProperty.call(entityProjection.handlers, message.type)) {
    const handlerReturn = entityProjection.handlers[message.type](entity, message);
    entity = handlerReturn ? handlerReturn : entity;
  }

  return entity;
}
