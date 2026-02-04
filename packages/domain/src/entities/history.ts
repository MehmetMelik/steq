export interface HistoryEntry {
  id: string;
  request_id: string | null;
  workspace_id: string;
  method: string;
  url: string;
  request_snapshot: string;
  response_status: number | null;
  response_headers: string | null;
  response_body: string | null;
  response_size: number | null;
  duration_ms: number | null;
  error: string | null;
  executed_at: string;
}

export interface HistoryQuery {
  workspace_id: string;
  limit?: number;
  offset?: number;
}
