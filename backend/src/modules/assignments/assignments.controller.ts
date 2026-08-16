import { Body, Controller, Param, Post } from '@nestjs/common';
import type { Request } from 'express';
import { Auth } from '../../common/guards/auth.decorator';
import { ScopedTo } from '../../common/guards/scoped-to.decorator';
import { CurrentBearerId } from '../../common/decorators/current-bearer-id.decorator';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { CloseAssignmentDto } from './dto/close-assignment.dto';

@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly assignments: AssignmentsService) {}

  @Post()
  @Auth()
  @ScopedTo((req: Request) => (req.body as CreateAssignmentDto)?.jurisdictionUnitIds)
  create(@Body() dto: CreateAssignmentDto, @CurrentBearerId() bearerId: string) {
    return this.assignments.create(dto, bearerId);
  }

  @Post(':id/close')
  @Auth()
  close(@Param('id') id: string, @Body() dto: CloseAssignmentDto, @CurrentBearerId() bearerId: string) {
    // Scope is enforced inside the service against the assignment's existing
    // jurisdiction — see assertCallerCanTouch there for why @ScopedTo() can't
    // do this one (it needs a DB lookup, not just the request body).
    return this.assignments.close(id, dto, bearerId);
  }
}
