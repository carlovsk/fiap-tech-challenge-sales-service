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

// Store data between tests
let testVehicleId = generateUUID();
let paymentCode = null;

// Test data
const testVehicle = {
  id: testVehicleId,
  brand: 'Honda',
  model: 'Civic',
  year: 2024,
  color: 'Blue',
  price: 32000.00,
  status: 'AVAILABLE',
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
  // Test 3: Get Available Vehicles
  // ============================================
  console.log('🚗 Testing Get Available Vehicles...');
  
  const availableResponse = jsonRequest('GET', `${BASE_URL}/api/sales/vehicles/available`);
  
  const availableCheckPassed = check(availableResponse, {
    'Get available vehicles - status is 200': (r) => r.status === 200,
    'Get available vehicles - returns array': (r) => {
      const body = JSON.parse(r.body);
      return Array.isArray(body);
    },
    'Get available vehicles - contains synced vehicle': (r) => {
      const body = JSON.parse(r.body);
      return body.some((v) => v.id === testVehicle.id);
    },
    'Get available vehicles - all vehicles are AVAILABLE': (r) => {
      const body = JSON.parse(r.body);
      return body.every((v) => v.status === 'AVAILABLE');
    },
  });

  if (!availableCheckPassed) {
    fail('❌ Get available vehicles failed!');
  }
  
  console.log('✅ Get available vehicles passed');
  sleep(0.5);

  // ============================================
  // Test 4: Get Sold Vehicles (should be empty or not contain our vehicle)
  // ============================================
  console.log('🏷️ Testing Get Sold Vehicles (before purchase)...');
  
  const soldBeforeResponse = jsonRequest('GET', `${BASE_URL}/api/sales/vehicles/sold`);
  
  const soldBeforeCheckPassed = check(soldBeforeResponse, {
    'Get sold vehicles (before) - status is 200': (r) => r.status === 200,
    'Get sold vehicles (before) - returns array': (r) => {
      const body = JSON.parse(r.body);
      return Array.isArray(body);
    },
    'Get sold vehicles (before) - does NOT contain our vehicle': (r) => {
      const body = JSON.parse(r.body);
      return !body.some((v) => v.id === testVehicle.id);
    },
  });

  if (!soldBeforeCheckPassed) {
    fail('❌ Get sold vehicles (before) failed!');
  }
  
  console.log('✅ Get sold vehicles (before purchase) passed');
  sleep(0.5);

  // ============================================
  // Test 5: Purchase Vehicle
  // ============================================
  console.log('💳 Testing Purchase Vehicle...');
  
  const purchaseData = {
    vehicleId: testVehicle.id,
    buyerCpf: '12345678901',
    saleDate: new Date().toISOString(),
  };
  
  const purchaseResponse = jsonRequest('POST', `${BASE_URL}/api/sales/purchase`, purchaseData);
  
  const purchaseCheckPassed = check(purchaseResponse, {
    'Purchase vehicle - status is 201': (r) => r.status === 201,
    'Purchase vehicle - returns sale object': (r) => {
      const body = JSON.parse(r.body);
      return body.sale !== undefined;
    },
    'Purchase vehicle - returns payment object': (r) => {
      const body = JSON.parse(r.body);
      return body.payment !== undefined;
    },
    'Purchase vehicle - correct vehicleId': (r) => {
      const body = JSON.parse(r.body);
      return body.sale.vehicleId === testVehicle.id;
    },
    'Purchase vehicle - correct buyerCpf': (r) => {
      const body = JSON.parse(r.body);
      return body.sale.buyerCpf === purchaseData.buyerCpf;
    },
    'Purchase vehicle - payment status is PENDING': (r) => {
      const body = JSON.parse(r.body);
      return body.payment.status === 'PENDING';
    },
    'Purchase vehicle - has paymentCode': (r) => {
      const body = JSON.parse(r.body);
      if (body.payment.paymentCode) {
        paymentCode = body.payment.paymentCode;
        return true;
      }
      return false;
    },
  });

  if (!purchaseCheckPassed || !paymentCode) {
    fail('❌ Purchase vehicle failed! Cannot continue tests.');
  }
  
  console.log(`✅ Purchase completed with paymentCode: ${paymentCode}`);
  sleep(0.5);

  // ============================================
  // Test 6: Get Available Vehicles (after purchase - should NOT contain our vehicle)
  // ============================================
  console.log('🚗 Testing Get Available Vehicles (after purchase)...');
  
  const availableAfterResponse = jsonRequest('GET', `${BASE_URL}/api/sales/vehicles/available`);
  
  const availableAfterCheckPassed = check(availableAfterResponse, {
    'Get available vehicles (after) - status is 200': (r) => r.status === 200,
    'Get available vehicles (after) - does NOT contain purchased vehicle': (r) => {
      const body = JSON.parse(r.body);
      return !body.some((v) => v.id === testVehicle.id);
    },
  });

  if (!availableAfterCheckPassed) {
    fail('❌ Get available vehicles (after purchase) failed!');
  }
  
  console.log('✅ Get available vehicles (after purchase) passed');
  sleep(0.5);

  // ============================================
  // Test 7: Get Sold Vehicles (after purchase - should contain our vehicle)
  // ============================================
  console.log('🏷️ Testing Get Sold Vehicles (after purchase)...');
  
  const soldAfterResponse = jsonRequest('GET', `${BASE_URL}/api/sales/vehicles/sold`);
  
  const soldAfterCheckPassed = check(soldAfterResponse, {
    'Get sold vehicles (after) - status is 200': (r) => r.status === 200,
    'Get sold vehicles (after) - contains purchased vehicle': (r) => {
      const body = JSON.parse(r.body);
      return body.some((v) => v.id === testVehicle.id);
    },
    'Get sold vehicles (after) - vehicle status is SOLD': (r) => {
      const body = JSON.parse(r.body);
      const vehicle = body.find((v) => v.id === testVehicle.id);
      return vehicle && vehicle.status === 'SOLD';
    },
  });

  if (!soldAfterCheckPassed) {
    fail('❌ Get sold vehicles (after purchase) failed!');
  }
  
  console.log('✅ Get sold vehicles (after purchase) passed');
  sleep(0.5);

  // ============================================
  // Test 8: Payment Webhook - Confirm Payment
  // ============================================
  console.log('💰 Testing Payment Webhook (confirm)...');
  
  const confirmPaymentData = {
    paymentCode: paymentCode,
    status: 'confirmed',
  };
  
  const confirmPaymentResponse = jsonRequest('POST', `${BASE_URL}/api/sales/payment/webhook`, confirmPaymentData);
  
  const confirmPaymentCheckPassed = check(confirmPaymentResponse, {
    'Payment webhook (confirm) - status is 200': (r) => r.status === 200,
    'Payment webhook (confirm) - success message': (r) => {
      const body = JSON.parse(r.body);
      return body.message === 'Payment status updated successfully';
    },
  });

  if (!confirmPaymentCheckPassed) {
    fail('❌ Payment webhook (confirm) failed!');
  }
  
  console.log('✅ Payment webhook (confirm) passed');
  sleep(0.5);

  // ============================================
  // Test 9: Payment Webhook - Invalid Payment Code (404)
  // ============================================
  console.log('💰 Testing Payment Webhook (invalid code)...');
  
  const invalidPaymentData = {
    paymentCode: 'invalid-payment-code-12345',
    status: 'confirmed',
  };
  
  const invalidPaymentResponse = jsonRequest('POST', `${BASE_URL}/api/sales/payment/webhook`, invalidPaymentData);
  
  const invalidPaymentCheckPassed = check(invalidPaymentResponse, {
    'Payment webhook (invalid) - status is 404': (r) => r.status === 404,
    'Payment webhook (invalid) - payment not found error': (r) => {
      const body = JSON.parse(r.body);
      return body.error === 'Payment not found';
    },
  });

  if (!invalidPaymentCheckPassed) {
    fail('❌ Payment webhook (invalid code) test failed!');
  }
  
  console.log('✅ Payment webhook (invalid code) correctly returned 404');
  sleep(0.5);

  // ============================================
  // Test 10: Purchase - Vehicle Not Found (404)
  // ============================================
  console.log('💳 Testing Purchase (vehicle not found)...');
  
  const invalidPurchaseData = {
    vehicleId: generateUUID(), // Random non-existent UUID
    buyerCpf: '12345678901',
    saleDate: new Date().toISOString(),
  };
  
  const invalidPurchaseResponse = jsonRequest('POST', `${BASE_URL}/api/sales/purchase`, invalidPurchaseData);
  
  const invalidPurchaseCheckPassed = check(invalidPurchaseResponse, {
    'Purchase (not found) - status is 404': (r) => r.status === 404,
    'Purchase (not found) - vehicle not found error': (r) => {
      const body = JSON.parse(r.body);
      return body.error === 'Vehicle not found';
    },
  });

  if (!invalidPurchaseCheckPassed) {
    fail('❌ Purchase (vehicle not found) test failed!');
  }
  
  console.log('✅ Purchase (vehicle not found) correctly returned 404');
  sleep(0.5);

  // ============================================
  // Test 11: Purchase - Vehicle Not Available (400)
  // ============================================
  console.log('💳 Testing Purchase (vehicle not available)...');
  
  // Try to purchase the same vehicle again (already sold)
  const notAvailablePurchaseData = {
    vehicleId: testVehicle.id, // Already sold vehicle
    buyerCpf: '98765432100',
    saleDate: new Date().toISOString(),
  };
  
  const notAvailablePurchaseResponse = jsonRequest('POST', `${BASE_URL}/api/sales/purchase`, notAvailablePurchaseData);
  
  const notAvailablePurchaseCheckPassed = check(notAvailablePurchaseResponse, {
    'Purchase (not available) - status is 400': (r) => r.status === 400,
    'Purchase (not available) - vehicle not available error': (r) => {
      const body = JSON.parse(r.body);
      return body.error === 'Vehicle is not available for purchase';
    },
  });

  if (!notAvailablePurchaseCheckPassed) {
    fail('❌ Purchase (vehicle not available) test failed!');
  }
  
  console.log('✅ Purchase (vehicle not available) correctly returned 400');
  sleep(0.5);

  // ============================================
  // Test 12: Purchase - Validation Error (invalid CPF)
  // ============================================
  console.log('💳 Testing Purchase (validation error)...');
  
  // First sync a new available vehicle for this test
  const newVehicle = {
    id: generateUUID(),
    brand: 'Toyota',
    model: 'Camry',
    year: 2024,
    color: 'White',
    price: 28000.00,
    status: 'AVAILABLE',
  };
  
  jsonRequest('POST', `${BASE_URL}/api/internal/vehicles/sync`, newVehicle);
  
  const invalidCpfPurchaseData = {
    vehicleId: newVehicle.id,
    buyerCpf: '123', // Too short CPF
    saleDate: new Date().toISOString(),
  };
  
  const invalidCpfPurchaseResponse = jsonRequest('POST', `${BASE_URL}/api/sales/purchase`, invalidCpfPurchaseData);
  
  const invalidCpfPurchaseCheckPassed = check(invalidCpfPurchaseResponse, {
    'Purchase (validation) - status is 400': (r) => r.status === 400,
    'Purchase (validation) - validation error': (r) => {
      const body = JSON.parse(r.body);
      return body.error === 'Validation error';
    },
  });

  if (!invalidCpfPurchaseCheckPassed) {
    fail('❌ Purchase (validation error) test failed!');
  }
  
  console.log('✅ Purchase (validation error) correctly returned 400');
  sleep(0.5);

  // ============================================
  // Test 13: Sync Vehicle - Validation Error (Invalid UUID)
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
  
  console.log('✅ Sync validation error correctly returned 400');
  
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
