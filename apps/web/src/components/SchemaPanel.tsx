import { useQuery } from '@tanstack/react-query';
import { Database } from 'lucide-react';
import * as React from 'react';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card } from '@/components/ui/card';
import { api, queryKeys } from '@/lib/api';

interface SchemaPanelProps {
  orderMatters: boolean;
}

export function SchemaPanel({ orderMatters }: SchemaPanelProps): React.ReactElement {
  const { data, error } = useQuery({
    queryKey: queryKeys.practiceSchema,
    queryFn: api.practiceSchema,
    staleTime: Infinity,
  });

  return (
    <Card className="px-4">
      {/* Collapsed by default: expanded it is tall enough to push the answer box
          below the fold, so you end up typing into a textarea you cannot see. */}
      <Accordion type="single" collapsible>
        <AccordionItem value="schema">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center gap-2">
              <Database className="size-4 text-muted-foreground" />
              Practice database schema
              {data && (
                <span className="text-xs font-normal text-muted-foreground">
                  {data.tables.length} tables
                </span>
              )}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <p className="mb-3 text-xs text-muted-foreground">
              Read-only bookstore data.{' '}
              {orderMatters
                ? 'Row order matters here, so mind your ORDER BY.'
                : "Row order doesn't matter for this problem."}
            </p>
            {error ? (
              <p className="text-sm text-muted-foreground">Schema unavailable.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {data?.tables.map((table) => (
                  <div key={table.name} className="rounded-md border bg-muted/40 p-3">
                    <div className="flex items-baseline justify-between">
                      <code className="font-mono text-sm font-semibold">{table.name}</code>
                      <span className="text-xs text-muted-foreground">{table.rowCount} rows</span>
                    </div>
                    <ul className="mt-2 space-y-0.5">
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
    </Card>
  );
}
