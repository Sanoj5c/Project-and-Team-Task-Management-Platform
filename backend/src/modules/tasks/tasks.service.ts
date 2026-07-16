import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';
import { ProjectMember } from '../projects/entities/project-member.entity';
import { Project } from '../projects/entities/project.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Task } from './entities/task.entity';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
    @InjectRepository(ProjectMember)
    private readonly membersRepository: Repository<ProjectMember>,
  ) {}

  async create(
    dto: CreateTaskDto,
    currentUser: CurrentUserPayload,
  ): Promise<Task> {
    const project = await this.projectsRepository.findOne({
      where: { id: dto.projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project with id ${dto.projectId} not found`);
    }

    this.assertProjectManageAccess(project, currentUser);

    if (dto.assigneeId) {
      await this.assertAssigneeIsMember(dto.projectId, dto.assigneeId);
    }

    const task = this.tasksRepository.create({
      title: dto.title,
      description: dto.description,
      status: dto.status,
      priority: dto.priority,
      dueDate: dto.dueDate,
      projectId: dto.projectId,
      assigneeId: dto.assigneeId,
    });

    const saved = await this.tasksRepository.save(task);

    return this.findOne(saved.id, currentUser);
  }

  async findAllForProject(
    projectId: string,
    currentUser: CurrentUserPayload,
  ): Promise<Task[]> {
    const project = await this.projectsRepository.findOne({
      where: { id: projectId },
      relations: ['members'],
    });

    if (!project) {
      throw new NotFoundException(`Project with id ${projectId} not found`);
    }

    this.assertProjectReadAccess(project, currentUser);

    return this.tasksRepository.find({
      where: { projectId },
      relations: ['assignee', 'project'],
      order: { createdAt: 'DESC' },
    });
  }

  findAllForCurrentUser(currentUser: CurrentUserPayload): Promise<Task[]> {
    return this.tasksRepository.find({
      where: { assigneeId: currentUser.userId },
      relations: ['assignee', 'project'],
      order: { dueDate: 'ASC' },
    });
  }

  async findOne(id: string, currentUser: CurrentUserPayload): Promise<Task> {
    const task = await this.tasksRepository.findOne({
      where: { id },
      relations: ['assignee', 'project', 'project.members'],
    });

    if (!task) {
      throw new NotFoundException(`Task with id ${id} not found`);
    }

    this.assertProjectReadAccess(task.project, currentUser);

    return task;
  }

  async update(
    id: string,
    dto: UpdateTaskDto,
    currentUser: CurrentUserPayload,
  ): Promise<Task> {
    const task = await this.findOne(id, currentUser);

    this.assertProjectManageAccess(task.project, currentUser);

    if (dto.assigneeId) {
      await this.assertAssigneeIsMember(task.projectId, dto.assigneeId);
    }

    Object.assign(task, {
      title: dto.title ?? task.title,
      description: dto.description ?? task.description,
      status: dto.status ?? task.status,
      priority: dto.priority ?? task.priority,
      dueDate: dto.dueDate ?? task.dueDate,
      assigneeId: dto.assigneeId ?? task.assigneeId,
    });

    await this.tasksRepository.save(task);

    return this.findOne(id, currentUser);
  }

  async updateStatus(
    id: string,
    status: string,
    currentUser: CurrentUserPayload,
  ): Promise<Task> {
    const task = await this.findOne(id, currentUser);

    const isManager =
      currentUser.role === Role.ADMIN ||
      (currentUser.role === Role.PROJECT_MANAGER &&
        task.project.managerId === currentUser.userId);

    const isAssignee = task.assigneeId === currentUser.userId;

    if (!isManager && !isAssignee) {
      throw new ForbiddenException(
        'You can only update the status of tasks assigned to you',
      );
    }

    task.status = status as Task['status'];

    await this.tasksRepository.save(task);

    return this.findOne(id, currentUser);
  }

  async remove(id: string, currentUser: CurrentUserPayload): Promise<void> {
    const task = await this.findOne(id, currentUser);

    this.assertProjectManageAccess(task.project, currentUser);

    await this.tasksRepository.remove(task);
  }

  private async assertAssigneeIsMember(
    projectId: string,
    userId: string,
  ): Promise<void> {
    const membership = await this.membersRepository.findOne({
      where: { projectId, userId },
    });

    if (!membership) {
      throw new BadRequestException('Assignee must be a member of the project');
    }
  }

  private assertProjectReadAccess(
    project: Project,
    currentUser: CurrentUserPayload,
  ): void {
    if (currentUser.role === Role.ADMIN) {
      return;
    }

    if (
      currentUser.role === Role.PROJECT_MANAGER &&
      project.managerId === currentUser.userId
    ) {
      return;
    }

    const isMember = project.members?.some(
      (member) => member.userId === currentUser.userId,
    );

    if (!isMember) {
      throw new ForbiddenException('You do not have access to this project');
    }
  }

  private assertProjectManageAccess(
    project: Project,
    currentUser: CurrentUserPayload,
  ): void {
    if (currentUser.role === Role.ADMIN) {
      return;
    }

    if (
      currentUser.role === Role.PROJECT_MANAGER &&
      project.managerId === currentUser.userId
    ) {
      return;
    }

    throw new ForbiddenException(
      'Only the assigned Project Manager or an Admin can manage tasks in this project',
    );
  }
}
