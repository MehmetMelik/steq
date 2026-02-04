export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export type BodyType = 'none' | 'json' | 'text' | 'form_url_encoded' | 'multipart';

export interface KeyValue {
  key: string;
  value: string;
  enabled: boolean;
}

export interface RequestBody {
  body_type: BodyType;
  content: string | null;
  form_data: KeyValue[] | null;
}

export interface ExecutionTiming {
  dns_ms: number | null;
  connect_ms: number | null;
  tls_ms: number | null;
  first_byte_ms: number;
  total_ms: number;
}

export interface ExecutionResult {
  status: number;
  status_text: string;
  headers: KeyValue[];
  body: string;
  size_bytes: number;
  timing: ExecutionTiming;
  error: string | null;
}
