/**
 * k6 Load Test: Premium Report Generation
 * ========================================
 * Tests AI report generation under load.
 * 
 * Usage:
 *   k6 run scripts/load/k6_premium_report.js
 *   k6 run --vus 10 --duration 2m scripts/load/k6_premium_report.js
 * 
 * Environment:
 *   BASE_URL - API base URL (default: http://localhost:8001)
 *   TEST_EMAIL - Test user email
 *   TEST_PASSWORD - Test user password
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const reportLatency = new Trend('report_generation_latency');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8001';
const TEST_EMAIL = __ENV.TEST_EMAIL || 'test@test.com';
const TEST_PASSWORD = __ENV.TEST_PASSWORD || 'testpassword';

// Load test options
export const options = {
    stages: [
        { duration: '30s', target: 5 },   // Ramp up to 5 users
        { duration: '1m', target: 10 },   // Stay at 10 users
        { duration: '30s', target: 0 },   // Ramp down
    ],
    thresholds: {
        'http_req_duration': ['p(95)<30000'],  // 95% of requests under 30s
        'errors': ['rate<0.1'],                 // Error rate under 10%
        'report_generation_latency': ['p(95)<45000'], // Report gen under 45s
    },
};

// Setup: Login and get token
export function setup() {
    const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
    }), {
        headers: { 'Content-Type': 'application/json' },
    });

    check(loginRes, {
        'login successful': (r) => r.status === 200,
    });

    const data = JSON.parse(loginRes.body);
    
    // Get a result ID from history
    const historyRes = http.get(`${BASE_URL}/api/quiz/history`, {
        headers: { 'Authorization': `Bearer ${data.access_token}` },
    });
    
    const history = JSON.parse(historyRes.body);
    const paidResult = history.results.find(r => r.is_paid);
    
    return {
        token: data.access_token,
        resultId: paidResult ? paidResult.result_id : null,
        userId: data.user.user_id,
    };
}

// Main test scenario
export default function(data) {
    if (!data.token) {
        console.error('No auth token available');
        errorRate.add(1);
        return;
    }

    const headers = {
        'Authorization': `Bearer ${data.token}`,
        'Content-Type': 'application/json',
    };

    group('Premium Report Generation', function() {
        // Skip if no paid result
        if (!data.resultId) {
            console.log('No paid result found, skipping report generation');
            sleep(1);
            return;
        }

        const startTime = Date.now();
        
        // Generate report (force=true to always regenerate)
        const reportRes = http.post(
            `${BASE_URL}/api/report/generate/${data.resultId}?language=id&force=true`,
            null,
            { headers, timeout: '60s' }
        );

        const latency = Date.now() - startTime;
        reportLatency.add(latency);

        const success = check(reportRes, {
            'report generated': (r) => r.status === 200,
            'has content': (r) => {
                try {
                    const body = JSON.parse(r.body);
                    return body.content && body.content.length > 100;
                } catch {
                    return false;
                }
            },
            'has hitl_status': (r) => {
                try {
                    const body = JSON.parse(r.body);
                    return ['approved', 'approved_with_buffer', 'pending_review'].includes(body.hitl_status);
                } catch {
                    return false;
                }
            },
        });

        errorRate.add(!success);

        if (!success) {
            console.error(`Report generation failed: ${reportRes.status} - ${reportRes.body}`);
        }

        // Respect rate limits
        sleep(Math.random() * 2 + 1);
    });

    group('Health Check', function() {
        const healthRes = http.get(`${BASE_URL}/api/health`);
        check(healthRes, {
            'health ok': (r) => r.status === 200,
        });
    });

    sleep(1);
}

// Teardown
export function teardown(data) {
    console.log(`Test completed for user: ${data.userId}`);
}
