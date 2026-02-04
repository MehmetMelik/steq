import type { KeyValue } from '@apiary/domain';

interface ResponseHeadersProps {
  headers: KeyValue[];
}

export function ResponseHeaders({ headers }: ResponseHeadersProps) {
  if (headers.length === 0) {
    return <div className="p-3 text-sm text-text-muted italic">No response headers</div>;
  }

  return (
    <div className="p-3">
      <table className="w-full text-sm">
        <tbody>
          {headers.map((header, index) => (
            <tr key={index} className="border-b border-border last:border-0">
              <td className="py-1.5 pr-4 font-mono text-text-secondary font-medium whitespace-nowrap">
                {header.key}
              </td>
              <td className="py-1.5 font-mono text-text-primary break-all">{header.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
