import { Client } from "pg";

export async function getStreamVersion(client: Client, streamName: string): Promise<{ streamVersion: number | null }> {
  const query = `SELECT stream_version::int AS "streamVersion" FROM stream_version($1);`;

  const result = await client.query(query, [streamName]);

  return result.rows[0];
}
