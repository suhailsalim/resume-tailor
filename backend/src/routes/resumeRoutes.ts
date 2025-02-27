import express from "express";
import resumeController from "../controllers/resumeController";
import upload from "../middlewares/uploadMiddleware";

const router = express.Router();

router.post("/generate-resume", upload.single("resume"), resumeController.generateResume);
router.post("/refine-resume", resumeController.refineResume);
router.post("/download-resume", resumeController.downloadResume);

export default router;