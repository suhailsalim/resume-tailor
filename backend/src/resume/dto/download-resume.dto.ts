import { ApiProperty } from '@nestjs/swagger';

export class DownloadResumeDto {
  @ApiProperty()
  markdown: string;

  @ApiProperty()
  format: string;
}
