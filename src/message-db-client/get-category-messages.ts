import { Client } from "pg";
import { Message } from "../types/message.type";

export async function getCategoryMessages(
  client: Client,
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
