import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import FeedbackIcon from "@mui/icons-material/Feedback"; // Feedback Icon
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import VisibilityIcon from "@mui/icons-material/Visibility"; // Preview Icon
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
  styled,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import CssBaseline from "@mui/material/CssBaseline";
import StepConnector from "@mui/material/StepConnector"; // Stepper Connector
import { createTheme, ThemeProvider } from "@mui/material/styles";
import axios from "axios";
import MarkdownPreview from "markdown-to-jsx";
import { useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";

// Custom Stepper connector style
const StepperConnectorStyle = styled(StepConnector)(({ theme }) => ({
  [`&.MuiStepConnector-vertical`]: {
    marginLeft: 10, // Adjust as needed for icon alignment
  },
  [`& .MuiStepConnector-line`]: {
    borderColor: theme.palette.primary.main, // Connector line color
    borderTopWidth: 2, // Make connector line thicker
  },
}));

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
        setStep(2); // Auto move to step 2 after file upload
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
                  <Typography>Drag & Drop Resume or Click to Upload</Typography>
                  <Typography variant="body2" color="textSecondary">
                    (PDF, DOC, DOCX files accepted)
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
                Next: Job Description
              </Button>
            </Box>
          </Paper>
        );
      case 2: // Step 2: Job Description
        return (
          <Paper elevation={3} sx={{ p: 3, my: 2 }}>
            <Typography variant="h6" gutterBottom>
              Step 2: Paste Job Description
            </Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              To tailor your resume effectively, please paste the job
              description below.
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
              sx={{ mb: 3, mt: 1 }}
            />
            <Box mt={2} display="flex" justifyContent="space-between">
              <Button onClick={handlePrevStep}>Back to Upload</Button>
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
          <Paper elevation={3} sx={{ p: 3, my: 2 }}>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              Step 3: Edit & Download <VisibilityIcon color="action" />
            </Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Review and edit the tailored resume. Download in your preferred
              format.
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
                  <Grid item xs={12} md={6} sx={{ pr: { md: 2 } }}>
                    {" "}
                    {/* Added padding right for visual separation on md screens */}
                    <TextField
                      label="Edit Resume (Markdown)"
                      multiline
                      fullWidth
                      rows={21} // Increased rows for better edit area
                      value={editedResume}
                      onChange={handleEditedResumeChange}
                      variant="outlined"
                      sx={{ mb: 2 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Paper
                      elevation={1}
                      sx={{
                        p: 2,
                        mb: 3,
                        maxHeight: "515px", // Increased maxHeight for preview
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

                <Box
                  display="flex"
                  gap={2}
                  mt={2}
                  flexDirection={{ xs: "column", sm: "row" }}
                  alignItems="flex-start"
                >
                  {" "}
                  {/* Download buttons - full width on xs */}
                  <Typography variant="subtitle2" sx={{ mt: 1 }}>
                    Download As:
                  </Typography>
                  <Box display="flex" gap={1}>
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
                </Box>

                {showFeedbackSection && (
                  <Box
                    mt={3}
                    sx={{ borderTop: "1px solid rgba(0, 0, 0, 0.1)", pt: 2 }}
                  >
                    {" "}
                    {/* Separator for feedback */}
                    <Typography
                      variant="subtitle1"
                      gutterBottom
                      sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                    >
                      <FeedbackIcon color="action" /> Refine Resume (Optional)
                    </Typography>
                    <Typography
                      variant="body2"
                      color="textSecondary"
                      gutterBottom
                    >
                      Provide feedback to further improve the tailored resume.
                    </Typography>
                    <TextField
                      multiline
                      rows={3}
                      fullWidth
                      value={feedback}
                      onChange={handleFeedbackChange}
                      placeholder="Suggest improvements or changes..."
                      variant="outlined"
                      sx={{ mb: 2, mt: 1 }}
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
                height="300px" // Increased height for placeholder in step 3
                sx={{
                  bgcolor: darkMode
                    ? "rgba(255, 255, 255, 0.05)"
                    : "rgba(0, 0, 0, 0.02)",
                  borderRadius: 1,
                  flexGrow: 1,
                  p: 3, // Added padding to placeholder box
                  textAlign: "center", // Center text in placeholder
                }}
              >
                <Typography color="textSecondary" variant="h6">
                  {isLoading ? (
                    <CircularProgress size={50} />
                  ) : (
                    "Your tailored resume preview will appear here after generation."
                  )}
                </Typography>
              </Box>
            )}
            <Box mt={3} display="flex" justifyContent="flex-start">
              <Button onClick={handlePrevStep}>Back to Job Description</Button>
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
      <Container maxWidth="lg">
        {" "}
        <Box sx={{ my: 4 }}>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={3} // Increased mb for better spacing below heading
          >
            <Typography
              variant="h4"
              component="h1"
              gutterBottom
              sx={{ fontWeight: 500 }}
            >
              ResumeFy AI{" "}
            </Typography>
            <FormControlLabel
              control={<Switch checked={darkMode} onChange={toggleDarkMode} />}
              label={darkMode ? "Dark Mode" : "Light Mode"}
            />
          </Box>

          <Stepper
            activeStep={step - 1}
            alternativeLabel
            sx={{ mb: 4 }} // Increased mb for stepper spacing
            connector={<StepperConnectorStyle />} // Apply custom connector style
          >
            {steps.map((label, index) => (
              <Step key={label} completed={index < step - 1}>
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
