import { ConfigModule, ConfigService } from '@nestjs/config';
import { Module } from '@nestjs/common';

@Module({
  imports: [ConfigModule.forRoot({
    isGlobal: true,
    envFilePath: ['.env'],
  })],
})
export class AppConfigModule {}

export const config = {
  port: process.env.PORT || 3001,
  googleGenAiApiKey: process.env.GOOGLE_GENAI_API_KEY,
  nodeEnv: process.env.NODE_ENV,
};
