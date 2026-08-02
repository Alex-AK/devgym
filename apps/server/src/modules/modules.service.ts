import type { ModuleDetail, ModuleRunResponse, ModuleStep, ModuleSummary } from '@devgym/shared';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { resolvePractiseLinks } from '../common/practise';
import type { AppDb } from '../db/client';
import { APP_DB } from '../db/db.module';
import { runCode } from '../grading';
import { listModules, type ModuleContent, readModule } from './modules-content';

@Injectable()
export class ModulesService {
  constructor(@Inject(APP_DB) private readonly db: AppDb) {}

  list(): ModuleSummary[] {
    return listModules().map(toSummary);
  }

  detail(slug: string): ModuleDetail {
    const content = this.require(slug);
    return {
      ...toSummary(content),
      steps: content.steps,
      sources: content.sources,
      verified: content.verified,
      practiseLinks: resolvePractiseLinks(this.db, content.practise),
    };
  }

  /**
   * The code is whatever is in the editor; the assertions come from the step on
   * disk. That split is the point of the format: you are free to change the
   * snippet and find out what happens, and the check does not move when you do.
   */
  async run(slug: string, stepId: string, code: string): Promise<ModuleRunResponse> {
    const step = this.requireStep(slug, stepId);

    const result = await runCode(
      code,
      step.assertions.map((expression) => ({ name: expression, expression, expected: true }))
    );

    const results = result.outcomes.map((outcome) => ({
      name: outcome.name,
      passed: outcome.passed,
      ...(outcome.detail === undefined ? {} : { detail: outcome.detail }),
    }));

    return {
      error: result.error ?? null,
      results,
      logs: result.logs,
      passed: result.error === undefined && results.every((one) => one.passed),
    };
  }

  private require(slug: string): ModuleContent {
    try {
      return readModule(slug);
    } catch {
      throw new NotFoundException(`No module ${slug}`);
    }
  }

  private requireStep(slug: string, stepId: string): ModuleStep {
    const step = this.require(slug).steps.find((one) => one.id === stepId);
    if (!step) throw new NotFoundException(`No step ${stepId} in module ${slug}`);
    return step;
  }
}

function toSummary(content: ModuleContent): ModuleSummary {
  return {
    slug: content.slug,
    title: content.title,
    summary: content.summary,
    order: content.order,
    minutes: content.minutes,
    stepCount: content.steps.length,
  };
}
