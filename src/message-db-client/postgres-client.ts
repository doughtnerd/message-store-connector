import { Client, PoolClient, QueryArrayResult } from "pg";
import { ISQLClient } from "./sql-client.interface";

export class PostgresClient implements ISQLClient<QueryArrayResult> {
  constructor(private client: Client | PoolClient) {}

  async query(queryString: any, variables?: any[]): Promise<QueryArrayResult> {
    const result: QueryArrayResult = await this.client.query(queryString, variables);
    return result
  }

  beginTransaction(): Promise<unknown> {
    return this.client.query('BEGIN');
  }

  commitTransaction(): Promise<unknown> {
    return this.client.query('COMMIT');
  }

  rollbackTransaction(): Promise<unknown> {
    return this.client.query('ROLLBACK');
  }

  async endTransaction(): Promise<unknown> {
    return null;
  }
}
