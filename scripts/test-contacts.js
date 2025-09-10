#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Command line arguments
const args = process.argv.slice(2);
const testFilter = args[0]; // specific test name or 'all'
const verbose = args.includes('--verbose') || args.includes('-v');

function showUsage() {
  console.log('🧪 Contact API Test Tool');
  console.log('\n📋 Usage:');
  console.log('  npm run test:contacts [test-id] [--verbose]');
  console.log('  node scripts/test-contacts.js [test-id] [--verbose]');
  console.log('\n🎯 Available tests:');
  console.log('  all (default)    - Run all tests');
  console.log('  health          - Test server health');
  console.log('  domains         - Check authenticated domains');
  console.log('  get-empty       - Get contacts when empty');
  console.log('  create-simple   - Create simple contact');
  console.log('  create-full     - Create full contact with bank info');
  console.log('  get-list        - Get contacts list');
  console.log('  search          - Search contacts');
  console.log('  swagger         - Check Swagger docs');
  console.log('\n🔧 Options:');
  console.log('  --verbose, -v   - Show detailed request/response data');
  console.log('\n💡 Examples:');
  console.log('  npm run test:contacts health           # Test health only');
  console.log('  npm run test:contacts create-simple -v # Verbose create test');
  console.log('  npm run test:contacts all --verbose    # All tests with details');
}

