import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  FormControlLabel,
  Grid,
  Paper,
  Snackbar,
  Step,
  StepLabel,
  Stepper,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import CssBaseline from "@mui/material/CssBaseline";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import axios from "axios";
import MarkdownPreview from "markdown-to-jsx";
import { useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";

const App = () => {
  const [jobDescription, setJobDescription] = useState("");
  const [resume, setResume] = useState(null);
  const [resumeFileName, setResumeFileName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [generatedResume, setGeneratedResume] = useState("");
  const [editedResume, setEditedResume] = useState("");
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
  const [step, setStep] = useState(() => {
    const storedStep = localStorage.getItem("currentStep");
    return storedStep ? parseInt(storedStep, 10) : 1;
  });
  const [resumeUploaded, setResumeUploaded] = useState(() => {
    return localStorage.getItem("resumeUploaded") === "true";
  });

  const steps = ["Upload Resume", "Job Description", "Edit & Download"];

  // Initialize editedResume with generatedResume when it changes
  useEffect(() => {
    if (generatedResume) {
      setEditedResume(generatedResume);
    }
  }, [generatedResume]);

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

  // Persist step to local storage
  useEffect(() => {
    localStorage.setItem("currentStep", step.toString());
  }, [step]);

  // Persist resumeUploaded status
  useEffect(() => {
    localStorage.setItem("resumeUploaded", resumeUploaded.toString());
  }, [resumeUploaded]);

  const handleFileChange = (event: any) => {
    const file = event.target.files[0];
    if (file) {
      setResume(file);
      setResumeFileName(file.name);
      setResumeUploaded(true);
    }
  };

  const handleJobDescriptionChange = (event: any) => {
    setJobDescription(event.target.value);
  };

  const handleEditedResumeChange = (event: any) => {
    setEditedResume(event.target.value);
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
      setStep(3);
      setNotification({
        open: true,
        message: "Resume generated successfully!",
        severity: "success",
      });
    } catch (error: any) {
      console.error("Error generating resume:", error);
      let errorMessage = "Error generating resume. Please try again.";
      if (
        error.response &&
        error.response.data &&
        error.response.data.message
      ) {
        errorMessage = error.response.data.message;
      }
      setNotification({
        open: true,
        message: errorMessage,
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
        originalResume: editedResume,
        feedback,
      });
      setGeneratedResume(response.data.resume);
      setFeedback("");
      setNotification({
        open: true,
        message: "Resume refined based on your feedback!",
        severity: "success",
      });
    } catch (error: any) {
      console.error("Error refining resume:", error);
      let errorMessage = "Error refining resume. Please try again.";
      if (
        error.response &&
        error.response.data &&
        error.response.data.message
      ) {
        errorMessage = error.response.data.message;
      }
      setNotification({
        open: true,
        message: errorMessage,
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
          markdown: editedResume,
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
    } catch (error: any) {
      console.error("Error downloading resume:", error);
      let errorMessage = "Error downloading resume. Please try again.";
      if (
        error.response &&
        error.response.data &&
        error.response.data.message
      ) {
        errorMessage = error.response.data.message;
      }
      setNotification({
        open: true,
        message: errorMessage,
        severity: "error",
      });
    }
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
    },
    onDrop: (acceptedFiles: any) => {
      const file = acceptedFiles[0];
      if (file) {
        setResume(file);
        setResumeFileName(file.name);
        setResumeUploaded(true);
      }
    },
  });

  const handleNextStep = () => {
    if (step === 1 && !resumeUploaded) {
      setNotification({
        open: true,
        message: "Please upload a resume first.",
        severity: "warning",
      });
      return;
    }
    setStep((prevStep) => Math.min(prevStep + 1, 3));
  };

  const handlePrevStep = () => {
    setStep((prevStep) => Math.max(prevStep - 1, 1));
  };

  const renderStepContent = () => {
    switch (step) {
      case 1: // Step 1: Upload Resume
        return (
          <Paper elevation={3} sx={{ p: 3, my: 2 }}>
            <Typography variant="h6" gutterBottom>
              Step 1: Upload Your Resume
            </Typography>
            <Box
              mb={3}
              {...getRootProps()}
              sx={{
                p: 2,
                border: "1px dashed gray",
                textAlign: "center",
                cursor: "pointer",
              }}
            >
              <input {...getInputProps()} />
              {isDragActive ? (
                <Typography>Drop files here...</Typography>
              ) : (
                <>
                  <CloudUploadIcon style={{ fontSize: 40 }} />
                  <Typography>Upload Resume (PDF, DOC, DOCX)</Typography>
                  <Typography variant="body2" color="textSecondary">
                    or click to select files
                  </Typography>
                </>
              )}
            </Box>
            {resumeFileName && (
              <Typography variant="body2" color="textSecondary" mt={1}>
                Selected: {resumeFileName}
              </Typography>
            )}
            <Box mt={2} display="flex" justifyContent="flex-end">
              <Button
                variant="contained"
                color="primary"
                onClick={handleNextStep}
                disabled={!resumeUploaded}
              >
                Next
              </Button>
            </Box>
          </Paper>
        );
      case 2: // Step 2: Job Description
        return (
          <Paper elevation={3} sx={{ p: 3, my: 2 }}>
            <Typography variant="h6" gutterBottom>
              Step 2: Enter Job Description
            </Typography>
            <TextField
              label="Job Description"
              multiline
              rows={10}
              fullWidth
              value={jobDescription}
              onChange={handleJobDescriptionChange}
              placeholder="Paste the job description here..."
              variant="outlined"
              sx={{ mb: 3, mt: 2 }}
            />
            <Box mt={2} display="flex" justifyContent="space-between">
              <Button onClick={handlePrevStep}>Back</Button>
              <Button
                variant="contained"
                color="primary"
                onClick={submitResume}
                disabled={isLoading || !resume || !jobDescription.trim()}
              >
                {isLoading ? (
                  <CircularProgress size={24} />
                ) : (
                  "Generate Tailored Resume"
                )}
              </Button>
            </Box>
          </Paper>
        );
      case 3: // Step 3: Edit and Preview
        return (
          <Paper
            elevation={3}
            sx={{ p: 3, my: 2, display: "flex", flexDirection: "column" }}
          >
            <Typography variant="h6" gutterBottom>
              Step 3: Edit and Download
            </Typography>
            {generatedResume ? (
              <Box
                sx={{
                  flexGrow: 1,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Grid container spacing={2}>
                  {" "}
                  {/* Grid Container for horizontal split */}
                  <Grid item xs={12} md={6}>
                    {" "}
                    {/* Edit Section (Left on md, Full width on xs) */}
                    <TextField
                      label="Edit Resume (Markdown)"
                      multiline
                      fullWidth
                      rows={10}
                      value={editedResume}
                      onChange={handleEditedResumeChange}
                      variant="outlined"
                      sx={{ mb: 2 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    {" "}
                    {/* Preview Section (Right on md, Full width on xs) */}
                    <Paper
                      elevation={1}
                      sx={{
                        p: 2,
                        mb: 3,
                        maxHeight: "400px", // Increased maxHeight for preview
                        overflow: "auto",
                        bgcolor: darkMode
                          ? "rgba(255, 255, 255, 0.05)"
                          : "rgba(0, 0, 0, 0.02)",
                        wordWrap: "break-word",
                        overflowWrap: "break-word",
                      }}
                    >
                      <MarkdownPreview>{editedResume}</MarkdownPreview>
                    </Paper>
                  </Grid>
                </Grid>

                <Box display="flex" gap={1} mb={3} mt={2}>
                  {" "}
                  {/* Download Buttons - Moved down */}
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
                {showFeedbackSection && (
                  <Box mt={2}>
                    <Typography variant="subtitle1" gutterBottom>
                      Refine Resume (Optional): Provide feedback for
                      improvements:
                    </Typography>
                    <TextField
                      multiline
                      rows={3}
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
              </Box>
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
                  flexGrow: 1,
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
            <Box mt={2} display="flex" justifyContent="flex-start">
              <Button onClick={handlePrevStep}>Back</Button>
            </Box>
          </Paper>
        );
      default:
        return null;
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="md">
        <Box sx={{ my: 4 }}>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={2}
          >
            <Typography variant="h4" component="h1" gutterBottom>
              Resume Tailor AI
            </Typography>
            <FormControlLabel
              control={<Switch checked={darkMode} onChange={toggleDarkMode} />}
              label={darkMode ? "Dark Mode" : "Light Mode"}
            />
          </Box>

          <Stepper activeStep={step - 1} alternativeLabel sx={{ mb: 3 }}>
            {steps.map((label, index) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {renderStepContent()}
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
