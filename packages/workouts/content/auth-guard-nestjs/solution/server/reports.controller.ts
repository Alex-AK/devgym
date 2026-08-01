import {
  Controller,
  Delete,
  Get,
  Headers,
  NotFoundException,
  Param,
  UseGuards,
} from '@nestjs/common';

import { OwnerGuard } from './owner.guard';
import { type Report, ReportsService } from './reports.service';

/**
 * Reports.
 *
 * The guard is on the controller, not on the routes. Every route below is
 * covered, including the ones nobody has written yet, which is the only version
 * of this that stays true.
 */
@Controller('reports')
@UseGuards(OwnerGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get()
  list(@Headers('x-user') user: string): Report[] {
    return this.reports.findFor(user);
  }

  @Get(':id')
  get(@Param('id') id: string): Report {
    const report = this.reports.findById(Number(id));
    if (!report) throw new NotFoundException();

    // No ownership check here. The guard has already been past.
    return report;
  }

  @Get(':id/export')
  export(@Param('id') id: string): string {
    const report = this.reports.findById(Number(id));
    if (!report) throw new NotFoundException();

    return this.reports.toCsv(report);
  }

  @Delete(':id')
  remove(@Param('id') id: string): { deleted: boolean } {
    const report = this.reports.findById(Number(id));
    if (!report) throw new NotFoundException();

    return { deleted: this.reports.remove(report.id) };
  }
}
