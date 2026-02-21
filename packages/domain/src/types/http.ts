export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export type BodyType = 'none' | 'json' | 'text' | 'form_url_encoded' | 'multipart' | 'graphql';

export interface RequestSettings {
  timeout_ms: number;
  follow_redirects: boolean;
  max_redirects: number;
}

export const DEFAULT_REQUEST_SETTINGS: RequestSettings = {
  timeout_ms: 30000,
  follow_redirects: true,
  max_redirects: 10,
};

export type AuthType =
  | 'none'
  | 'bearer'
  | 'basic'
  | 'api_key'
  | 'oauth2'
  | 'oauth1'
  | 'digest'
  | 'aws_v4';

export type ApiKeyLocation = 'header' | 'query';

export type OAuth2GrantType = 'authorization_code' | 'client_credentials' | 'password' | 'implicit';

export type OAuth1SignatureMethod = 'HMAC-SHA1' | 'RSA-SHA1';

export interface BearerAuthConfig {
  token: string;
}

export interface BasicAuthConfig {
  username: string;
  password: string;
}

export interface ApiKeyAuthConfig {
  key: string;
  value: string;
  location: ApiKeyLocation;
}

export interface OAuth2AuthConfig {
  grant_type: OAuth2GrantType;
  access_token: string;
  token_url: string;
  auth_url: string;
  client_id: string;
  client_secret: string;
  scope: string;
  username: string;
  password: string;
  redirect_uri: string;
}

export interface OAuth1AuthConfig {
  consumer_key: string;
  consumer_secret: string;
  token: string;
  token_secret: string;
  signature_method: OAuth1SignatureMethod;
}

export interface DigestAuthConfig {
  username: string;
  password: string;
}

export interface AwsV4AuthConfig {
  access_key: string;
  secret_key: string;
  region: string;
  service: string;
}

export type AuthConfig =
  | { type: 'none' }
  | { type: 'bearer' } & BearerAuthConfig
  | { type: 'basic' } & BasicAuthConfig
  | { type: 'api_key' } & ApiKeyAuthConfig
  | { type: 'oauth2' } & OAuth2AuthConfig
  | { type: 'oauth1' } & OAuth1AuthConfig
  | { type: 'digest' } & DigestAuthConfig
  | { type: 'aws_v4' } & AwsV4AuthConfig;

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
