// src/types/env.d.ts
declare namespace NodeJS {
  interface ProcessEnv {
    // JWT
    JWT_SECRET: string;
    JWT_REFRESH_SECRET: string;
    JWT_EXPIRES_IN: string;
    JWT_REFRESH_EXPIRES_IN: string;
    
    // Database
    DATABASE_URL: string;
    
    // Server
    PORT?: string;
    NODE_ENV?: 'development' | 'production' | 'test';
    
    // CORS
    CORS_ORIGIN?: string;

  }
}