import { Controller, Post, Body, UploadedFile, UseInterceptors, HttpException, HttpStatus, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ResumeService } from '../services/resumeService';

@Controller('resume')
export class ResumeController {
  constructor(private readonly resumeService: ResumeService) {}

  @Post('generate-resume')
  @UseInterceptors(FileInterceptor('resume'))
  async generateResume(@UploadedFile() file: Express.Multer.File, @Body('jobDescription') jobDescription: string) {
    try {
      if (!file || !jobDescription) {
        throw new HttpException('Missing resume file or job description', HttpStatus.BAD_REQUEST);
      }

      const resumeText = await this.resumeService.parseResumeFile(file.buffer, file.originalname, file.mimetype);
      const tailoredResume = await this.resumeService.generateTailoredResume(resumeText, jobDescription);

      return { resume: tailoredResume };
    } catch (error) {
      console.error('Error generating resume in controller:', error);
      throw new HttpException('Failed to generate resume', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('refine-resume')
  async refineResume(@Body('originalResume') originalResume: string, @Body('feedback') feedback: string) {
    try {
      if (!originalResume || !feedback) {
        throw new HttpException('Missing resume or feedback', HttpStatus.BAD_REQUEST);
      }

      const refinedResume = await this.resumeService.refineTailoredResume(originalResume, feedback);

      return { resume: refinedResume };
    } catch (error) {
      console.error('Error refining resume in controller:', error);
      throw new HttpException('Failed to refine resume', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('download-resume')
  async downloadResume(@Body('markdown') markdown: string, @Body('format') format: string, @Res() res: Response) {
    try {
      if (!markdown || !format) {
        throw new HttpException('Missing markdown content or format', HttpStatus.BAD_REQUEST);
      }

      const fileData = await this.resumeService.generateResumeDownload(markdown, format);

      if (format === 'markdown') {
        res.setHeader('Content-Type', 'text/markdown');
        res.setHeader('Content-Disposition', 'attachment; filename=tailored-resume.md');
        res.send(fileData);
      } else if (fileData instanceof Buffer) {
        const contentType = format === 'pdf' ? 'application/pdf' : 'application/msword';
        const fileExtension = format === 'pdf' ? 'pdf' : 'doc';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename=tailored-resume.${fileExtension}`);
        res.send(fileData);
      } else {
        throw new HttpException('Unexpected file format', HttpStatus.INTERNAL_SERVER_ERROR);
      }
    } catch (error) {
      console.error('Error downloading resume in controller:', error);
      throw new HttpException('Failed to download resume', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
