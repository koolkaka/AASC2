#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Bitrix24 OAuth NestJS Application...\n');

// Create data directory
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('✅ Created data directory');
}

// Check for .env file
const envPath = path.join(process.cwd(), '.env');
const envExamplePath = path.join(process.cwd(), 'environment.example');

if (!fs.existsSync(envPath)) {
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ Created .env file from environment.example');
    console.log('⚠️  Please update .env file with your Bitrix24 credentials');
  } else {
    console.log('❌ environment.example not found');
  }
} else {
  console.log('✅ .env file already exists');
}

// Check environment variables
const requiredEnvVars = ['CLIENT_ID', 'CLIENT_SECRET', 'BITRIX24_DOMAIN'];
let envValid = true;

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  requiredEnvVars.forEach(envVar => {
    if (!envContent.includes(`${envVar}=`) || envContent.includes(`${envVar}=your_`)) {
      console.log(`❌ ${envVar} not configured in .env`);
      envValid = false;
    }
  });
}

console.log('\n📋 Setup Checklist:');
console.log('1. ✅ Project structure created');
console.log('2. ✅ Dependencies installed (run: npm install)');
console.log(`3. ${envValid ? '✅' : '❌'} Environment variables configured`);
console.log('4. ⏳ Bitrix24 Local Application setup (see README.md)');
console.log('5. ⏳ ngrok tunnel setup (see README.md)');

console.log('\n🔧 Next Steps:');
console.log('1. Update .env file with your Bitrix24 credentials');
console.log('2. Install dependencies: npm install');
console.log('3. Start development server: npm run start:dev');
console.log('4. Setup ngrok tunnel: ngrok http 3000');
console.log('5. Update Bitrix24 app with ngrok URL');
console.log('6. Install/reinstall app in Bitrix24');

console.log('\n📖 For detailed instructions, see README.md');
console.log('🌟 Happy coding!');
