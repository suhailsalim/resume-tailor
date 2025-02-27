# Create project structure
mkdir resume-tailor
cd resume-tailor

# Initialize backend
mkdir backend
cd backend
npm init -y
npm install express cors multer file-type langchain openai marked puppeteer @types/express @types/cors @types/multer typescript ts-node nodemon
npm install --save-dev @types/node

# Create tsconfig.json
cat > tsconfig.json << EOF
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "**/*.test.ts"]
}
EOF

# Create .env file (add your OpenAI API key)
cat > .env << EOF
PORT=3001
OPENAI_API_KEY=your_openai_api_key_here
EOF

# Create src directory and main file
mkdir -p src
# Copy the backend code to src/index.ts

# Add scripts to package.json
npm pkg set scripts.dev="nodemon --exec ts-node src/index.ts"
npm pkg set scripts.build="tsc"
npm pkg set scripts.start="node dist/index.js"

# Setup frontend
cd ..
npx create-react-app frontend --template typescript
cd frontend

# Install dependencies
npm install @mui/material @mui/icons-material @emotion/react @emotion/styled axios markdown-to-jsx

# Create .env file for frontend
cat > .env << EOF
REACT_APP_API_URL=http://localhost:3001
EOF

# Add proxy to package.json
npm pkg set proxy="http://localhost:3001"

# Create app structure
mkdir -p src/components

# Update frontend code
cd ..

# Create README
cat > README.md << EOF
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
\`\`\`
cd backend
\`\`\`

2. Install dependencies
\`\`\`
npm install
\`\`\`

3. Set up environment variables
\`\`\`
cp .env.example .env
\`\`\`
Edit the .env file and add your OpenAI API key

4. Start development server
\`\`\`
npm run dev
\`\`\`

### Frontend Setup
1. Navigate to the frontend directory
\`\`\`
cd frontend
\`\`\`

2. Install dependencies
\`\`\`
npm install
\`\`\`

3. Start development server
\`\`\`
npm start
\`\`\`

4. Access the application at http://localhost:3000
EOF

echo "Project setup complete!"
