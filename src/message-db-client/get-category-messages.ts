import { Client } from "pg";
import { Message } from "../types/message.type";

/**
 * Retrieve messages from a category of streams, optionally specifying the starting position, the number of messages to retrieve, the correlation category for Pub/Sub, consumer group parameters, and an additional condition that will be appended to the SQL command's WHERE clause.
 *
 * See {@link http://docs.eventide-project.org/user-guide/message-db/server-functions.html#get-messages-from-a-category Get Messages from a category}
 */
export async function getCategoryMessages(
  client: Client,
  categoryName: string,
  options?: {
    startingPosition?: number;
    batchSize?: number;
    correlation?: string;
    consumerGroupMember?: string;
    consumerGroupSize?: string;
    condition?: string;
  }
): Promise<Message[]> {
  const getAllQuery = `SELECT id, stream_name AS "streamName", type, position::int, global_position::int AS "globalPosition", data::jsonb, metadata::jsonb, time FROM get_category_messages($1, $2, $3, $4, $5, $6, $7);`;

  options = options ?? {};
  const { startingPosition, batchSize, correlation, consumerGroupMember, consumerGroupSize, condition } = options;

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
