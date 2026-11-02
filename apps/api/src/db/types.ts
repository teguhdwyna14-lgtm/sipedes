// =====================================================
// Database Types
// =====================================================

export interface QueryResult {
  insertId?: number;
  affectedRows?: number;
  fieldCount?: number;
  info?: string;
  serverStatus?: number;
  warningStatus?: number;
  changedRows?: number;
}

export type QueryParams = Array<string | number | boolean | null | Buffer | Date | undefined>;

export interface DbAdapter {
  client: 'mysql' | 'sqlite';
  query<T = QueryResult>(sql: string, params?: QueryParams): Promise<T[]>;
  execute<T = QueryResult>(sql: string, params?: QueryParams): Promise<T>;
  close(): Promise<void>;
}
