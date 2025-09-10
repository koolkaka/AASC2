#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const DOMAIN = process.argv[2];

if (!DOMAIN) {
  console.log('❌ Usage: node scripts/test-api.js <your-domain.bitrix24.com>');
  process.exit(1);
}

async function testAPI() {
  console.log(`🧪 Testing API for domain: ${DOMAIN}`);
  console.log(`🌐 Base URL: ${BASE_URL}\n`);

  const tests = [
    {
      name: 'Health Check',
      method: 'GET',
      url: `${BASE_URL}/health`,
    },
    {
      name: 'Domain List',
      method: 'GET',
      url: `${BASE_URL}/domains`,
    },
    {
      name: 'API Test',
      method: 'GET',
      url: `${BASE_URL}/test/${DOMAIN}`,
    },
    {
      name: 'Get Contacts',
      method: 'GET',
      url: `${BASE_URL}/contacts/${DOMAIN}?limit=5`,
    },
    {
      name: 'Generic API Call (crm.contact.list)',
      method: 'POST',
      url: `${BASE_URL}/api/${DOMAIN}/crm.contact.list`,
      data: {
        select: ['ID', 'NAME', 'LAST_NAME', 'EMAIL'],
        start: 0,
        limit: 3,
      },
    },
  ];

  for (const test of tests) {
    try {
      console.log(`⚡ Testing: ${test.name}`);
      
      const config = {
        method: test.method,
        url: test.url,
        timeout: 10000,
      };

      if (test.data) {
        config.data = test.data;
        config.headers = {
          'Content-Type': 'application/json',
        };
      }

      const response = await axios(config);
      
      console.log(`✅ ${test.name}: ${response.status} ${response.statusText}`);
      
      if (response.data) {
        if (response.data.success !== undefined) {
          console.log(`   Success: ${response.data.success}`);
        }
        if (response.data.domain) {
          console.log(`   Domain: ${response.data.domain}`);
        }
        if (response.data.count !== undefined) {
          console.log(`   Count: ${response.data.count}`);
        }
        if (response.data.data && Array.isArray(response.data.data)) {
          console.log(`   Records: ${response.data.data.length}`);
        }
        if (response.data.result && Array.isArray(response.data.result)) {
          console.log(`   Results: ${response.data.result.length}`);
        }
      }
      
    } catch (error) {
      console.log(`❌ ${test.name}: ${error.response?.status || 'ERROR'} ${error.response?.statusText || error.message}`);
      
      if (error.response?.data) {
        console.log(`   Error: ${error.response.data.error || error.response.data.message || 'Unknown error'}`);
      }
    }
    
    console.log('');
  }

  console.log('🎯 Test completed!');
  console.log('💡 Tip: Check server logs for detailed information');
}

testAPI().catch(error => {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
});
