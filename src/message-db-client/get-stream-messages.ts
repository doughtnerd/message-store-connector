import { Client } from "pg";
import { Message } from "../types/message.type";

export async function getStreamMessages(
  client: Client,
  streamName: string,
  startingPosition?: number,
  batchSize?: number,
  condition?: string
): Promise<Message[]> {
  const getAllQuery = `SELECT id, stream_name AS "streamName", type, position, global_position AS "globalPosition", data, metadata, time FROM get_stream_messages($1, $2, $3, $4);`;

  const result = await client.query(getAllQuery, [streamName, startingPosition, batchSize, condition]);

  return result.rows;
}
