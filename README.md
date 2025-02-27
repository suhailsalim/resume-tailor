# Resume Tailor AI

An AI-powered application that tailors resumes to match job descriptions.

## Features
- Upload resume (PDF, DOC, DOCX)
- Paste job description
- Generate tailored resume with AI
- Provide feedback for refinement
- Download in multiple formats (PDF, DOC, Markdown)
- Dark/Light mode toggle

## Tech Stack
- Frontend: React, Material-UI
- Backend: Node.js, Express, TypeScript
- AI: LangChain.js, OpenAI GPT-4o

## Setup Instructions

### Prerequisites
- Node.js (v14+)
- NPM or Yarn
- OpenAI API key

### Backend Setup
1. Navigate to the backend directory
```
cd backend
```

2. Install dependencies
```
npm install
```

3. Set up environment variables
```
cp .env.example .env
```
Edit the .env file and add your OpenAI API key

4. Start development server
```
npm run dev
```

### Frontend Setup
1. Navigate to the frontend directory
```
cd frontend
```

2. Install dependencies
```
npm install
```

3. Start development server
```
npm start
```

4. Access the application at http://localhost:3000
