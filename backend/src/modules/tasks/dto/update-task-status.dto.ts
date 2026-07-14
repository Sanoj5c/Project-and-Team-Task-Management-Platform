import { IsEnum } from 'class-validator';
import { TaskStatus } from '../../../common/enums/task.enum';

export class UpdateTaskStatusDto {
  @IsEnum(TaskStatus)
  status: TaskStatus;
}