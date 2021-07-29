import { Client } from "pg";
import { Message } from "../types/message.type";

export async function getLastStreamMessage(client: Client, streamName: string): Promise<Message[]> {
  const query = `SELECT id, stream_name AS "streamName", type, position::int, global_position::int AS "globalPosition", data::jsonb, metadata::jsonb, time FROM get_last_stream_message($1);`;

  const result = await client.query(query, [streamName]);

  return result.rows;
}
