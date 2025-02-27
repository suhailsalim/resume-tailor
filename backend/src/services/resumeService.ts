import { DocxLoader } from '@langchain/community/document_loaders/fs/docx';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import fs from 'fs/promises';
import { marked } from 'marked';
import os from 'os';
import path from 'path';
import puppeteer from 'puppeteer';
import config from '../config/config'; // Import config

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

  # Refined Resume (in Markdown format):`,
  inputVariables: ['resume', 'feedback'],
});

const resumeGenerator = RunnableSequence.from([generateResumeTemplate, llm, new StringOutputParser()]);

const resumeRefiner = RunnableSequence.from([refineResumeTemplate, llm, new StringOutputParser()]);

async function parseResumeFile(fileBuffer: Buffer, filename: string): Promise<string> {
  try {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'resume-'));
    const tempFilePath = path.join(tempDir, filename);

    await fs.writeFile(tempFilePath, fileBuffer);

    let docs: any[] = [];
    if (filename.endsWith('.pdf')) {
      const loader = new PDFLoader(tempFilePath);
      docs = await loader.load();
    } else if (filename.endsWith('.docx') || filename.endsWith('.doc')) {
      const loader = new DocxLoader(tempFilePath);
      docs = await loader.load();
    }

    // Clean up temp files
    await Promise.all([fs.unlink(tempFilePath), fs.rmdir(tempDir)]);

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

async function generateResumeDownload(markdown: string, format: string): Promise<Buffer | string> {
  if (format === 'markdown') {
    return markdown; // Return markdown text directly
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Tailored Resume</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          margin: 40px;
          max-width: 800px;
        }
        h1, h2, h3 {
          color: #333;
        }
        h1 {
          border-bottom: 1px solid #ddd;
          padding-bottom: 10px;
        }
        h2 {
          margin-top: 20px;
          border-bottom: 1px solid #eee;
          padding-bottom: 5px;
        }
        ul {
          margin-top: 5px;
        }
        a {
          color: #0366d6;
          text-decoration: none;
        }
        p {
          margin: 5px 0;
        }
      </style>
    </head>
    <body>
      ${marked(markdown)}
    </body>
    </html>
  `;

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  if (format === 'pdf') {
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: { top: '40px', right: '40px', bottom: '40px', left: '40px' },
      printBackground: true,
    });
    await browser.close();
    return Buffer.from(pdfBuffer);
  } else if (format === 'doc') {
    const docHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
        xmlns:w="urn:schemas-microsoft-com:office:word"
        xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          body {
            font-family: Calibri, Arial, sans-serif;
            margin: 1cm 2cm;
            font-size: 11pt;
          }
          h1, h2, h3 { font-family: Calibri, Arial, sans-serif; }
          h1 { font-size:
            18pt; }
          h2 { font-size: 14pt; }
          p, li { font-size: 11pt; line-height: 1.5; }
        </style>
      </head>
      <body>
        ${marked(markdown)}
      </body>
      </html>
    `;
    await browser.close();
    return Buffer.from(docHtml);
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
