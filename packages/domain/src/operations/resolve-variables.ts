import type { KeyValue, ExecuteRequestInput, AuthConfig } from '../index';

/**
 * Resolves `{{variable}}` placeholders in a string using the provided variable map.
 */
export function resolveString(
  template: string,
  variables: Map<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    return variables.has(key) ? variables.get(key)! : match;
  });
}

interface GraphQLContent {
  query: string;
  variables: string;
  operationName: string;
}

/**
 * Resolves variables in GraphQL body content (query, variables, operationName fields).
 */
function resolveGraphQLContent(
  content: string,
  variables: Map<string, string>,
): string {
  try {
    const parsed: GraphQLContent = JSON.parse(content);
    const resolved: GraphQLContent = {
      query: resolveString(parsed.query, variables),
      variables: resolveString(parsed.variables, variables),
      operationName: resolveString(parsed.operationName, variables),
    };
    return JSON.stringify(resolved);
  } catch {
    return resolveString(content, variables);
  }
}

/**
 * Resolves variables in all string fields of an AuthConfig.
 */
function resolveAuthConfig(
  config: AuthConfig,
  variables: Map<string, string>,
): AuthConfig {
  if (config.type === 'none') return config;

  // Resolve all string values in the auth config
  const resolved = { ...config } as Record<string, unknown>;
  for (const [key, value] of Object.entries(resolved)) {
    if (typeof value === 'string' && key !== 'type') {
      resolved[key] = resolveString(value, variables);
    }
  }
  return resolved as AuthConfig;
}

/**
 * Resolves variables in all fields of an ExecuteRequestInput.
 */
export function resolveRequestVariables(
  input: ExecuteRequestInput,
  variablePairs: [string, string][],
): ExecuteRequestInput {
  const variables = new Map(variablePairs);

  return {
    method: input.method,
    url: resolveString(input.url, variables),
    headers: input.headers.map((h: KeyValue) => ({
      key: resolveString(h.key, variables),
      value: resolveString(h.value, variables),
      enabled: h.enabled,
    })),
    query_params: input.query_params.map((q: KeyValue) => ({
      key: resolveString(q.key, variables),
      value: resolveString(q.value, variables),
      enabled: q.enabled,
    })),
    body_type: input.body_type,
    body_content: input.body_content
      ? input.body_type === 'graphql'
        ? resolveGraphQLContent(input.body_content, variables)
        : resolveString(input.body_content, variables)
      : input.body_content,
    auth_type: input.auth_type,
    auth_config: resolveAuthConfig(input.auth_config, variables),
    settings: input.settings,
  };
}

/**
 * Extracts all `{{variable}}` references from a string.
 */
export function extractVariableRefs(text: string): string[] {
  const matches = text.matchAll(/\{\{(\w+)\}\}/g);
  return [...matches].map((m) => m[1]);
}
