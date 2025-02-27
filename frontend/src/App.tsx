import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  FormControlLabel,
  Paper,
  Snackbar,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import CssBaseline from "@mui/material/CssBaseline";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import axios from "axios";
import MarkdownPreview from "markdown-to-jsx";
import React, { useEffect, useState } from "react";

const App = () => {
  const [jobDescription, setJobDescription] = useState("");
  const [resume, setResume] = useState(null);
  const [resumeFileName, setResumeFileName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [generatedResume, setGeneratedResume] = useState("");
  const [feedback, setFeedback] = useState("");
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("darkMode") === "true" || false
  );
  const [showFeedbackSection, setShowFeedbackSection] = useState(false);
  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  // Create theme based on dark mode preference
  const theme = createTheme({
    palette: {
      mode: darkMode ? "dark" : "light",
      primary: {
        main: "#3f51b5",
      },
      secondary: {
        main: "#f50057",
      },
    },
  });

  // Load dark mode preference from local storage
  useEffect(() => {
    localStorage.setItem("darkMode", darkMode.toString());
  }, [darkMode]);

  const handleFileChange = (event: any) => {
    const file = event.target.files[0];
    if (file) {
      setResume(file);
      setResumeFileName(file.name);
    }
  };

  const handleJobDescriptionChange = (event: any) => {
    setJobDescription(event.target.value);
  };

  const handleFeedbackChange = (event: any) => {
    setFeedback(event.target.value);
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const submitResume = async () => {
    if (!resume || !jobDescription.trim()) {
      setNotification({
        open: true,
        message: "Please upload a resume and enter a job description",
        severity: "error",
      });
      return;
    }

    setIsLoading(true);
    const formData = new FormData();
    formData.append("resume", resume);
    formData.append("jobDescription", jobDescription);

    try {
      const response = await axios.post("/api/generate-resume", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setGeneratedResume(response.data.resume);
      setShowFeedbackSection(true);
      setNotification({
        open: true,
        message: "Resume generated successfully!",
        severity: "success",
      });
    } catch (error) {
      console.error("Error generating resume:", error);
      setNotification({
        open: true,
        message: "Error generating resume. Please try again.",
        severity: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const submitFeedback = async () => {
    if (!feedback.trim()) {
      setNotification({
        open: true,
        message: "Please enter feedback for improvement",
        severity: "warning",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post("/api/refine-resume", {
        originalResume: generatedResume,
        feedback,
      });
      setGeneratedResume(response.data.resume);
      setFeedback("");
      setNotification({
        open: true,
        message: "Resume refined based on your feedback!",
        severity: "success",
      });
    } catch (error) {
      console.error("Error refining resume:", error);
      setNotification({
        open: true,
        message: "Error refining resume. Please try again.",
        severity: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadResume = async (format: string) => {
    try {
      const response = await axios.post(
        "/api/download-resume",
        {
          markdown: generatedResume,
          format,
        },
        {
          responseType: "blob",
        }
      );

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;

      // Set filename based on format
      const fileExtension = format === "markdown" ? "md" : format;
      link.setAttribute("download", `tailored-resume.${fileExtension}`);

      // Append to html link element page
      document.body.appendChild(link);

      // Start download
      link.click();

      if (link && link.parentNode) {
        // Clean up and remove the link
        link.parentNode.removeChild(link);
      }

      setNotification({
        open: true,
        message: `Resume downloaded as ${format.toUpperCase()}!`,
        severity: "success",
      });
    } catch (error) {
      console.error("Error downloading resume:", error);
      setNotification({
        open: true,
        message: "Error downloading resume. Please try again.",
        severity: "error",
      });
    }
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={4}
          >
            <Typography variant="h4" component="h1" gutterBottom>
              Resume Tailor AI
            </Typography>
            <FormControlLabel
              control={<Switch checked={darkMode} onChange={toggleDarkMode} />}
              label={darkMode ? "Dark Mode" : "Light Mode"}
            />
          </Box>

          <Box
            display="flex"
            gap={4}
            flexDirection={{ xs: "column", md: "row" }}
          >
            {/* Input Section */}
            <Paper elevation={3} sx={{ p: 3, flex: 1 }}>
              <Typography variant="h6" gutterBottom>
                Inputs
              </Typography>

              <Box mb={3}>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<CloudUploadIcon />}
                  fullWidth
                  sx={{ p: 1.5, mb: 1 }}
                >
                  Upload Resume (PDF, DOC, DOCX)
                  <input
                    type="file"
                    hidden
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                  />
                </Button>
                {resumeFileName && (
                  <Typography variant="body2" color="textSecondary">
                    Selected: {resumeFileName}
                  </Typography>
                )}
              </Box>

              <TextField
                label="Job Description"
                multiline
                rows={10}
                fullWidth
                value={jobDescription}
                onChange={handleJobDescriptionChange}
                placeholder="Paste the job description here..."
                variant="outlined"
                sx={{ mb: 3 }}
              />

              <Button
                variant="contained"
                color="primary"
                onClick={submitResume}
                disabled={isLoading || !resume || !jobDescription.trim()}
                fullWidth
                sx={{ p: 1.5 }}
              >
                {isLoading ? (
                  <CircularProgress size={24} />
                ) : (
                  "Generate Tailored Resume"
                )}
              </Button>
            </Paper>

            {/* Output Section */}
            <Paper elevation={3} sx={{ p: 3, flex: 1 }}>
              <Typography variant="h6" gutterBottom>
                Tailored Resume
              </Typography>

              {generatedResume ? (
                <>
                  <Paper
                    elevation={1}
                    sx={{
                      p: 2,
                      mb: 3,
                      maxHeight: "500px",
                      overflow: "auto",
                      bgcolor: darkMode
                        ? "rgba(255, 255, 255, 0.05)"
                        : "rgba(0, 0, 0, 0.02)",
                    }}
                  >
                    <MarkdownPreview>{generatedResume}</MarkdownPreview>
                  </Paper>

                  <Box display="flex" gap={1} mb={3}>
                    <Button
                      variant="outlined"
                      startIcon={<FileDownloadIcon />}
                      onClick={() => downloadResume("pdf")}
                      size="small"
                    >
                      PDF
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<FileDownloadIcon />}
                      onClick={() => downloadResume("doc")}
                      size="small"
                    >
                      DOC
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<FileDownloadIcon />}
                      onClick={() => downloadResume("markdown")}
                      size="small"
                    >
                      Markdown
                    </Button>
                  </Box>
                </>
              ) : (
                <Box
                  display="flex"
                  justifyContent="center"
                  alignItems="center"
                  height="200px"
                  sx={{
                    bgcolor: darkMode
                      ? "rgba(255, 255, 255, 0.05)"
                      : "rgba(0, 0, 0, 0.02)",
                    borderRadius: 1,
                  }}
                >
                  <Typography color="textSecondary">
                    {isLoading ? (
                      <CircularProgress size={40} />
                    ) : (
                      "Your tailored resume will appear here"
                    )}
                  </Typography>
                </Box>
              )}

              {showFeedbackSection && (
                <Box mt={3}>
                  <Typography variant="subtitle1" gutterBottom>
                    Not satisfied? Provide feedback for improvements:
                  </Typography>
                  <TextField
                    multiline
                    rows={4}
                    fullWidth
                    value={feedback}
                    onChange={handleFeedbackChange}
                    placeholder="Suggest improvements or changes..."
                    variant="outlined"
                    sx={{ mb: 2 }}
                  />
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={submitFeedback}
                    disabled={isLoading || !feedback.trim()}
                  >
                    {isLoading ? (
                      <CircularProgress size={24} />
                    ) : (
                      "Apply Feedback"
                    )}
                  </Button>
                </Box>
              )}
            </Paper>
          </Box>
        </Box>
      </Container>

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity as any}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
};

export default App;
