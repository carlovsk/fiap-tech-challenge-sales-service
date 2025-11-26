import http from 'k6/http';
import { check, fail, sleep } from 'k6';

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

// Test options - run sequentially, not as load test
export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate==1.0'], // All checks must pass
  },
};

// Generate a random UUID for testing
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Test data
const testVehicle = {
  id: generateUUID(),
  brand: 'Honda',
  model: 'Civic',
  year: 2024,
  color: 'Blue',
  price: 32000.00,
  status: 'AVAILABLE',
};

const updatedVehicle = {
  ...testVehicle,
  model: 'Civic Type R',
  color: 'Championship White',
  price: 45000.00,
};

const soldVehicle = {
  ...testVehicle,
  status: 'SOLD',
};

// Helper function for JSON requests
function jsonRequest(method, url, body = null) {
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (method === 'GET' || method === 'DELETE') {
    return http.request(method, url, null, params);
  }
  return http.request(method, url, JSON.stringify(body), params);
}

// Main test function
export default function () {
  // ============================================
  // Test 1: Health Check
  // ============================================
  console.log('🏥 Testing Health Check...');
  
  const healthResponse = http.get(`${BASE_URL}/health`);
  
  const healthCheckPassed = check(healthResponse, {
    'Health check - status is 200': (r) => r.status === 200,
    'Health check - returns healthy: true': (r) => {
      const body = JSON.parse(r.body);
      return body.healthy === true;
    },
    'Health check - has timestamp': (r) => {
      const body = JSON.parse(r.body);
      return body.timestamp !== undefined;
    },
  });

  if (!healthCheckPassed) {
    fail('❌ Health check failed! Stopping tests.');
  }
  
  console.log('✅ Health check passed');
  sleep(0.5);

  // ============================================
  // Test 2: Sync Vehicle (Create)
  // ============================================
  console.log('🔄 Testing Sync Vehicle (Create)...');
  
  const syncCreateResponse = jsonRequest('POST', `${BASE_URL}/api/internal/vehicles/sync`, testVehicle);
  
  const syncCreateCheckPassed = check(syncCreateResponse, {
    'Sync vehicle (create) - status is 200': (r) => r.status === 200,
    'Sync vehicle (create) - success message': (r) => {
      const body = JSON.parse(r.body);
      return body.message === 'Vehicle synced successfully';
    },
    'Sync vehicle (create) - returns vehicle': (r) => {
      const body = JSON.parse(r.body);
      return body.vehicle !== undefined;
    },
    'Sync vehicle (create) - correct ID': (r) => {
      const body = JSON.parse(r.body);
      return body.vehicle.id === testVehicle.id;
    },
    'Sync vehicle (create) - correct brand': (r) => {
      const body = JSON.parse(r.body);
      return body.vehicle.brand === testVehicle.brand;
    },
    'Sync vehicle (create) - correct model': (r) => {
      const body = JSON.parse(r.body);
      return body.vehicle.model === testVehicle.model;
    },
    'Sync vehicle (create) - status is AVAILABLE': (r) => {
      const body = JSON.parse(r.body);
      return body.vehicle.status === 'AVAILABLE';
    },
  });

  if (!syncCreateCheckPassed) {
    fail('❌ Sync vehicle (create) failed! Cannot continue tests.');
  }
  
  console.log(`✅ Vehicle synced (created) with ID: ${testVehicle.id}`);
  sleep(0.5);

  // ============================================
  // Test 3: Sync Vehicle (Update)
  // ============================================
  console.log('🔄 Testing Sync Vehicle (Update)...');
  
  const syncUpdateResponse = jsonRequest('POST', `${BASE_URL}/api/internal/vehicles/sync`, updatedVehicle);
  
  const syncUpdateCheckPassed = check(syncUpdateResponse, {
    'Sync vehicle (update) - status is 200': (r) => r.status === 200,
    'Sync vehicle (update) - success message': (r) => {
      const body = JSON.parse(r.body);
      return body.message === 'Vehicle synced successfully';
    },
    'Sync vehicle (update) - ID unchanged': (r) => {
      const body = JSON.parse(r.body);
      return body.vehicle.id === testVehicle.id;
    },
    'Sync vehicle (update) - model updated': (r) => {
      const body = JSON.parse(r.body);
      return body.vehicle.model === updatedVehicle.model;
    },
    'Sync vehicle (update) - color updated': (r) => {
      const body = JSON.parse(r.body);
      return body.vehicle.color === updatedVehicle.color;
    },
    'Sync vehicle (update) - price updated': (r) => {
      const body = JSON.parse(r.body);
      // Price might be returned as string from Prisma Decimal
      const price = typeof body.vehicle.price === 'string' 
        ? parseFloat(body.vehicle.price) 
        : body.vehicle.price;
      return price === updatedVehicle.price;
    },
  });

  if (!syncUpdateCheckPassed) {
    fail('❌ Sync vehicle (update) failed!');
  }
  
  console.log('✅ Vehicle synced (updated) successfully');
  sleep(0.5);

  // ============================================
  // Test 4: Sync Vehicle (Status Change to SOLD)
  // ============================================
  console.log('🔄 Testing Sync Vehicle (Status Change)...');
  
  const syncStatusResponse = jsonRequest('POST', `${BASE_URL}/api/internal/vehicles/sync`, soldVehicle);
  
  const syncStatusCheckPassed = check(syncStatusResponse, {
    'Sync vehicle (status) - status is 200': (r) => r.status === 200,
    'Sync vehicle (status) - success message': (r) => {
      const body = JSON.parse(r.body);
      return body.message === 'Vehicle synced successfully';
    },
    'Sync vehicle (status) - status changed to SOLD': (r) => {
      const body = JSON.parse(r.body);
      return body.vehicle.status === 'SOLD';
    },
  });

  if (!syncStatusCheckPassed) {
    fail('❌ Sync vehicle (status change) failed!');
  }
  
  console.log('✅ Vehicle status synced to SOLD');
  sleep(0.5);

  // ============================================
  // Test 5: Sync Vehicle - Validation Error (Invalid UUID)
  // ============================================
  console.log('🔄 Testing Sync Vehicle (Validation Error)...');
  
  const invalidVehicle = {
    ...testVehicle,
    id: 'invalid-uuid-format',
  };
  
  const syncValidationResponse = jsonRequest('POST', `${BASE_URL}/api/internal/vehicles/sync`, invalidVehicle);
  
  const syncValidationCheckPassed = check(syncValidationResponse, {
    'Sync vehicle (validation) - status is 400': (r) => r.status === 400,
    'Sync vehicle (validation) - error message': (r) => {
      const body = JSON.parse(r.body);
      return body.error === 'Validation error';
    },
  });

  if (!syncValidationCheckPassed) {
    fail('❌ Sync vehicle validation error test failed!');
  }
  
  console.log('✅ Validation error correctly returned for invalid UUID');
  sleep(0.5);

  // ============================================
  // Test 6: Sync Vehicle - Validation Error (Missing Fields)
  // ============================================
  console.log('🔄 Testing Sync Vehicle (Missing Fields)...');
  
  const incompleteVehicle = {
    id: generateUUID(),
    brand: 'Toyota',
    // Missing required fields: model, year, color, price, status
  };
  
  const syncMissingFieldsResponse = jsonRequest('POST', `${BASE_URL}/api/internal/vehicles/sync`, incompleteVehicle);
  
  const syncMissingFieldsCheckPassed = check(syncMissingFieldsResponse, {
    'Sync vehicle (missing fields) - status is 400': (r) => r.status === 400,
    'Sync vehicle (missing fields) - error message': (r) => {
      const body = JSON.parse(r.body);
      return body.error === 'Validation error';
    },
  });

  if (!syncMissingFieldsCheckPassed) {
    fail('❌ Sync vehicle missing fields test failed!');
  }
  
  console.log('✅ Validation error correctly returned for missing fields');
  
  console.log('\n🎉 All integration tests passed successfully!');
}

// Summary handler
export function handleSummary(data) {
  const passed = data.metrics.checks.values.passes;
  const failed = data.metrics.checks.values.fails;
  const total = passed + failed;
  
  console.log('\n========================================');
  console.log('Integration Test Summary');
  console.log('========================================');
  console.log(`Total Checks: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(2)}%`);
  console.log('========================================\n');
  
  return {};
}

