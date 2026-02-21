import { cn } from '../../../lib/cn';
import type {
  AuthType,
  AuthConfig,
  BearerAuthConfig,
  BasicAuthConfig,
  ApiKeyAuthConfig,
  ApiKeyLocation,
  OAuth2AuthConfig,
  OAuth2GrantType,
  OAuth1AuthConfig,
  OAuth1SignatureMethod,
  DigestAuthConfig,
  AwsV4AuthConfig,
} from '@steq/domain';

const AUTH_TYPES: { label: string; value: AuthType }[] = [
  { label: 'No Auth', value: 'none' },
  { label: 'Bearer Token', value: 'bearer' },
  { label: 'Basic Auth', value: 'basic' },
  { label: 'API Key', value: 'api_key' },
  { label: 'OAuth 2.0', value: 'oauth2' },
  { label: 'OAuth 1.0', value: 'oauth1' },
  { label: 'Digest Auth', value: 'digest' },
  { label: 'AWS Sig v4', value: 'aws_v4' },
];

function defaultConfigForType(authType: AuthType): AuthConfig {
  switch (authType) {
    case 'none':
      return { type: 'none' };
    case 'bearer':
      return { type: 'bearer', token: '' };
    case 'basic':
      return { type: 'basic', username: '', password: '' };
    case 'api_key':
      return { type: 'api_key', key: '', value: '', location: 'header' };
    case 'oauth2':
      return {
        type: 'oauth2',
        grant_type: 'authorization_code',
        access_token: '',
        token_url: '',
        auth_url: '',
        client_id: '',
        client_secret: '',
        scope: '',
        username: '',
        password: '',
        redirect_uri: '',
      };
    case 'oauth1':
      return {
        type: 'oauth1',
        consumer_key: '',
        consumer_secret: '',
        token: '',
        token_secret: '',
        signature_method: 'HMAC-SHA1',
      };
    case 'digest':
      return { type: 'digest', username: '', password: '' };
    case 'aws_v4':
      return { type: 'aws_v4', access_key: '', secret_key: '', region: '', service: '' };
  }
}

interface AuthEditorProps {
  authType: AuthType;
  authConfig: AuthConfig;
  onTypeChange: (type: AuthType, config: AuthConfig) => void;
  onConfigChange: (config: AuthConfig) => void;
}

const inputClass =
  'w-full px-3 py-1.5 bg-bg-secondary border border-border rounded text-sm text-text-primary placeholder:text-text-muted font-mono focus:outline-none focus:ring-1 focus:ring-accent';

const labelClass = 'text-xs text-text-secondary font-medium';

function AuthField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="space-y-1">
      <label className={labelClass}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputClass}
      />
    </div>
  );
}

function BearerEditor({
  config,
  onChange,
}: {
  config: BearerAuthConfig & { type: 'bearer' };
  onChange: (config: AuthConfig) => void;
}) {
  return (
    <AuthField
      label="Token"
      value={config.token}
      onChange={(token) => onChange({ ...config, token })}
      placeholder="Enter bearer token"
    />
  );
}

function BasicEditor({
  config,
  onChange,
}: {
  config: BasicAuthConfig & { type: 'basic' };
  onChange: (config: AuthConfig) => void;
}) {
  return (
    <div className="space-y-3">
      <AuthField
        label="Username"
        value={config.username}
        onChange={(username) => onChange({ ...config, username })}
        placeholder="Username"
      />
      <AuthField
        label="Password"
        value={config.password}
        onChange={(password) => onChange({ ...config, password })}
        placeholder="Password"
        type="password"
      />
    </div>
  );
}

