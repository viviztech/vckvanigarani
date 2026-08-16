import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Auth } from '../../common/guards/auth.decorator';
import { CurrentBearerId } from '../../common/decorators/current-bearer-id.decorator';
import { DashboardService, EventDashboard } from './dashboard.service';

@Controller('events')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get(':id/dashboard')
  @Auth()
  get(@Param('id') eventId: string, @CurrentBearerId() bearerId: string) {
    return this.dashboard.getDashboard(eventId, bearerId);
  }

  @Get(':id/dashboard/export')
  @Auth()
  async export(@Param('id') eventId: string, @CurrentBearerId() bearerId: string, @Res() res: Response) {
    const data = await this.dashboard.getDashboard(eventId, bearerId);
    const csv = this.toCsv(data);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="event-${eventId}-dashboard.csv"`);
    res.send(csv);
  }

  private toCsv(data: EventDashboard): string {
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const lines = ['Status,Full Name,Phone,Membership No'];
    for (const b of data.paid) lines.push(`Paid,${escape(b.fullName)},${escape(b.phone)},${escape(b.membershipNo)}`);
    for (const b of data.unpaid) lines.push(`Unpaid,${escape(b.fullName)},${escape(b.phone)},${escape(b.membershipNo)}`);
    return lines.join('\n');
  }
}
