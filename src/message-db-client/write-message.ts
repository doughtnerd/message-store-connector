import { Client } from "pg";
import { Message } from "../types";
import {Serializeable} from "../types/serializeable.type";

export async function writeMessage<T extends Serializeable = {}, K extends string = string>(
  client: Client,
  streamName: string,
  message: Pick<Message<T, K>, "id" | "type" | "data" | "metadata">,
  expectedVersion?: number
): Promise<{ streamPosition: string }> {
  const { id, type, data, metadata } = message;
  const writeMessageString = "SELECT write_message($1, $2, $3, $4, $5, $6);";

  try {
    const { rows } = await client.query(writeMessageString, [id, streamName, type, data, metadata, expectedVersion]);
    return { streamPosition: rows[0].write_message };
  } catch (e) {
    console.error("Failed to write message");
    throw e;
  }
}
