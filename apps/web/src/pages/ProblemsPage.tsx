import {
  CATEGORIES,
  type Category,
  CATEGORY_LABELS,
  DIFFICULTIES,
  type Difficulty,
  inScope,
  PROBLEM_STATUSES,
  type ProblemStatus,
  type ProblemSummary,
  RELEVANCE_LABELS,
  RELEVANCES,
  type Tag,
  TAG_LABELS,
  TAGS,
} from '@hone/shared';
import { useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ChevronsUpDown, Play, Search, X } from 'lucide-react';
import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { STATUS_LABEL, StatusBadge } from '@/components/badges';
import { FilterMultiSelect, FilterSelect } from '@/components/filters';
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
import { cn } from '@/lib/utils';

type StatusFilter = ProblemStatus | 'all';
type TagFilter = Tag | 'all';

type SortColumn = 'title' | 'category' | 'difficulty' | 'relevance' | 'status' | 'attempts';
type SortDirection = 'asc' | 'desc';
interface Sort {
  column: SortColumn;
  direction: SortDirection;
}

/**
 * A browse surface for 450 reps across 22 categories, which is why the search
 * box is the biggest control here and every axis is one collapsed control rather
 * than a row of chips: at this size the chips were a 350px wall you had to read
 * past before seeing a single problem, and a category you are looking for is
 * faster to pick from an alphabetical list than to find in three wrapped rows.
 *
 * Category and difficulty take several values, because the question is usually
 * "SQL and query params" rather than one subject. Status and focus stay single:
 * one is a lifecycle you are either in or not, and there is one tag.
 */
