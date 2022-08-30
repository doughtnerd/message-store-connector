import { Client } from "pg";
import { getStreamMessages } from "../message-db-client/get-stream-messages";
import { getStreamVersion } from "../message-db-client/get-stream-version";
import { EntityProjection } from "../types/entity-projection.type";
import { Message } from "../types/message.type";

export type ProjectFunctionType<T> = (
  client: Client,
  streamName: string,
  entityProjection: EntityProjection<T, unknown, any>,
  options?: {
    startingPosition?: number;
    batchSize?: number;
    condition?: string;
  }
) => Promise<T>;

export async function project<T>(
  client: Client,
  streamName: string,
  entityProjection: EntityProjection<T, unknown, any>,
  options?: {
    startingPosition?: number;
    batchSize?: number;
    condition?: string;
  }
): Promise<T> {
  options = options ?? {};
  let { startingPosition = 0 } = options;
  const { batchSize, condition } = options;

  let entity = initializeEntity<T>(entityProjection);

  const latestStreamVersion = await getStreamVersion(client, streamName);

  if (latestStreamVersion.streamVersion === null) {
    return entity;
  }

  const parsedStreamVersion = latestStreamVersion.streamVersion;

  while (startingPosition <= parsedStreamVersion) {
    const messages = await getStreamMessages(client, streamName, { startingPosition, batchSize, condition });
    for (const message of messages) {
      entity = doProjection<T>(entity, message, entityProjection);
    }

    startingPosition += messages.length;
  }

  return entity;
}

function initializeEntity<T>(entityProjection: EntityProjection<T, unknown, any>): T {
  let entity = entityProjection.entity;
  if (typeof entity === "function") {
    entity = entity();
  }
  return entity;
}

function doProjection<T>(entity: T, message: Message, entityProjection: EntityProjection<T, unknown, any>): T {
  if (Object.prototype.hasOwnProperty.call(entityProjection.handlers, message.type)) {
    const handlers = entityProjection.handlers
    const handler = handlers[message.type]
    const handlerReturn = handler?.(entity, message);
    entity = handlerReturn ? handlerReturn : entity;
  }

  return entity;
}
