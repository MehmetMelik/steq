import { cn } from '../../../lib/cn';
import type { ApiRequest, HttpMethod } from '@steq/domain';

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: 'text-method-get',
  POST: 'text-method-post',
  PUT: 'text-method-put',
  PATCH: 'text-method-patch',
  DELETE: 'text-method-delete',
  HEAD: 'text-method-head',
  OPTIONS: 'text-method-options',
};

interface CollectionItemProps {
  request: ApiRequest;
  onClick: (request: ApiRequest) => void;
}

export function CollectionItem({ request, onClick }: CollectionItemProps) {
  return (
    <button
      onClick={() => onClick(request)}
      className="flex items-center gap-2 w-full px-2 py-1.5 text-left text-sm
                 hover:bg-bg-hover rounded transition-colors group"
    >
      <span
        className={cn(
          'text-[10px] font-bold w-10 shrink-0 text-center',
          METHOD_COLORS[request.method],
        )}
      >
        {request.method.slice(0, 3)}
      </span>
      <span className="text-text-primary truncate">{request.name}</span>
    </button>
  );
}