async function testContactAPI() {
  if (args.includes('--help') || args.includes('-h')) {
    showUsage();
    return;
  }

  console.log('🧪 Testing Contact Management API');
  console.log(`🌐 Base URL: ${BASE_URL}`);
  if (testFilter && testFilter !== 'all') {
    console.log(`🎯 Filter: ${testFilter}`);
  }
  if (verbose) {
    console.log('📊 Verbose mode enabled');
  }
  console.log('');

  const tests = [
    {
      id: 'health',
      name: 'Health Check',
      method: 'GET',
      url: `${BASE_URL}/health`,
      description: 'Test server health status'
    },
    {
      id: 'domains',
      name: 'Check Domains',
      method: 'GET',
      url: `${BASE_URL}/domains`,
      description: 'Check authenticated domains'
    },
    {
      id: 'get-empty',
      name: 'Get All Contacts (Empty)',
      method: 'GET', 
      url: `${BASE_URL}/contacts?page=1&limit=5`,
      description: 'Get contacts list when empty'
    },
    {
      id: 'create-simple',
      name: 'Create Simple Contact',
      method: 'POST',
      url: `${BASE_URL}/contacts`,
      description: 'Create contact with basic info only',
      data: {
        name: 'Test Simple Contact',
        email: 'simple@test.com',
        phone: '+84901111111'
      },
    },
    {
      id: 'create-full',
      name: 'Create Full Contact',
      method: 'POST',
      url: `${BASE_URL}/contacts`,
      description: 'Create contact with full information including bank info',
      data: {
        name: 'Nguyễn Văn Test Full',
        lastName: 'Nguyễn',
        phone: '+84901234567',
        email: 'fulltest@example.com',
        website: 'https://test.example.com',
        address: {
          street: '123 Test Street',
          ward: 'Phường Test',
          district: 'Quận Test',
          city: 'TP.HCM'
        },
        bankInfo: {
          bankName: 'Vietcombank',
          accountNumber: '1234567890',
          accountHolder: 'Nguyễn Văn Test'
        },
        comments: 'Contact được tạo từ API test với đầy đủ thông tin'
      },
    },
    {
      id: 'get-list',
      name: 'Get All Contacts (After Create)',
      method: 'GET',
      url: `${BASE_URL}/contacts?page=1&limit=10`,
      description: 'Get contacts list after creating some'
    },
    {
      id: 'search',
      name: 'Search Contacts by Name',
      method: 'GET',
      url: `${BASE_URL}/contacts?search=Test&page=1&limit=5`,
      description: 'Search contacts by name filter'
    },
    {
      id: 'swagger',
      name: 'Check Swagger Documentation',
      method: 'GET',
      url: `${BASE_URL}/api`,
      description: 'Check if Swagger documentation is accessible'
    },
  ];

  // Filter tests if specific test requested
  let testsToRun = tests;
  if (testFilter && testFilter !== 'all') {
    testsToRun = tests.filter(test => 
      test.id === testFilter || 
      test.name.toLowerCase().includes(testFilter.toLowerCase())
    );
    
    if (testsToRun.length === 0) {
      console.log(`❌ No tests found matching: ${testFilter}`);
      console.log('\n📋 Available tests:');
      tests.forEach(test => {
        console.log(`   ${test.id}: ${test.name}`);
      });
      return;
    }
  }

  console.log(`🎯 Running ${testsToRun.length} test(s)\n`);

  let createdContactId = null;

  for (const test of testsToRun) {
    try {
      console.log(`⚡ Testing: ${test.name}`);
      if (verbose && test.description) {
        console.log(`   📝 ${test.description}`);
      }
      
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
        if (verbose) {
          console.log(`   📤 Request data:`, JSON.stringify(test.data, null, 2));
        }
      }

      const response = await axios(config);
      
      console.log(`✅ ${test.name}: ${response.status} ${response.statusText}`);
      
      if (verbose && response.data) {
        console.log(`   📥 Response:`, JSON.stringify(response.data, null, 2));
      }
      
      if (response.data) {
        if (response.data.success !== undefined) {
          console.log(`   Success: ${response.data.success}`);
        }
        
        // Extract contact ID for future tests
        if ((test.id === 'create-simple' || test.id === 'create-full') && response.data.data?.id) {
          createdContactId = response.data.data.id;
          console.log(`   Created Contact ID: ${createdContactId}`);
        }
        
        if (response.data.data?.total !== undefined) {
          console.log(`   Total Contacts: ${response.data.data.total}`);
        }
        
        if (response.data.data?.contacts && Array.isArray(response.data.data.contacts)) {
          console.log(`   Contacts Retrieved: ${response.data.data.contacts.length}`);
          
          // Show first contact details
          if (response.data.data.contacts.length > 0) {
            const firstContact = response.data.data.contacts[0];
            console.log(`   Sample Contact: ${firstContact.name} (ID: ${firstContact.id})`);
          }
        }
      }
      
    } catch (error) {
      console.log(`❌ ${test.name}: ${error.response?.status || 'ERROR'} ${error.response?.statusText || error.message}`);
      
      if (verbose && error.response?.data) {
        console.log(`   📥 Error Response:`, JSON.stringify(error.response.data, null, 2));
      } else if (error.response?.data) {
        console.log(`   Error: ${error.response.data.error || error.response.data.message || 'Unknown error'}`);
      }
      
      if (verbose && error.config) {
        console.log(`   📤 Request URL: ${error.config.method.toUpperCase()} ${error.config.url}`);
      }
    }
    
    console.log('');
  }

  // Additional tests if contact was created
  if (createdContactId) {
    console.log('🔄 Running additional tests with created contact...\n');
    
    const additionalTests = [
      {
        name: 'Get Contact by ID',
        method: 'GET',
        url: `${BASE_URL}/contacts/${createdContactId}`,
      },
      {
        name: 'Update Contact',
        method: 'PUT',
        url: `${BASE_URL}/contacts/${createdContactId}`,
        data: {
          name: 'Nguyễn Văn Test Updated',
          email: 'updated@example.com',
          comments: 'Contact đã được cập nhật',
        },
      },
      {
        name: 'Get Updated Contact',
        method: 'GET',
        url: `${BASE_URL}/contacts/${createdContactId}`,
      },
      {
        name: 'Delete Contact',
        method: 'DELETE',
        url: `${BASE_URL}/contacts/${createdContactId}`,
      },
      {
        name: 'Verify Contact Deleted',
        method: 'GET',
        url: `${BASE_URL}/contacts/${createdContactId}`,
      },
    ];

    for (const test of additionalTests) {
      try {
        console.log(`⚡ Testing: ${test.name}`);
        
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
        }

        const response = await axios(config);
        
        console.log(`✅ ${test.name}: ${response.status} ${response.statusText}`);
        
        if (response.data?.success !== undefined) {
          console.log(`   Success: ${response.data.success}`);
        }

        if (response.data?.data?.contact) {
          const contact = response.data.data.contact;
          console.log(`   Contact: ${contact.name} (${contact.email})`);
        }
        
      } catch (error) {
        if (test.name === 'Verify Contact Deleted' && error.response?.status === 404) {
          console.log(`✅ ${test.name}: 404 Not Found (Expected - Contact was deleted)`);
        } else {
          console.log(`❌ ${test.name}: ${error.response?.status || 'ERROR'} ${error.response?.statusText || error.message}`);
          
          if (error.response?.data) {
            console.log(`   Error: ${error.response.data.error || error.response.data.message || 'Unknown error'}`);
          }
        }
      }
      
      console.log('');
    }
  }

  console.log('🎯 Contact API Test completed!');
  console.log('💡 Tips:');
  console.log('   - Check server logs for detailed information');
  console.log('   - Visit http://localhost:3000/api for Swagger documentation');
  console.log('   - Ensure Bitrix24 OAuth is properly configured');
}

testContactAPI().catch(error => {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
});
