import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './entities/project.entity';
import { ProjectMember } from './entities/project-member.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { Role } from '../../common/enums/role.enum';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
    @InjectRepository(ProjectMember)
    private readonly membersRepository: Repository<ProjectMember>,
  ) {}

  async create(
    dto: CreateProjectDto,
    currentUser: CurrentUserPayload,
  ): Promise<Project> {
    const project = this.projectsRepository.create({
      name: dto.name,
      description: dto.description,
      status: dto.status,
      startDate: dto.startDate as any,
      endDate: dto.endDate as any,
      managerId: currentUser.userId,
    });

    const saved = await this.projectsRepository.save(project);

    if (dto.memberIds?.length) {
      await this.addMembers(saved.id, dto.memberIds);
    }

    return this.findOne(saved.id, currentUser);
  }

  async findAll(currentUser: CurrentUserPayload): Promise<Project[]> {
    const qb = this.projectsRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.manager', 'manager')
      .leftJoinAndSelect('project.members', 'members')
      .leftJoinAndSelect('members.user', 'memberUser')
      .orderBy('project.createdAt', 'DESC');

    if (currentUser.role === Role.ADMIN) {
      // Admin sees everything, no filter
    } else if (currentUser.role === Role.PROJECT_MANAGER) {
      qb.where('project.managerId = :userId', { userId: currentUser.userId });
    } else {
      // Team member: only projects they belong to
      qb.andWhere('memberUser.id = :userId', { userId: currentUser.userId });
    }

    return qb.getMany();
  }

  async findOne(id: string, currentUser: CurrentUserPayload): Promise<Project> {
    const project = await this.projectsRepository.findOne({
      where: { id },
      relations: ['manager', 'members', 'members.user'],
    });

    if (!project) {
      throw new NotFoundException(`Project with id ${id} not found`);
    }

    this.assertReadAccess(project, currentUser);
    return project;
  }

  async update(
    id: string,
    dto: UpdateProjectDto,
    currentUser: CurrentUserPayload,
  ): Promise<Project> {
    const project = await this.findOne(id, currentUser);
    this.assertManageAccess(project, currentUser);

    Object.assign(project, {
      name: dto.name ?? project.name,
      description: dto.description ?? project.description,
      status: dto.status ?? project.status,
      startDate: (dto.startDate as any) ?? project.startDate,
      endDate: (dto.endDate as any) ?? project.endDate,
    });

    await this.projectsRepository.save(project);

    if (dto.memberIds) {
      await this.membersRepository.delete({ projectId: id });
      await this.addMembers(id, dto.memberIds);
    }

    return this.findOne(id, currentUser);
  }

  async remove(id: string, currentUser: CurrentUserPayload): Promise<void> {
    const project = await this.findOne(id, currentUser);
    this.assertManageAccess(project, currentUser);
    await this.projectsRepository.remove(project);
  }

  async addMember(
    projectId: string,
    userId: string,
    currentUser: CurrentUserPayload,
  ) {
    const project = await this.findOne(projectId, currentUser);
    this.assertManageAccess(project, currentUser);

    const existing = await this.membersRepository.findOne({
      where: { projectId, userId },
    });
    if (existing) {
      throw new ConflictException('User is already a member of this project');
    }

    const member = this.membersRepository.create({ projectId, userId });
    await this.membersRepository.save(member);
    return this.findOne(projectId, currentUser);
  }

  async removeMember(
    projectId: string,
    userId: string,
    currentUser: CurrentUserPayload,
  ) {
    const project = await this.findOne(projectId, currentUser);
    this.assertManageAccess(project, currentUser);

    await this.membersRepository.delete({ projectId, userId });
    return this.findOne(projectId, currentUser);
  }

  private async addMembers(projectId: string, memberIds: string[]) {
    const uniqueIds = [...new Set(memberIds)];
    const members = uniqueIds.map((userId) =>
      this.membersRepository.create({ projectId, userId }),
    );
    await this.membersRepository.save(members);
  }

  private assertReadAccess(project: Project, currentUser: CurrentUserPayload) {
    if (currentUser.role === Role.ADMIN) return;
    if (
      currentUser.role === Role.PROJECT_MANAGER &&
      project.managerId === currentUser.userId
    ) {
      return;
    }
    const isMember = project.members?.some(
      (m) => m.userId === currentUser.userId,
    );
    if (!isMember) {
      throw new ForbiddenException('You do not have access to this project');
    }
  }

  private assertManageAccess(
    project: Project,
    currentUser: CurrentUserPayload,
  ) {
    if (currentUser.role === Role.ADMIN) return;
    if (
      currentUser.role === Role.PROJECT_MANAGER &&
      project.managerId === currentUser.userId
    ) {
      return;
    }
    throw new ForbiddenException(
      'Only the assigned Project Manager or an Admin can manage this project',
    );
  }
}