export function ProblemsPage(): React.ReactElement {
  const navigate = useNavigate();
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [status, setStatus] = React.useState<StatusFilter>('all');
  const [difficulties, setDifficulties] = React.useState<Difficulty[]>([]);
  const [tag, setTag] = React.useState<TagFilter>('all');
  const [search, setSearch] = React.useState('');
  const [sort, setSort] = React.useState<Sort | null>(null);

  const { data, isPending, error } = useQuery({
    queryKey: queryKeys.problems,
    queryFn: api.problems,
  });

  if (isPending) return <LoadingState label="Loading problems…" />;
  if (error) return <ErrorState error={error} />;

  const needle = search.trim().toLowerCase();

  // The three axes a session understands, kept separate from the two that only
  // narrow the table: the button below runs this set, not what you can see.
  const scoped = data.filter(
    (problem) =>
      inScope(categories, problem.category) &&
      inScope(difficulties, problem.difficulty) &&
      (tag === 'all' || problem.tags.includes(tag))
  );

  const rows = scoped
    .filter(
      (problem) =>
        (status === 'all' || problem.status === status) &&
        (needle === '' ||
          problem.title.toLowerCase().includes(needle) ||
          problem.slug.includes(needle))
    )
    .sort(comparator(sort));

  const solved = data.filter((problem) => problem.status === 'solved').length;
  const unsolvedInScope = scoped.filter((problem) => problem.status !== 'solved').length;
  const narrowed =
    categories.length > 0 ||
    difficulties.length > 0 ||
    tag !== 'all' ||
    status !== 'all' ||
    needle !== '' ||
    sort !== null;

  const counts = new Map<Category, number>();
  for (const problem of data) {
    counts.set(problem.category, (counts.get(problem.category) ?? 0) + 1);
  }

  // Alphabetical, because at 22 you are scanning for a name. Seed order carries
  // no meaning a reader can use.
  const categoryOptions = CATEGORIES.filter((entry) => (counts.get(entry) ?? 0) > 0)
    .slice()
    .sort((a, b) => CATEGORY_LABELS[a].localeCompare(CATEGORY_LABELS[b]))
    .map((entry) => ({
      label: `${CATEGORY_LABELS[entry]} (${counts.get(entry) ?? 0})`,
      value: entry,
    }));

  const clear = (): void => {
    setCategories([]);
    setDifficulties([]);
    setTag('all');
    setStatus('all');
    setSearch('');
    setSort(null);
  };

  const practiceThese = (): void => {
    const params = new URLSearchParams();
    for (const category of categories) params.append('category', category);
    for (const difficulty of difficulties) params.append('difficulty', difficulty);
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
          <FilterMultiSelect
            allLabel={`All categories (${data.length})`}
            label="Category"
            onChange={setCategories}
            options={categoryOptions}
            selected={categories}
          />
          <FilterMultiSelect
            allLabel="Any difficulty"
            label="Difficulty"
            onChange={setDifficulties}
            options={DIFFICULTIES.map((entry) => ({ label: capitalise(entry), value: entry }))}
            selected={difficulties}
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
          {unsolvedInScope} unsolved in the current category, difficulty and focus. Search, status
          and sort only change what you see.
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
              <SortableHead column="title" onSort={setSort} sort={sort}>
                Problem
              </SortableHead>
              <SortableHead column="category" onSort={setSort} sort={sort}>
                Category
              </SortableHead>
              <SortableHead column="difficulty" onSort={setSort} sort={sort}>
                Difficulty
              </SortableHead>
              <SortableHead column="relevance" onSort={setSort} sort={sort}>
                Relevance
              </SortableHead>
              <SortableHead column="status" onSort={setSort} sort={sort}>
                Status
              </SortableHead>
              <SortableHead align="right" column="attempts" onSort={setSort} sort={sort}>
                Attempts
              </SortableHead>
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

/**
 * A sortable column header. The control is a real button inside the `th`, and
 * the `th` carries `aria-sort`, which is the pair a screen reader needs: one
 * says the column can be re-ordered, the other says how it currently is.
 *
 * Clicking cycles ascending, descending, then off. The third state is not
 * decoration: unsorted is the seeded `position`, an interleaved round robin that
 * keeps the list from being twenty SQL rows in a row, and a page that could
 * never get back to it would have lost its default for the session.
 */
function SortableHead({
  align = 'left',
  children,
  column,
  onSort,
  sort,
}: {
  align?: 'left' | 'right';
  children: React.ReactNode;
  column: SortColumn;
  onSort: (sort: Sort | null) => void;
  sort: Sort | null;
}): React.ReactElement {
  const active = sort?.column === column ? sort.direction : null;
  const Icon = active === 'asc' ? ArrowUp : active === 'desc' ? ArrowDown : ChevronsUpDown;

  return (
    <TableHead
      aria-sort={active === 'asc' ? 'ascending' : active === 'desc' ? 'descending' : 'none'}
      className={cn('p-0', align === 'right' && 'text-right')}
    >
      <button
        className={cn(
          'flex h-10 w-full items-center gap-1.5 px-3 hover:text-foreground',
          align === 'right' && 'justify-end',
          active && 'text-foreground'
        )}
        onClick={() =>
          onSort(
            active === null
              ? { column, direction: 'asc' }
              : active === 'asc'
                ? { column, direction: 'desc' }
                : null
          )
        }
        type="button"
      >
        {children}
        <Icon className={cn('size-3.5', !active && 'opacity-40')} />
      </button>
    </TableHead>
  );
}

/**
 * Sorting a table always ends up comparing something ordered, and two of these
 * columns are: `easy, medium, hard` and `daily, occasional, foundational` both
 * mean something in that order and nothing in alphabetical order, where hard
 * would lead and occasional would sit in the middle. Both sort by their index in
 * the tuple that defines them, and so does status, whose tuple is the lifecycle
 * a rep moves through.
 *
 * Every comparison falls back to `position`, so the order is total and a re-sort
 * of equal rows never shuffles them.
 */
function comparator(sort: Sort | null): (a: ProblemSummary, b: ProblemSummary) => number {
  if (sort === null) return (a, b) => a.position - b.position;
  const sign = sort.direction === 'asc' ? 1 : -1;

  return (a, b) => {
    const compared = compare(sort.column, a, b);
    return compared === 0 ? a.position - b.position : compared * sign;
  };
}

function compare(column: SortColumn, a: ProblemSummary, b: ProblemSummary): number {
  switch (column) {
    case 'title':
      return a.title.localeCompare(b.title);
    // By the label, because the label is what the row shows.
    case 'category':
      return CATEGORY_LABELS[a.category].localeCompare(CATEGORY_LABELS[b.category]);
    case 'difficulty':
      return DIFFICULTIES.indexOf(a.difficulty) - DIFFICULTIES.indexOf(b.difficulty);
    case 'relevance':
      return RELEVANCES.indexOf(a.relevance) - RELEVANCES.indexOf(b.relevance);
    case 'status':
      return PROBLEM_STATUSES.indexOf(a.status) - PROBLEM_STATUSES.indexOf(b.status);
    case 'attempts':
      return a.attemptsCount - b.attemptsCount;
  }
}

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
