import { MAX_SESSION_SIZE } from '@devgym/shared';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

import { QueueScopeQueryDto } from '../problems/dto';

export class CreateSessionDto extends QueueScopeQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_SESSION_SIZE)
  size?: number;
}
