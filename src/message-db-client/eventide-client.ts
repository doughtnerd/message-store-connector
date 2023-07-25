import {Message, MinimalWritableMessage} from "../types";
import {IMessageDBClient} from "./message-db-client.interface";
import {ISQLClient} from "./sql-client.interface";

export class EventideClient implements IMessageDBClient {

  constructor(private client: ISQLClient<{ rows: unknown[] }>) {}
 
  async getStreamVersion(streamName: string): Promise<{streamVersion: number | null}> {
    const query = `SELECT stream_version::int AS "streamVersion" FROM stream_version($1);`;

    const result = await this.client.query<{ rows:{ streamVersion: number }[] }>(query, [streamName]);

    return result.rows[0];
  }

  async getLastStreamMessage(streamName: string): Promise<Message[]> {
    const query = `SELECT id, stream_name AS "streamName", type, position::int, global_position::int AS "globalPosition", data::jsonb, metadata::jsonb, time FROM get_last_stream_message($1);`;

    const result = await this.client.query<{ rows: Message[] }>(query, [streamName]);

    return result.rows;
  }

  async getCategoryMessages(categoryName: string, options?: {startingPosition?: number | undefined; batchSize?: number | undefined; correlation?: string | undefined; consumerGroupMember?: string | undefined; consumerGroupSize?: string | undefined; condition?: string | undefined;}): Promise<Message<{}, string>[]> {
    const getAllQuery = `SELECT id, stream_name AS "streamName", type, position::int, global_position::int AS "globalPosition", data::jsonb, metadata::jsonb, time FROM get_category_messages($1, $2, $3, $4, $5, $6, $7);`;

    options = options ?? {};
    const { startingPosition, batchSize, correlation, consumerGroupMember, consumerGroupSize, condition } = options;

    const result = await this.client.query<{ rows: Message[] }>(getAllQuery, [
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

  async getStreamMessages(streamName: string, options?: {startingPosition?: number | undefined; batchSize?: number | undefined; condition?: string | undefined;}): Promise<Message<{}, string>[]> {
    const getAllQuery = `SELECT id, stream_name AS "streamName", type, position::int, global_position::int AS "globalPosition", data::jsonb, metadata::jsonb, time FROM get_stream_messages($1, $2, $3, $4);`;

    options = options ?? {};
    const { startingPosition, batchSize, condition } = options;

    const result = await this.client.query<{ rows: Message[] }>(getAllQuery, [streamName, startingPosition, batchSize, condition]);

    return result.rows;
  }

  async writeMessage<T extends Message>(streamName: string, message: T | MinimalWritableMessage<T>, expectedVersion?: number): Promise<{streamPosition: string;}> {
    const { id, type, data, metadata } = message;
    const writeMessageString = "SELECT write_message($1, $2, $3, $4, $5, $6);";

    const { rows } = await this.client.query<{ rows: { write_message: string }[] }>(writeMessageString, [id, streamName, type, data, metadata, expectedVersion]);
    return { streamPosition: rows[0].write_message };
  }

  async writeBatch(streamName: string, messageBatch: MinimalWritableMessage<Message>[], expectedVersion?: number | undefined): Promise<{streamPosition: string;}[]> {
    try {
      await this.client.beginTransaction();
      const results = await Promise.all(
        messageBatch.map((b, i) => this.writeMessage(streamName, b, expectedVersion ? expectedVersion + i : undefined))
      );

      await this.client.commitTransaction();

      return results;
    } catch (err) {
      await this.client.rollbackTransaction();
      throw err;
    } finally {
      await this.client.endTransaction();
    }
  }

}
