import { cn } from '../../../lib/cn';

interface SendButtonProps {
  onClick: () => void;
  loading: boolean;
}

export function SendButton({ onClick, loading }: SendButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={cn(
        'h-10 px-6 rounded-r-lg bg-accent text-white font-semibold text-sm',
        'hover:bg-accent-hover transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-accent',
        'disabled:opacity-50 disabled:cursor-not-allowed',
      )}
    >
      {loading ? 'Sending...' : 'Send'}
    </button>
  );
}
