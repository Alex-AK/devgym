import {
  CATEGORIES,
  type Category,
  DIFFICULTIES,
  type Difficulty,
  QUEUE_MODES,
  type QueueMode,
} from '@devgym/shared';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAttemptDto {
  @IsString()
  @MaxLength(20_000)
  answer!: string;
}

/** Shared by `GET /problems/next` and `POST /problems/:slug/skip`. */
export class QueueScopeQueryDto {
  @IsOptional()
  @IsIn(CATEGORIES)
  category?: Category;

  @IsOptional()
  @IsIn(DIFFICULTIES)
  difficulty?: Difficulty;

  @IsOptional()
  @IsIn(QUEUE_MODES)
  mode?: QueueMode;
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