function ApiKeyEditor({
  config,
  onChange,
}: {
  config: ApiKeyAuthConfig & { type: 'api_key' };
  onChange: (config: AuthConfig) => void;
}) {
  return (
    <div className="space-y-3">
      <AuthField
        label="Key"
        value={config.key}
        onChange={(key) => onChange({ ...config, key })}
        placeholder="X-API-Key"
      />
      <AuthField
        label="Value"
        value={config.value}
        onChange={(value) => onChange({ ...config, value })}
        placeholder="api-key-value"
      />
      <div className="space-y-1">
        <label className={labelClass}>Add to</label>
        <select
          value={config.location}
          onChange={(e) =>
            onChange({ ...config, location: e.target.value as ApiKeyLocation })
          }
          className={inputClass}
        >
          <option value="header">Header</option>
          <option value="query">Query Param</option>
        </select>
      </div>
    </div>
  );
}

function OAuth2Editor({
  config,
  onChange,
}: {
  config: OAuth2AuthConfig & { type: 'oauth2' };
  onChange: (config: AuthConfig) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className={labelClass}>Grant Type</label>
        <select
          value={config.grant_type}
          onChange={(e) =>
            onChange({ ...config, grant_type: e.target.value as OAuth2GrantType })
          }
          className={inputClass}
        >
          <option value="authorization_code">Authorization Code</option>
          <option value="client_credentials">Client Credentials</option>
          <option value="password">Password</option>
          <option value="implicit">Implicit</option>
        </select>
      </div>
      <AuthField
        label="Access Token"
        value={config.access_token}
        onChange={(access_token) => onChange({ ...config, access_token })}
        placeholder="Paste or obtain token"
      />
      <AuthField
        label="Token URL"
        value={config.token_url}
        onChange={(token_url) => onChange({ ...config, token_url })}
        placeholder="https://auth.example.com/oauth/token"
      />
      {(config.grant_type === 'authorization_code' || config.grant_type === 'implicit') && (
        <AuthField
          label="Auth URL"
          value={config.auth_url}
          onChange={(auth_url) => onChange({ ...config, auth_url })}
          placeholder="https://auth.example.com/oauth/authorize"
        />
      )}
      <AuthField
        label="Client ID"
        value={config.client_id}
        onChange={(client_id) => onChange({ ...config, client_id })}
        placeholder="client-id"
      />
      {config.grant_type !== 'implicit' && (
        <AuthField
          label="Client Secret"
          value={config.client_secret}
          onChange={(client_secret) => onChange({ ...config, client_secret })}
          placeholder="client-secret"
          type="password"
        />
      )}
      <AuthField
        label="Scope"
        value={config.scope}
        onChange={(scope) => onChange({ ...config, scope })}
        placeholder="read write"
      />
      {config.grant_type === 'password' && (
        <>
          <AuthField
            label="Username"
            value={config.username}
            onChange={(username) => onChange({ ...config, username })}
            placeholder="Username"
          />
          <AuthField
            label="Password"
            value={config.password}
            onChange={(password) => onChange({ ...config, password })}
            placeholder="Password"
            type="password"
          />
        </>
      )}
      {(config.grant_type === 'authorization_code' || config.grant_type === 'implicit') && (
        <AuthField
          label="Redirect URI"
          value={config.redirect_uri}
          onChange={(redirect_uri) => onChange({ ...config, redirect_uri })}
          placeholder="https://localhost/callback"
        />
      )}
    </div>
  );
}

function OAuth1Editor({
  config,
  onChange,
}: {
  config: OAuth1AuthConfig & { type: 'oauth1' };
  onChange: (config: AuthConfig) => void;
}) {
  return (
    <div className="space-y-3">
      <AuthField
        label="Consumer Key"
        value={config.consumer_key}
        onChange={(consumer_key) => onChange({ ...config, consumer_key })}
        placeholder="Consumer key"
      />
      <AuthField
        label="Consumer Secret"
        value={config.consumer_secret}
        onChange={(consumer_secret) => onChange({ ...config, consumer_secret })}
        placeholder="Consumer secret"
        type="password"
      />
      <AuthField
        label="Token"
        value={config.token}
        onChange={(token) => onChange({ ...config, token })}
        placeholder="Access token"
      />
      <AuthField
        label="Token Secret"
        value={config.token_secret}
        onChange={(token_secret) => onChange({ ...config, token_secret })}
        placeholder="Token secret"
        type="password"
      />
      <div className="space-y-1">
        <label className={labelClass}>Signature Method</label>
        <select
          value={config.signature_method}
          onChange={(e) =>
            onChange({
              ...config,
              signature_method: e.target.value as OAuth1SignatureMethod,
            })
          }
          className={inputClass}
        >
          <option value="HMAC-SHA1">HMAC-SHA1</option>
          <option value="RSA-SHA1">RSA-SHA1</option>
        </select>
      </div>
    </div>
  );
}

