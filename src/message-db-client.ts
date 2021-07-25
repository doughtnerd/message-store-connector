import { Client as PGClient } from "pg";
import promisePoller from "promise-poller";
import { EntityProjection } from "./types/entity-projection.type";
import { MessageHandlerFunc } from "./types/message-handler.type";
import { MessageStoreConfig } from "./types/message-store-config.type";
import { MessageStore } from "./types/message-store.type";
import { Message } from "./types/message.type";

async function createClientConnection(
  messageStoreHost: string,
  messageStorePassword: string,
  logger: any
): Promise<PGClient> {
  const client = new PGClient({
    connectionString: `postgres://postgres:${messageStorePassword}@${messageStoreHost}:5432/message_store`,
  });

  await client.connect();
  await client.query("SET search_path TO message_store");

  const successMessage = `Successfully connected to message store database: ${client.database}`;
  logger.log(successMessage);

  return client;
}

async function writeMessage(
  client: PGClient,
  streamName: string,
  message: Pick<Message, "id" | "type" | "data" | "metadata">,
  expectedVersion?: number
): Promise<{ streamPosition: string }> {
  const { id, type, data, metadata } = message;
  const writeMessageString =
    "SELECT message_store.write_message($1, $2, $3, $4, $5, $6);";

  try {
    const { rows, rowCount } = await client.query(writeMessageString, [
      id,
      streamName,
      type,
      data,
      metadata,
      expectedVersion,
    ]);
    return { streamPosition: rows[0].write_message };
  } catch (e) {
    console.error("Failed to write message");
    throw e;
  }
}

async function getStreamMessages(
  client: PGClient,
  streamName: string,
  startingPosition?: number,
  batchSize?: number,
  condition?: string
): Promise<Message[]> {
  const getAllQuery = `SELECT id, stream_name AS "streamName", type, position, global_position AS "globalPosition", data, metadata, time FROM get_stream_messages($1, $2, $3, $4);`;

  const result = await client.query(getAllQuery, [
    streamName,
    startingPosition,
    batchSize,
    condition,
  ]);

  return result.rows;
}

async function getCategoryMessages(
  client: PGClient,
  categoryName: string,
  startingPosition: number = 0,
  batchSize?: number,
  correlation?: string,
  consumerGroupMember?: string,
  consumerGroupSize?: string,
  condition?: string
): Promise<Message[]> {
  const getAllQuery = `SELECT id, stream_name AS "streamName", type, position, global_position AS "globalPosition", data, metadata, time FROM get_category_messages($1, $2, $3, $4, $5, $6, $7);`;

  const result = await client.query(getAllQuery, [
    categoryName,
    startingPosition,
    batchSize,
    correlation,
    consumerGroupMember,
    consumerGroupSize,
    condition,
  ]);

  return result.rows;
}

async function getLastStreamMessage(
  client: PGClient,
  streamName: string
): Promise<Message[]> {
  const query = `SELECT id, stream_name AS "streamName", type, position, global_position AS "globalPosition", data, metadata, time FROM get_last_stream_message($1);`;

  const result = await client.query(query, [streamName]);

  return result.rows;
}

async function project<T>(
  client: PGClient,
  streamName: string,
  entityProjection: EntityProjection<T>
): Promise<T> {
  const messages = await getStreamMessages(
    client,
    streamName,
    0,
    1000,
    undefined
  );

  let entity = entityProjection.entity;
  if (typeof entity === "function") {
    entity = entity();
  }

  for (const message of messages) {
    if (
      Object.prototype.hasOwnProperty.call(
        entityProjection.handlers,
        message.type
      )
    ) {
      const handlerReturn = entityProjection.handlers[message.type](
        entity,
        message
      );
      entity = handlerReturn ? handlerReturn : entity;
    }
  }

  return entity;
}

async function getStreamVersion(
  client: PGClient,
  streamName: string
): Promise<{ stream_version: string }> {
  const query = `SELECT * FROM stream_version($1);`;

  const result = await client.query(query, [streamName]);

  return result.rows[0];
}

async function subscribeToStream(
  client: PGClient,
  subscriberId: string,
  streamName: string,
  handlers: {
    [key: string]: MessageHandlerFunc;
  },
  options: { pollingInterval: number; logger: any }
): Promise<void> {
  let position = 0;

  const { pollingInterval, logger } = options;

  const poll = async () => {
    const messages = await getStreamMessages(client, streamName, position);
    position += messages.length;

    for (const message of messages) {
      if (Object.prototype.hasOwnProperty.call(handlers, message.type)) {
        const handler = handlers[message.type];
        const successFullyHandled = await handler(message, {
          logger,
          /* @ts-ignore */
          messageStore: this,
        });
        logger.log(
          `Successfully handled ${message.type}: ${successFullyHandled}`
        );
      }
    }
  };

  const poller = promisePoller({
    taskFn: poll,
    interval: pollingInterval,
    name: `${subscriberId} Poll to ${streamName}`,
    retries: 2,
  });

  return poller.then();
}

export async function connect(
  config: MessageStoreConfig
): Promise<MessageStore> {
  const { messageStoreHost, messageStorePassword, logger } = config;
  const client = await createClientConnection(
    messageStoreHost,
    messageStorePassword,
    logger
  );

  const messageStore: MessageStore = {
    writeMessage: (
      streamName: string,
      message: Pick<Message, "id" | "type" | "data" | "metadata">,
      expectedVersion?: number
    ) => writeMessage.call(null, client, streamName, message, expectedVersion),
    getStreamMessages: (
      streamName: string,
      startingPosition?: number,
      batchSize?: number,
      condition?: string
    ) =>
      getStreamMessages.call(
        null,
        client,
        streamName,
        startingPosition,
        batchSize,
        condition
      ),
    getCategoryMessages: (
      categoryName: string,
      startingPosition: number,
      batchSize?: number,
      correlation?: string,
      consumerGroupMember?: string,
      consumerGroupSize?: string,
      condition?: string
    ) =>
      getCategoryMessages.call(
        null,
        client,
        categoryName,
        startingPosition,
        batchSize,
        correlation,
        consumerGroupMember,
        consumerGroupSize,
        condition
      ),
    getLastStreamMessage: (streamName: string) =>
      getLastStreamMessage.call(null, client, streamName),
    subscribeToStream: (
      subscriberId: string,
      streamName: string,
      handlers: {
        [key: string]: MessageHandlerFunc;
      },
      options: { pollingInterval: number }
    ) =>
      subscribeToStream.call(
        messageStore,
        client,
        subscriberId,
        streamName,
        handlers,
        { ...options, logger: logger }
      ),
    project: <T>(
      streamName: string,
      entityProjection: EntityProjection<T>
      // @ts-ignore
    ) => project.call(null, client, streamName, entityProjection) as Promise<T>,
    disconnect: () => client.end(),
  };
  return messageStore;
}
