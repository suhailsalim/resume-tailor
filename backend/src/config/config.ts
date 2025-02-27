import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') }); // Load .env from project root

interface Config {
  port: string | number;
  googleGenAiApiKey: string | undefined;
  nodeEnv: string | undefined;
}

const config: Config = {
  port: process.env.PORT || 3001,
  googleGenAiApiKey: process.env.GOOGLE_GENAI_API_KEY,
  nodeEnv: process.env.NODE_ENV,
};

export default config;