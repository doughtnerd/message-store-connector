import { Client } from "pg";

export async function connectToMessageDB(messageStoreHost: string, messageStorePassword: string, logger: any): Promise<Client> {
  const client = new Client({
    connectionString: `postgres://postgres:${messageStorePassword}@${messageStoreHost}:5432/message_store`,
  });

  await client.connect();
  await client.query("SET search_path TO message_store");

  const successMessage = `Successfully connected to message store database: ${client.database}`;
  logger.log(successMessage);

  return client;
}
