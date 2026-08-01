import {
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Headers,
  NotFoundException,
  Param,
} from '@nestjs/common';

import { type Report, ReportsService } from './reports.service';

/**
 * Reports.
 *
 * The ownership check on `GET /reports/:id` was written when that was the only
 * route. Three more have been added since.
 */
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get()
  list(): Report[] {
    return this.reports.findAll();
  }

  @Get(':id')
  get(@Param('id') id: string, @Headers('x-user') user: string): Report {
    const report = this.reports.findById(Number(id));
    if (!report) throw new NotFoundException();
    if (report.ownerId !== user) throw new ForbiddenException();

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
