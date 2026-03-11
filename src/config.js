import dotenv from 'dotenv';

dotenv.config();

export const config = {
  workspaceDir: process.env.WORKSPACE_DIR || './workspace',
  checkInterval: parseInt(process.env.CHECK_INTERVAL || '600', 10),
  logLevel: process.env.LOG_LEVEL || 'info',
  dryRun: process.env.DRY_RUN === 'true' || process.argv.includes('--dry-run'),
  reviewerHandle: process.env.REVIEWER_HANDLE || 'vheins',
  geminiYolo: process.env.GEMINI_YOLO === 'true',
  fontteToken: process.env.FONTTE_TOKEN,
  whatsappTarget: process.env.WHATSAPP_TARGET,
  whatsappTargets: process.env.WHATSAPP_TARGETS, // New: multiple targets (comma-separated)
  whatsappGroups: process.env.WHATSAPP_GROUPS,   // New: group targets (comma-separated)
  apiPort: parseInt(process.env.API_PORT || '3001', 10),
};
