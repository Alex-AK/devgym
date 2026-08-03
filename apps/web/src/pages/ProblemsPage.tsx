import {
  CATEGORIES,
  type Category,
  CATEGORY_LABELS,
  DIFFICULTIES,
  type Difficulty,
  PROBLEM_STATUSES,
  type ProblemStatus,
  type Tag,
  TAG_LABELS,
  TAGS,
} from '@hone/shared';
import { useQuery } from '@tanstack/react-query';
import { Play, Search } from 'lucide-react';
import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { DifficultyBadge, RelevanceBadge, STATUS_LABEL, StatusBadge } from '@/components/badges';
import { FilterChip, FilterRow } from '@/components/filters';
import { ErrorState, LoadingState } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { api, queryKeys } from '@/lib/api';

type CategoryFilter = Category | 'all';
type StatusFilter = ProblemStatus | 'all';
type DifficultyFilter = Difficulty | 'all';
type TagFilter = Tag | 'all';

export function ProblemsPage(): React.ReactElement {
  const navigate = useNavigate();
  const [category, setCategory] = React.useState<CategoryFilter>('all');
  const [status, setStatus] = React.useState<StatusFilter>('all');
  const [difficulty, setDifficulty] = React.useState<DifficultyFilter>('all');
  const [tag, setTag] = React.useState<TagFilter>('all');
  const [search, setSearch] = React.useState('');

  const { data, isPending, error } = useQuery({
    queryKey: queryKeys.problems,
    queryFn: api.problems,
  });

  if (isPending) return <LoadingState label="Loading problems…" />;
  if (error) return <ErrorState error={error} />;

  const needle = search.trim().toLowerCase();
  const rows = data.filter(
    (problem) =>
      (category === 'all' || problem.category === category) &&
      (status === 'all' || problem.status === status) &&
      (difficulty === 'all' || problem.difficulty === difficulty) &&
      (tag === 'all' || problem.tags.includes(tag)) &&
      (needle === '' ||
        problem.title.toLowerCase().includes(needle) ||
        problem.slug.includes(needle))
  );

  const solved = data.filter((problem) => problem.status === 'solved').length;
  const unsolvedInView = rows.filter((problem) => problem.status !== 'solved').length;

  const practiceThese = (): void => {
    const params = new URLSearchParams();
    if (category !== 'all') params.set('category', category);
    if (difficulty !== 'all') params.set('difficulty', difficulty);
    if (tag !== 'all') params.set('tag', tag);
    const query = params.toString();
    navigate(`/practice${query ? `?${query}` : ''}`);
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        {solved} of {data.length} solved. Solved problems can be re-attempted any time.
      </p>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search problems…"
              className="h-9 w-full rounded-md border bg-card pr-3 pl-9 text-sm shadow-sm placeholder:text-muted-foreground"
            />
          </div>

          <FilterRow label="Category">
            <FilterChip active={category === 'all'} onClick={() => setCategory('all')}>
              All
            </FilterChip>
            {CATEGORIES.map((entry) => (
              <FilterChip
                key={entry}
                active={category === entry}
                onClick={() => setCategory(entry)}
              >
                {CATEGORY_LABELS[entry]}
              </FilterChip>
            ))}
          </FilterRow>

          <FilterRow label="Difficulty">
            <FilterChip active={difficulty === 'all'} onClick={() => setDifficulty('all')}>
              Any
            </FilterChip>
            {DIFFICULTIES.map((entry) => (
              <FilterChip
                key={entry}
                active={difficulty === entry}
                onClick={() => setDifficulty(entry)}
              >
                <span className="capitalize">{entry}</span>
              </FilterChip>
            ))}
          </FilterRow>

          {/* A tag is not a subject, so it gets its own row rather than sitting
              among the categories it cuts across. */}
          <FilterRow label="Focus">
            <FilterChip active={tag === 'all'} onClick={() => setTag('all')}>
              Any
            </FilterChip>
            {TAGS.map((entry) => (
              <FilterChip key={entry} active={tag === entry} onClick={() => setTag(entry)}>
                {TAG_LABELS[entry]}
              </FilterChip>
            ))}
          </FilterRow>

          <FilterRow label="Status">
            <FilterChip active={status === 'all'} onClick={() => setStatus('all')}>
              Any
            </FilterChip>
            {PROBLEM_STATUSES.map((entry) => (
              <FilterChip key={entry} active={status === entry} onClick={() => setStatus(entry)}>
                {STATUS_LABEL[entry]}
              </FilterChip>
            ))}
          </FilterRow>

          <div className="flex items-center gap-3 pt-1">
            <Button size="sm" onClick={practiceThese} disabled={unsolvedInView === 0}>
              <Play />
              Practice these
            </Button>
            <span className="text-xs text-muted-foreground">
              {unsolvedInView} unsolved in the current category, difficulty and focus filter.
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Problem</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Difficulty</TableHead>
                <TableHead>Relevance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Attempts</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((problem) => (
                <TableRow key={problem.slug}>
                  <TableCell className="font-medium">
                    <Link to={`/problems/${problem.slug}`} className="hover:underline">
                      {problem.title}
                    </Link>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {CATEGORY_LABELS[problem.category]}
                  </TableCell>
                  <TableCell>
                    <DifficultyBadge difficulty={problem.difficulty} />
                  </TableCell>
                  <TableCell>
                    <RelevanceBadge relevance={problem.relevance} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={problem.status} />
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">
                    {problem.attemptsCount}
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No problems match those filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Showing {rows.length} of {data.length}.
      </p>
    </div>
  );
}
