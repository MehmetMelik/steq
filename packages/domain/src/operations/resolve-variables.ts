import type { KeyValue, ExecuteRequestInput } from '../index';

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
      ? resolveString(input.body_content, variables)
      : input.body_content,
  };
}

/**
 * Extracts all `{{variable}}` references from a string.
 */
export function extractVariableRefs(text: string): string[] {
  const matches = text.matchAll(/\{\{(\w+)\}\}/g);
  return [...matches].map((m) => m[1]);
}
