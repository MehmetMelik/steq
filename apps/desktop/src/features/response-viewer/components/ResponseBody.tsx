import { useMemo } from 'react';

interface ResponseBodyProps {
  body: string;
  contentType?: string;
}

export function ResponseBody({ body, contentType }: ResponseBodyProps) {
  const formatted = useMemo(() => {
    if (!body) return '';
    const isJson = contentType?.includes('json') || body.trimStart().startsWith('{') || body.trimStart().startsWith('[');
    if (isJson) {
      try {
        return JSON.stringify(JSON.parse(body), null, 2);
      } catch {
        return body;
      }
    }
    return body;
  }, [body, contentType]);

  return (
    <pre className="p-3 text-sm font-mono text-text-primary whitespace-pre-wrap break-words overflow-auto max-h-full">
      {formatted || <span className="text-text-muted italic">No response body</span>}
    </pre>
  );
}
