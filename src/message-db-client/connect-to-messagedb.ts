import { Client } from "pg";

export type ConnectionConfig = {
    connectionString: string
    logger: any
}

export function createStandardConfigString(host: string, password: string, port: number = 5432): string {
    return `postgres://postgres:${password}@${host}:${port}/message_store`
}

export async function connectToMessageDB(config: ConnectionConfig): Promise<Client> {
    const client = new Client({
        connectionString: config.connectionString,
        connectionTimeoutMillis: 1000
    });

    await client.connect();
    await client.query("SET search_path TO message_store");

    const successMessage = `Successfully connected to message store database: ${client.database}`;
    config.logger.debug(successMessage);

    return client;
}
