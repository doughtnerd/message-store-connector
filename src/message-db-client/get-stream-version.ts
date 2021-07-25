import { Client } from "pg";

export async function getStreamVersion(client: Client, streamName: string): Promise<{ stream_version: string }> {
  const query = `SELECT * FROM stream_version($1);`;

  const result = await client.query(query, [streamName]);

  return result.rows[0];
}
