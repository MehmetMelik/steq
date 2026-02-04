import type { HttpMethod, KeyValue, BodyType } from '../types/http';

export interface ApiRequest {
  id: string;
  name: string;
  method: HttpMethod;
  url: string;
  headers: KeyValue[];
  query_params: KeyValue[];
  body_type: BodyType;
  body_content: string | null;
  collection_id: string | null;
  folder_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateRequestInput {
  name: string;
  method: HttpMethod;
  url: string;
  headers: KeyValue[];
  query_params: KeyValue[];
  body_type: BodyType;
  body_content: string | null;
  collection_id: string | null;
  folder_id: string | null;
}

export interface UpdateRequestInput {
  id: string;
  name?: string;
  method?: HttpMethod;
  url?: string;
  headers?: KeyValue[];
  query_params?: KeyValue[];
  body_type?: BodyType;
  body_content?: string | null;
  collection_id?: string | null;
  folder_id?: string | null;
  sort_order?: number;
}

export interface ExecuteRequestInput {
  method: HttpMethod;
  url: string;
  headers: KeyValue[];
  query_params: KeyValue[];
  body_type: BodyType;
  body_content: string | null;
}
