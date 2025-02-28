import { Injectable } from '@nestjs/common';
import { DocxLoader } from '@langchain/community/document_loaders/fs/docx';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import HTMLtoDOCX from "html-to-docx";
import { marked } from 'marked';
import { ConfigService } from '@nestjs/config';
import * as mammoth from 'mammoth';
import * as pdfParse from 'pdf-parse';

@Injectable()
export class ResumeService {
  private readonly llm: ChatGoogleGenerativeAI;

  constructor(private configService: ConfigService) {
    this.llm = new ChatGoogleGenerativeAI({
      modelName: 'gemini-2.0-flash',
      apiKey: this.configService.get<string>('GOOGLE_GENAI_API_KEY'),
    });
  }

  private generateResumeTemplate = new PromptTemplate({
    template: `You are an expert resume tailor who specializes in customizing resumes to match job descriptions.

    # Original Resume:
    {resume}

    # Job Description:
    {jobDescription}

    Your task is to create a tailored version of the resume that:
    1. Highlights skills, experiences, and qualifications that match the job description
    2. Uses relevant keywords from the job description
    3. Maintains the same factual information (no fabrication)
    4. Reorganizes content to emphasize relevant experience
    5. Uses professional, clear, and concise language
    6. Maintains a clean, professional format

    Create the tailored resume in Markdown format with appropriate sections (Education, Experience, Skills, etc.).
    Focus on honesty while positioning the candidate's actual experience to best match the job requirements.

    Instructions:
    - Review the original resume and job description carefully.
    - Identify key skills, experiences, and qualifications that match the job description.
    - Use relevant keywords from the job description in the tailored resume.
    - Ensure the tailored resume is well-organized and professional.
    - The response should only include the tailored resume content in Markdown format.

    MAKE SURE THE RESUME FOLLOWS THE INDUSTRY STANDARDS FOR FORMATTING AND IS WELL-TAILORED TO THE JOB DESCRIPTION.

    # Tailored Resume (in Markdown format):`,
    inputVariables: ['resume', 'jobDescription'],
  });

  private refineResumeTemplate = new PromptTemplate({
    template: `You are an expert resume tailor who specializes in customizing resumes.

    # Current Resume Draft:
    {resume}

    # Feedback from the user:
    {feedback}

    Your task is to refine the resume based on the feedback while:
    1. Maintaining professional tone and language
    2. Ensuring all content is factually consistent with the original resume
    3. Addressing all points mentioned in the feedback
    4. Keeping the resume well-organized and formatted in Markdown

    Instructions:
    - Review the feedback carefully and make necessary changes to the resume.
    - Focus on improving clarity, relevance, and impact of the resume content.
    - The response should be a refined version of the original resume with the suggested changes.
    - The response should only include the resume content in Markdown format.

    # Refined Resume (in Markdown format):`,
    inputVariables: ['resume', 'feedback'],
  });

  private resumeGenerator = RunnableSequence.from([this.generateResumeTemplate, this.llm, new StringOutputParser()]);

  private resumeRefiner = RunnableSequence.from([this.refineResumeTemplate, this.llm, new StringOutputParser()]);

  async parseResumeFile(fileBuffer: Buffer, filename: string, mimetype: string): Promise<string> {
    try {
      if (filename.endsWith('.pdf')) {
        const data = await pdfParse(fileBuffer);
        return data.text;
      } else if (filename.endsWith('.docx') || filename.endsWith('.doc')) {
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        return result.value;
      } else {
        throw new Error('Unsupported file format');
      }
    } catch (error) {
      console.error('Error parsing resume file:', error);
      throw new Error('Failed to parse resume file');
    }
  }

  async generateTailoredResume(resumeText: string, jobDescription: string): Promise<string> {
    try {
      let result = await this.resumeGenerator.invoke({ resume: resumeText, jobDescription });

      const markdownMatch = result.match(/```markdown\n([\s\S]+)\n```/);
      if (markdownMatch) {
        result = markdownMatch[1];
      }

      return result;
    } catch (error) {
      console.error('Error in generateTailoredResume service:', error);
      throw new Error('Failed to generate tailored resume');
    }
  }

  async refineTailoredResume(originalResume: string, feedback: string): Promise<string> {
    try {
      let result = await this.resumeRefiner.invoke({ resume: originalResume, feedback });

      const markdownMatch = result.match(/```markdown\n([\s\S]+)\n```/);
      if (markdownMatch) {
        result = markdownMatch[1];
      }

      return result;
    } catch (error) {
      console.error('Error in refineTailoredResume service:', error);
      throw new Error('Failed to refine tailored resume');
    }
  }

  async generateResumeDownload(text: string, format: string): Promise<Buffer | string> {
    if (format === 'markdown') {
      return text;
    }

    const html = marked(text);

    if (format === 'pdf') {
      // Convert HTML to PDF using a library like Puppeteer or pdf-lib
      // Placeholder for actual PDF conversion logic
      return Buffer.from(html);
    } else if (format === 'doc') {
      const response = await HTMLtoDOCX(html, null, {
        title: 'Resume'
      });
      if (response instanceof ArrayBuffer) {
        return Buffer.from(response);
      } else if (Buffer.isBuffer(response)) {
        return response;
      } else {
        throw new Error('Failed to generate DOCX file');
      }
    } else {
      throw new Error('Invalid format specified');
    }
  }
}
