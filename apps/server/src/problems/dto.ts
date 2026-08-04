import {
  CATEGORIES,
  type Category,
  DIFFICULTIES,
  type Difficulty,
  QUEUE_MODES,
  type QueueMode,
  type QueueScope,
  type Tag,
  TAGS,
} from '@hone/shared';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAttemptDto {
  @IsString()
  @MaxLength(20_000)
  answer!: string;
}

/**
 * A list axis arrives as a repeated param (`?category=sql&category=react`), and
 * Express hands that over as an array only when it was repeated. One value is a
 * bare string, which is also the shape every link written before the lists
 * existed still emits, so both normalise here and neither reaches the queue.
 */
function toList(value: unknown): unknown {
  if (value === undefined || value === null) return undefined;
  return Array.isArray(value) ? value : [value];
}

/** Shared by `GET /problems/next`, `POST /problems/:slug/skip` and `POST /sessions`. */
export class QueueScopeQueryDto {
  @IsOptional()
  @Transform(({ value }) => toList(value))
  @IsIn(CATEGORIES, { each: true })
  category?: Category[];

  @IsOptional()
  @Transform(({ value }) => toList(value))
  @IsIn(DIFFICULTIES, { each: true })
  difficulty?: Difficulty[];

  @IsOptional()
  @IsIn(QUEUE_MODES)
  mode?: QueueMode;

  @IsOptional()
  @IsIn(TAGS)
  tag?: Tag;
}

/**
 * The validated query as the queue wants it. Empty lists are dropped rather than
 * carried: `?category=` with nothing after it is somebody who filtered by
 * nothing, and a scope that named no category is what holds an opt-in category
 * back.
 */
export function toQueueScope(query: QueueScope): QueueScope {
  return {
    ...(query.category?.length ? { category: query.category } : {}),
    ...(query.difficulty?.length ? { difficulty: query.difficulty } : {}),
    ...(query.mode && query.mode !== 'all' ? { mode: query.mode } : {}),
    ...(query.tag ? { tag: query.tag } : {}),
  };
}

export class NextProblemQueryDto extends QueueScopeQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  after?: string;

  @IsOptional()
  @IsIn(['next', 'prev'])
  dir?: 'next' | 'prev';
}

export class ResetAllDto {
  @IsOptional()
  @IsBoolean()
  clearHistory?: boolean;
}
