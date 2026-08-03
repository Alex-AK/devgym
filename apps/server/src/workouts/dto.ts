import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Generous, but a workout file is not a place to paste a megabyte. */
const MAX_FILE_BYTES = 200_000;

export class WorkoutFilePathDto {
  @IsString()
  @MaxLength(200)
  path!: string;
}

export class SaveWorkoutFileDto extends WorkoutFilePathDto {
  @IsString()
  @MaxLength(MAX_FILE_BYTES)
  contents!: string;
}

export class RunWorkoutDto {
  /** A checkpoint id to run alone. Absent means the whole suite. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  checkpoint?: string;
}
