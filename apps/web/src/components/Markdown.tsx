import * as React from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { cn } from '@/lib/utils';

interface MarkdownProps {
  children: string;
  className?: string;
}

/**
 * Two things in a page refuse to fit a reading measure. A fenced block already
 * scrolls itself (`.md pre` is `overflow-x: auto`), which is what keeps the
 * wide ASCII diagrams intact. A table does not: `.md table` is `width: 100%`,
 * so a wide one squeezes its columns to nothing instead. Give it its own
 * scroller and let it be as wide as its content.
 */
const COMPONENTS: Components = {
  table: ({ node: _node, className, ...props }) => (
    <div className="overflow-x-auto">
      <table className={cn('w-auto min-w-full', className)} {...props} />
    </div>
  ),
};

export function Markdown({ children, className }: MarkdownProps): React.ReactElement {
  // `break-words` is for the long unbreakable token — a header name, a URL, a
  // path in backticks — which in a narrow column would otherwise push the
  // whole page sideways. It does nothing inside a `pre`, which cannot wrap.
  return (
    <div className={cn('md break-words', className)}>
      <ReactMarkdown components={COMPONENTS} remarkPlugins={[remarkGfm]}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
