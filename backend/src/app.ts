import express from "express";
import cors from "cors";
import resumeRoutes from "./routes/resumeRoutes";
import path from "path";
import config from "./config/config"; // Import config

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api", resumeRoutes); // Use resume routes under /api path

// Serve static files in production
if (config.nodeEnv === "production") {
  app.use(express.static(path.join(__dirname, "../../client/build")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../../client/build/index.html"));
  });
}


export default app;