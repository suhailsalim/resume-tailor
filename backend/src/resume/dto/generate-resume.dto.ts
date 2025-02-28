import { ApiProperty } from '@nestjs/swagger';

export class GenerateResumeDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  file: any;

  @ApiProperty()
  jobDescription: string;
}
