import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { EmptyState as UnifiedEmptyState } from '@/components/ui/empty-state';

type EmptyStateProps = {
  message: string;
  actionHref?: string;
  actionLabel?: string;
};

/**
 * @deprecated Use EmptyState from @/components/ui/empty-state with title/action props
 */
export function EmptyState({ message, actionHref, actionLabel }: EmptyStateProps) {
  return (
    <UnifiedEmptyState
      title={message}
      variant="compact"
      action={
        actionHref && actionLabel ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        ) : undefined
      }
    />
  );
}
