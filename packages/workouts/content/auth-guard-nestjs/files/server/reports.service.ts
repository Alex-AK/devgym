import { Injectable } from '@nestjs/common';

export interface Report {
  id: number;
  ownerId: string;
  title: string;
  figures: number[];
}

const SEED: Report[] = [
  { id: 1, ownerId: 'alice', title: 'Q1 revenue', figures: [1200, 1450, 1610] },
  { id: 2, ownerId: 'alice', title: 'Q2 revenue', figures: [1710, 1680, 1900] },
  { id: 3, ownerId: 'bob', title: 'Headcount', figures: [12, 13, 13] },
  { id: 4, ownerId: 'bob', title: 'Churn', figures: [3, 2, 4] },
  { id: 5, ownerId: 'carol', title: 'Pipeline', figures: [40, 55, 61] },
];

@Injectable()
export class ReportsService {
  private reports: Report[] = SEED.map((report) => ({ ...report }));

  /** Every report in the system, whoever it belongs to. */
  findAll(): Report[] {
    return this.reports;
  }

  findFor(ownerId: string): Report[] {
    return this.reports.filter((report) => report.ownerId === ownerId);
  }

  findById(id: number): Report | undefined {
    return this.reports.find((report) => report.id === id);
  }

  remove(id: number): boolean {
    const before = this.reports.length;
    this.reports = this.reports.filter((report) => report.id !== id);
    return this.reports.length < before;
  }

  toCsv(report: Report): string {
    return `id,title,figures\n${report.id},"${report.title}","${report.figures.join(' ')}"`;
  }
}
