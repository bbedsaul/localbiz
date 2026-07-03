import Link from 'next/link';
import { cn } from '@/lib/cn';
import { BoardMark } from './BoardMark';

/**
 * LocalMarket lockup: the signboard mark + two-tone wordmark
 * ("Local" green / "Market" brick) in the display face.
 */
export function Logo({
  href = '/',
  showWordmark = true,
  className,
}: {
  href?: string;
  showWordmark?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-label="LocalMarket home"
      className={cn('inline-flex items-center gap-2.5', className)}
    >
      <BoardMark size={38} />
      {showWordmark && (
        <span className="font-display text-xl font-bold leading-none tracking-[-0.01em]">
          <span className="text-green-900">Local</span>
          <span className="text-brick-600">Market</span>
        </span>
      )}
    </Link>
  );
}
