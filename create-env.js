// Script to create .env file (ES Module version)
import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envContent = `VITE_API_URL=https://survey-builder-worker.divya-vijayakumar.workers.dev
`;

const envPath = join(__dirname, '.env');

try {
  writeFileSync(envPath, envContent);
  console.log('✅ .env file created successfully!');
  console.log('📁 Location:', envPath);
  console.log('📝 Content:', envContent.trim());
  console.log('\n🔄 Please restart your development server for changes to take effect.');
} catch (error) {
  console.error('❌ Error creating .env file:', error.message);
} 