function DigestEditor({
  config,
  onChange,
}: {
  config: DigestAuthConfig & { type: 'digest' };
  onChange: (config: AuthConfig) => void;
}) {
  return (
    <div className="space-y-3">
      <AuthField
        label="Username"
        value={config.username}
        onChange={(username) => onChange({ ...config, username })}
        placeholder="Username"
      />
      <AuthField
        label="Password"
        value={config.password}
        onChange={(password) => onChange({ ...config, password })}
        placeholder="Password"
        type="password"
      />
    </div>
  );
}

function AwsV4Editor({
  config,
  onChange,
}: {
  config: AwsV4AuthConfig & { type: 'aws_v4' };
  onChange: (config: AuthConfig) => void;
}) {
  return (
    <div className="space-y-3">
      <AuthField
        label="Access Key"
        value={config.access_key}
        onChange={(access_key) => onChange({ ...config, access_key })}
        placeholder="AKIAIOSFODNN7EXAMPLE"
      />
      <AuthField
        label="Secret Key"
        value={config.secret_key}
        onChange={(secret_key) => onChange({ ...config, secret_key })}
        placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
        type="password"
      />
      <AuthField
        label="Region"
        value={config.region}
        onChange={(region) => onChange({ ...config, region })}
        placeholder="us-east-1"
      />
      <AuthField
        label="Service"
        value={config.service}
        onChange={(service) => onChange({ ...config, service })}
        placeholder="execute-api"
      />
    </div>
  );
}

export function AuthEditor({
  authType,
  authConfig,
  onTypeChange,
  onConfigChange,
}: AuthEditorProps) {
  return (
    <div>
      <div className="text-xs font-medium text-text-secondary mb-2 uppercase tracking-wider">
        Authorization
      </div>
      <div className="flex gap-1 mb-4 flex-wrap">
        {AUTH_TYPES.map((at) => (
          <button
            key={at.value}
            onClick={() => onTypeChange(at.value, defaultConfigForType(at.value))}
            className={cn(
              'px-3 py-1 text-xs rounded transition-colors',
              authType === at.value
                ? 'bg-accent text-white'
                : 'bg-bg-secondary text-text-secondary hover:bg-bg-hover',
            )}
          >
            {at.label}
          </button>
        ))}
      </div>
      <div className="max-w-md">
        {authConfig.type === 'bearer' && (
          <BearerEditor config={authConfig} onChange={onConfigChange} />
        )}
        {authConfig.type === 'basic' && (
          <BasicEditor config={authConfig} onChange={onConfigChange} />
        )}
        {authConfig.type === 'api_key' && (
          <ApiKeyEditor config={authConfig} onChange={onConfigChange} />
        )}
        {authConfig.type === 'oauth2' && (
          <OAuth2Editor config={authConfig} onChange={onConfigChange} />
        )}
        {authConfig.type === 'oauth1' && (
          <OAuth1Editor config={authConfig} onChange={onConfigChange} />
        )}
        {authConfig.type === 'digest' && (
          <DigestEditor config={authConfig} onChange={onConfigChange} />
        )}
        {authConfig.type === 'aws_v4' && (
          <AwsV4Editor config={authConfig} onChange={onConfigChange} />
        )}
        {authConfig.type === 'none' && (
          <p className="text-sm text-text-muted">
            This request does not use any authorization.
          </p>
        )}
      </div>
    </div>
  );
}
