import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  // Admin and Project Managers can create tasks
  @Post()
  @Roles(Role.ADMIN, Role.PROJECT_MANAGER)
  create(@Body() dto: CreateTaskDto, @CurrentUser() user: CurrentUserPayload) {
    return this.tasksService.create(dto, user);
  }

  // ?projectId=... lists tasks for a project, ?mine=true lists the caller's own tasks
  @Get()
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query('projectId') projectId?: string,
    @Query('mine') mine?: string,
  ) {
    if (mine === 'true') {
      return this.tasksService.findAllForCurrentUser(user);
    }
    return this.tasksService.findAllForProject(projectId as string, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.tasksService.findOne(id, user);
  }

  // Full update: Admin / Project Manager only
  @Patch(':id')
  @Roles(Role.ADMIN, Role.PROJECT_MANAGER)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.tasksService.update(id, dto, user);
  }

  // Status-only update: open to all roles; service enforces "own tasks only" for Team Members
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTaskStatusDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.tasksService.updateStatus(id, dto.status, user);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.PROJECT_MANAGER)
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.tasksService.remove(id, user);
  }
}
