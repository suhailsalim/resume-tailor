import { ApiProperty } from '@nestjs/swagger';

export class RefineResumeDto {
  @ApiProperty()
  originalResume: string;

  @ApiProperty()
  feedback: string;
}
