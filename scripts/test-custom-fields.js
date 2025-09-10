const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testCustomFields() {
  console.log('🧪 Testing Bitrix24 Custom Fields Creation');
  console.log(`🌐 Base URL: ${BASE_URL}`);
  console.log('=' * 50);

  const tests = [
    {
      name: 'Create Bank Name Field',
      method: 'POST',
      url: `${BASE_URL}/bitrix24/test-custom-field`,
      data: {
        fieldName: 'UF_CRM_BANK',
        label: 'Tên ngân hàng',
        type: 'string'
      }
    },
    {
      name: 'Create Account Number Field', 
      method: 'POST',
      url: `${BASE_URL}/bitrix24/test-custom-field`,
      data: {
        fieldName: 'UF_CRM_ACCOUNT',
        label: 'Số tài khoản',
        type: 'string'
      }
    },
    {
      name: 'List All Custom Fields',
      method: 'GET',
      url: `${BASE_URL}/bitrix24/list-custom-fields`
    }
  ];

  for (const test of tests) {
    try {
      console.log(`\n⚡ Testing: ${test.name}`);
      
      const config = {
        method: test.method,
        url: test.url,
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (test.data) {
        config.data = test.data;
        console.log(`   📤 Request data:`, JSON.stringify(test.data, null, 2));
      }

      const response = await axios(config);
      
      console.log(`✅ ${test.name}: ${response.status} ${response.statusText}`);
      console.log(`   📥 Response:`, JSON.stringify(response.data, null, 2));
      
    } catch (error) {
      console.log(`❌ ${test.name}: ${error.response?.status || 'Network Error'} ${error.response?.statusText || error.message}`);
      if (error.response?.data) {
        console.log(`   📥 Error Response:`, JSON.stringify(error.response.data, null, 2));
      }
    }
  }

  console.log('\n🎯 Custom Fields Test completed!');
}

// Check command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🧪 Custom Fields Test Script

Usage:
  node scripts/test-custom-fields.js

This script tests:
  1. Creating UF_CRM_BANK custom field
  2. Creating UF_CRM_ACCOUNT custom field  
  3. Listing all custom fields

Make sure your server is running on http://localhost:3000
  `);
  process.exit(0);
}

testCustomFields().catch(console.error);
