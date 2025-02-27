import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { StringOutputParser } from "@langchain/core/dist/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import cors from "cors";
import type { Request, Response } from "express";
import express from "express";
import fs from "fs";
import { BufferMemory } from "langchain/memory";
import { marked } from "marked";
import multer from "multer";
import os from "os";
import path from "path";
import puppeteer from "puppeteer";

// Configure application
const app = express();
const port = process.env.PORT || 3001;

// Configure middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max file size
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Only PDF, DOC, and DOCX files are allowed."
        ) as any
      );
    }
  },
});

const llm = new ChatGoogleGenerativeAI({
  modelName: "gemini-pro",
  maxOutputTokens: 2048,
});

// Memory for conversation history
const memory = new BufferMemory({
  memoryKey: "chat_history",
  returnMessages: true,
  inputKey: "input",
  outputKey: "output",
});

// Parse resume file
async function parseResumeFile(
  fileBuffer: Buffer,
  filename: string
): Promise<string> {
  try {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "resume-"));
    const tempFilePath = path.join(tempDir, filename);

    fs.writeFileSync(tempFilePath, fileBuffer);

    let docs: any[] = [];
    if (filename.endsWith(".pdf")) {
      const loader = new PDFLoader(tempFilePath);
      docs = await loader.load();
    } else if (filename.endsWith(".docx") || filename.endsWith(".doc")) {
      const loader = new DocxLoader(tempFilePath);
      docs = await loader.load();
    }

    // Clean up temp files
    fs.unlinkSync(tempFilePath);
    fs.rmdirSync(tempDir);

    // Combine all documents into one text
    const fullText = docs.map((doc) => doc.pageContent).join("\n\n");
    return fullText;
  } catch (error) {
    console.error("Error parsing resume file:", error);
    throw new Error("Failed to parse resume file");
  }
}

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
  inputVariables: ["resume", "jobDescription"],
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
  inputVariables: ["resume", "feedback"],
});

const resumeGenerator = RunnableSequence.from([
  generateResumeTemplate,
  llm,
  new StringOutputParser(),
]);

const resumeRefiner = RunnableSequence.from([
  refineResumeTemplate,
  llm,
  new StringOutputParser(),
]);

// API endpoint to generate a tailored resume
app.post(
  "/api/generate-resume",
  upload.single("resume"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file || !req.body.jobDescription) {
        res
          .status(400)
          .json({ error: "Missing resume file or job description" });
        return;
      }

      const resumeText = await parseResumeFile(
        req.file.buffer,
        req.file.originalname
      );
      const jobDescription = req.body.jobDescription;

      const tailoredResume = await resumeGenerator.invoke({
        resume: resumeText,
        jobDescription: jobDescription,
      });

      res.json({ resume: tailoredResume });
    } catch (error) {
      console.error("Error generating resume:", error);
      res.status(500).json({ error: "Failed to generate resume" });
    }
  }
);

// API endpoint to refine resume based on feedback
app.post("/api/refine-resume", async (req, res) => {
  try {
    const { originalResume, feedback } = req.body;

    if (!originalResume || !feedback) {
      res.status(400).json({ error: "Missing resume or feedback" });
      return;
    }

    const refinedResume = await resumeRefiner.invoke({
      resume: originalResume,
      feedback: feedback,
    });

    res.json({ resume: refinedResume });
    return;
  } catch (error) {
    console.error("Error refining resume:", error);
    res.status(500).json({ error: "Failed to refine resume" });
    return;
  }
});

app.post("/test", async (req, res) => {
  res.json({});
});

// API endpoint to download resume in different formats
app.post("/api/download-resume", async (req, res) => {
  try {
    const { markdown, format } = req.body;

    if (!markdown || !format) {
      res.status(400).json({ error: "Missing markdown content or format" });
      return;
    }

    // For markdown format, just return the markdown text
    if (format === "markdown") {
      res.setHeader("Content-Type", "text/markdown");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=tailored-resume.md"
      );
      res.send(markdown);
      return;
    }

    // For PDF or DOC format, convert markdown to HTML first
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

    // Launch puppeteer for PDF conversion
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    if (format === "pdf") {
      const pdfBuffer = await page.pdf({
        format: "A4",
        margin: { top: "40px", right: "40px", bottom: "40px", left: "40px" },
        printBackground: true,
      });
      await browser.close();

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=tailored-resume.pdf"
      );
      res.send(pdfBuffer);
      return;
    } else if (format === "doc") {
      // For DOC format, we'll use HTML with MS Word compatibility
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

      res.setHeader("Content-Type", "application/msword");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=tailored-resume.doc"
      );
      res.send(Buffer.from(docHtml));
      return;
    }

    res.status(400).json({ error: "Invalid format specified" });
    return;
  } catch (error) {
    console.error("Error downloading resume:", error);
    res.status(500).json({ error: "Failed to download resume" });
    return;
  }
});

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../client/build")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../client/build/index.html"));
  });
}

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
