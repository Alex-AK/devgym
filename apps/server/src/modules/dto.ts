import { IsString, MaxLength } from 'class-validator';

/** A step's snippet is a paragraph of code, not a file. */
const MAX_SNIPPET_BYTES = 20_000;

export class RunStepDto {
  @IsString()
  @MaxLength(MAX_SNIPPET_BYTES)
  code!: string;
}
