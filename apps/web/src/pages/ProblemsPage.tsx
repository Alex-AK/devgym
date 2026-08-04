import {
  CATEGORIES,
  type Category,
  CATEGORY_LABELS,
  DIFFICULTIES,
  type Difficulty,
  PROBLEM_STATUSES,
  type ProblemStatus,
  RELEVANCE_LABELS,
  type Tag,
  TAG_LABELS,
  TAGS,
} from '@hone/shared';
import { useQuery } from '@tanstack/react-query';
import { Play, Search, X } from 'lucide-react';
import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { STATUS_LABEL, StatusBadge } from '@/components/badges';
import { FilterSelect } from '@/components/filters';
import { ErrorState, LoadingState } from '@/components/states';
import { Button } from '@/components/ui/button';
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

/**
 * A browse surface for 450 reps across 22 categories, which is why the search
 * box is the biggest control here and every axis is one select rather than a
 * row of chips: at this size the chips were a 350px wall you had to read past
 * before seeing a single problem, and a category you are looking for is faster
 * to pick from an alphabetical list than to find in three wrapped rows.
 */
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

  // The three axes a session understands, kept separate from the two that only
  // narrow the table: the button below runs this set, not what you can see.
  const inScope = data.filter(
    (problem) =>
      (category === 'all' || problem.category === category) &&
      (difficulty === 'all' || problem.difficulty === difficulty) &&
      (tag === 'all' || problem.tags.includes(tag))
  );

  const rows = inScope.filter(
    (problem) =>
      (status === 'all' || problem.status === status) &&
      (needle === '' ||
        problem.title.toLowerCase().includes(needle) ||
        problem.slug.includes(needle))
  );

  const solved = data.filter((problem) => problem.status === 'solved').length;
  const unsolvedInScope = inScope.filter((problem) => problem.status !== 'solved').length;
  const narrowed =
    category !== 'all' ||
    difficulty !== 'all' ||
    tag !== 'all' ||
    status !== 'all' ||
    needle !== '';

  const counts = new Map<Category, number>();
  for (const problem of data) {
    counts.set(problem.category, (counts.get(problem.category) ?? 0) + 1);
  }

  // Alphabetical, because at 22 you are scanning for a name. Seed order carries
  // no meaning a reader can use.
  const categoryOptions: Array<{ label: string; value: CategoryFilter }> = [
    { label: `All categories (${data.length})`, value: 'all' },
    ...CATEGORIES.filter((entry) => (counts.get(entry) ?? 0) > 0)
      .slice()
      .sort((a, b) => CATEGORY_LABELS[a].localeCompare(CATEGORY_LABELS[b]))
      .map((entry) => ({
        label: `${CATEGORY_LABELS[entry]} (${counts.get(entry) ?? 0})`,
        value: entry,
      })),
  ];

  const clear = (): void => {
    setCategory('all');
    setDifficulty('all');
    setTag('all');
    setStatus('all');
    setSearch('');
  };

  const practiceThese = (): void => {
    const params = new URLSearchParams();
    if (category !== 'all') params.set('category', category);
    if (difficulty !== 'all') params.set('difficulty', difficulty);
    if (tag !== 'all') params.set('tag', tag);
    const query = params.toString();
    navigate(`/practice${query ? `?${query}` : ''}`);
  };

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            aria-label="Search problems"
            className="h-11 w-full rounded-lg border bg-card pr-3 pl-10 text-sm shadow-sm placeholder:text-muted-foreground"
            onChange={(event) => setSearch(event.target.value)}
            placeholder={`Search ${data.length} problems by title`}
            type="search"
            value={search}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect
            label="Category"
            onChange={setCategory}
            options={categoryOptions}
            value={category}
          />
          <FilterSelect
            label="Difficulty"
            onChange={setDifficulty}
            options={[
              { label: 'Any difficulty', value: 'all' },
              ...DIFFICULTIES.map((entry) => ({ label: capitalise(entry), value: entry })),
            ]}
            value={difficulty}
          />
          {/* A tag is not a subject, so it stays its own axis rather than
              sitting among the categories it cuts across. */}
          <FilterSelect
            label="Focus"
            onChange={setTag}
            options={[
              { label: 'Any focus', value: 'all' },
              ...TAGS.map((entry) => ({ label: TAG_LABELS[entry], value: entry })),
            ]}
            value={tag}
          />
          <FilterSelect
            label="Status"
            onChange={setStatus}
            options={[
              { label: 'Any status', value: 'all' },
              ...PROBLEM_STATUSES.map((entry) => ({ label: STATUS_LABEL[entry], value: entry })),
            ]}
            value={status}
          />
          {narrowed && (
            <Button onClick={clear} size="sm" variant="ghost">
              <X />
              Clear
            </Button>
          )}
          <Button
            className="ml-auto"
            disabled={unsolvedInScope === 0}
            onClick={practiceThese}
            size="sm"
          >
            <Play />
            Practice these
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          {unsolvedInScope} unsolved in the current category, difficulty and focus. A session
          ignores the search box and the status filter.
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Showing {rows.length} of {data.length}. {solved} solved, and a solved problem can be
          re-attempted any time.
        </p>

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
                  <Link className="hover:underline" to={`/problems/${problem.slug}`}>
                    {problem.title}
                  </Link>
                </TableCell>
                {/* Difficulty and relevance never change, so they read as text.
                    Status is the one thing on this row that moves. */}
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {CATEGORY_LABELS[problem.category]}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {capitalise(problem.difficulty)}
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {RELEVANCE_LABELS[problem.relevance]}
                </TableCell>
                <TableCell>
                  {problem.status === 'unseen' ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <StatusBadge status={problem.status} />
                  )}
                </TableCell>
                <TableCell className="text-right text-muted-foreground tabular-nums">
                  {problem.attemptsCount === 0 ? '—' : problem.attemptsCount}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell className="py-10 text-center text-muted-foreground" colSpan={6}>
                  Nothing matches those filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
