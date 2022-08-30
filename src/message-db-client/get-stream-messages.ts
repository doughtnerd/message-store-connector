import { Client } from "pg";
import { Message } from "../types";

export async function getStreamMessages(
  client: Client,
  streamName: string,
  options?: {
    startingPosition?: number;
    batchSize?: number;
    condition?: string;
  }
): Promise<Message[]> {
  const getAllQuery = `SELECT id, stream_name AS "streamName", type, position::int, global_position::int AS "globalPosition", data::jsonb, metadata::jsonb, time FROM get_stream_messages($1, $2, $3, $4);`;

  options = options ?? {};
  const { startingPosition, batchSize, condition } = options;

  const result = await client.query(getAllQuery, [streamName, startingPosition, batchSize, condition]);

  return result.rows;
}
