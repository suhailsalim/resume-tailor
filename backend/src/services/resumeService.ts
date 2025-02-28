import { DocxLoader } from '@langchain/community/document_loaders/fs/docx';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { marked } from 'marked';
import HTMLtoDOCX from "html-to-docx";
import config from '../config/config';

const llm = new ChatGoogleGenerativeAI({
  modelName: 'gemini-2.0-flash',
  apiKey: config.googleGenAiApiKey, // Use API key from config
});

// Generate tailored resume based on job description
const generateResumeTemplate = new PromptTemplate({
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

  # Tailored Resume (in Markdown format):`,
  inputVariables: ['resume', 'jobDescription'],
});

// Refine resume based on feedback
const refineResumeTemplate = new PromptTemplate({
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

const resumeGenerator = RunnableSequence.from([generateResumeTemplate, llm, new StringOutputParser()]);

const resumeRefiner = RunnableSequence.from([refineResumeTemplate, llm, new StringOutputParser()]);

async function parseResumeFile(fileBuffer: Buffer, filename: string): Promise<string> {
  try {
    // convert buffer to blob
    const blob = new Blob([fileBuffer], { type: 'application/octet-stream' });

    let docs: any[] = [];
    if (filename.endsWith('.pdf')) {
      const loader = new PDFLoader(blob);
      docs = await loader.load();
    } else if (filename.endsWith('.docx') || filename.endsWith('.doc')) {
      const loader = new DocxLoader(blob);
      docs = await loader.load();
    }

    // Combine all documents into one text
    const fullText = docs.map((doc) => doc.pageContent).join('\n\n');
    return fullText;
  } catch (error) {
    console.error('Error parsing resume file:', error);
    throw new Error('Failed to parse resume file');
  }
}

async function generateTailoredResume(resumeText: string, jobDescription: string): Promise<string> {
  try {
    let result = await resumeGenerator.invoke({ resume: resumeText, jobDescription });

    // The result might actually contain ```markdown ... ``` around the markdown text
    // So we need to extract the markdown text from the result
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

async function refineTailoredResume(originalResume: string, feedback: string): Promise<string> {
  try {
    let result = await resumeRefiner.invoke({ resume: originalResume, feedback });

    // The result might actually contain ```markdown ... ``` around the markdown text
    // So we need to extract the markdown text from the result
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

async function generateResumeDownload(text: string, format: string): Promise<Buffer | string> {
  if (format === 'markdown') {
    return text; // Return markdown text directly
  }

  const html = await marked(text);

  if (format === 'pdf') {
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

export default {
  parseResumeFile,
  generateTailoredResume,
  refineTailoredResume,
  generateResumeDownload,
};
