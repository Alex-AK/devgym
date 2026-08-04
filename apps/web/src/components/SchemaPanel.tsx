import { useQuery } from '@tanstack/react-query';
import * as React from 'react';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { api, queryKeys } from '@/lib/api';

interface SchemaPanelProps {
  orderMatters: boolean;
}

/**
 * Reference material, not an object in its own right: a rule and a label you can
 * open, sitting above the answer box rather than in a card competing with it.
 */
export function SchemaPanel({ orderMatters }: SchemaPanelProps): React.ReactElement {
  const { data, error } = useQuery({
    queryKey: queryKeys.practiceSchema,
    queryFn: api.practiceSchema,
    staleTime: Infinity,
  });

  return (
    // Collapsed by default: expanded it is tall enough to push the answer box
    // below the fold, so you end up typing into a textarea you cannot see.
    <Accordion type="single" collapsible className="border-y">
      <AccordionItem value="schema" className="border-b-0">
        <AccordionTrigger className="py-2.5 text-xs font-medium tracking-wide text-muted-foreground uppercase hover:text-foreground hover:no-underline">
          <span className="flex items-center gap-2">
            Practice database schema
            {data && <span className="normal-case">· {data.tables.length} tables</span>}
          </span>
        </AccordionTrigger>
        <AccordionContent>
          <p className="mb-4 text-xs text-muted-foreground">
            Read-only bookstore data.{' '}
            {orderMatters
              ? 'Row order matters here, so mind your ORDER BY.'
              : "Row order doesn't matter for this problem."}
          </p>
          {error ? (
            <p className="text-sm text-muted-foreground">Schema unavailable.</p>
          ) : (
            <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
              {data?.tables.map((table) => (
                <div key={table.name}>
                  <div className="flex items-baseline justify-between gap-2 border-b pb-1">
                    <code className="font-mono text-xs font-semibold">{table.name}</code>
                    <span className="text-xs text-muted-foreground">{table.rowCount} rows</span>
                  </div>
                  <ul className="mt-1.5 space-y-0.5">
                    {table.columns.map((column) => (
                      <li
                        key={column.name}
                        className="flex justify-between gap-3 font-mono text-xs"
                      >
                        <span>{column.name}</span>
                        <span className="text-muted-foreground">{column.type.toLowerCase()}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
