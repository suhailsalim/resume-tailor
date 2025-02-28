import { Request, Response } from "express";
import resumeService from "../services/resumeService";

const generateResume = async (req: Request, res: Response) => {
  try {
    if (!req.file || !req.body.jobDescription) {
      res.status(400).json({ error: "Missing resume file or job description" });
      return;
    }

    const resumeText = await resumeService.parseResumeFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );
    const jobDescription = req.body.jobDescription;

    const tailoredResume = await resumeService.generateTailoredResume(
      resumeText,
      jobDescription
    );

    res.json({ resume: tailoredResume });
  } catch (error: any) {
    console.error("Error generating resume in controller:", error);
    res
      .status(500)
      .json({ error: "Failed to generate resume", message: error.message });
  }
};

const refineResume = async (req: Request, res: Response) => {
  try {
    const { originalResume, feedback } = req.body;

    if (!originalResume || !feedback) {
      res.status(400).json({ error: "Missing resume or feedback" });
      return;
    }

    const refinedResume = await resumeService.refineTailoredResume(
      originalResume,
      feedback
    );

    res.json({ resume: refinedResume });
  } catch (error: any) {
    console.error("Error refining resume in controller:", error);
    res
      .status(500)
      .json({ error: "Failed to refine resume", message: error.message });
  }
};

const downloadResume = async (req: Request, res: Response) => {
  try {
    const { markdown, format } = req.body;

    if (!markdown || !format) {
      res.status(400).json({ error: "Missing markdown content or format" });
      return;
    }

    const fileData = await resumeService.generateResumeDownload(
      markdown,
      format
    );

    if (format === "markdown") {
      res.setHeader("Content-Type", "text/markdown");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=tailored-resume.md"
      );
      res.send(fileData);
    } else if (fileData instanceof Buffer) {
      const contentType =
        format === "pdf" ? "application/pdf" : "application/msword";
      const fileExtension = format === "pdf" ? "pdf" : "doc";
      res.setHeader("Content-Type", contentType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=tailored-resume.${fileExtension}`
      );
      res.send(fileData);
    } else {
      // Should not reach here, but for type safety
      res
        .status(500)
        .json({
          error: "Error generating download",
          message: "Unexpected file format.",
        });
    }
  } catch (error: any) {
    console.error("Error downloading resume in controller:", error);
    res
      .status(500)
      .json({ error: "Failed to download resume", message: error.message });
  }
};

export default {
  generateResume,
  refineResume,
  downloadResume,
};
