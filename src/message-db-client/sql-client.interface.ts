import { Serializeable } from "../types/serializeable.type";

export interface ISQLClient<QueryResultType = unknown> {
  query(queryString: string): Promise<QueryResultType>;

  query<ResultType extends QueryResultType = QueryResultType>(
    queryString: string,
    variables?: Array<Serializeable | undefined>
  ): Promise<ResultType>;

  beginTransaction(): Promise<unknown>;

  commitTransaction(): Promise<unknown>;

  rollbackTransaction(): Promise<unknown>;

  endTransaction(): Promise<unknown>;
}
