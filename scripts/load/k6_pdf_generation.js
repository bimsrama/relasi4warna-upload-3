/**
 * k6 Load Test: PDF Generation
 * ============================
 * Tests PDF report generation under load.
 * 
 * Usage:
 *   k6 run scripts/load/k6_pdf_generation.js
 *   k6 run --vus 5 --duration 1m scripts/load/k6_pdf_generation.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const pdfLatency = new Trend('pdf_generation_latency');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8001';
const TEST_EMAIL = __ENV.TEST_EMAIL || 'test@test.com';
const TEST_PASSWORD = __ENV.TEST_PASSWORD || 'testpassword';

// Load test options
export const options = {
    stages: [
        { duration: '20s', target: 3 },   // Ramp up
        { duration: '40s', target: 5 },   // Sustain
        { duration: '20s', target: 0 },   // Ramp down
    ],
    thresholds: {
        'http_req_duration': ['p(95)<20000'],  // 95% under 20s
        'errors': ['rate<0.1'],                 // Error rate under 10%
        'pdf_generation_latency': ['p(95)<15000'], // PDF gen under 15s
    },
};

export function setup() {
    const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
    }), {
        headers: { 'Content-Type': 'application/json' },
    });

    const data = JSON.parse(loginRes.body);
    
    const historyRes = http.get(`${BASE_URL}/api/quiz/history`, {
        headers: { 'Authorization': `Bearer ${data.access_token}` },
    });
    
    const history = JSON.parse(historyRes.body);
    const paidResult = history.results.find(r => r.is_paid);
    
    return {
        token: data.access_token,
        resultId: paidResult ? paidResult.result_id : null,
    };
}

export default function(data) {
    if (!data.token || !data.resultId) {
        errorRate.add(1);
        sleep(1);
        return;
    }

    const headers = {
        'Authorization': `Bearer ${data.token}`,
    };

    group('PDF Generation', function() {
        const startTime = Date.now();
        
        // Generate PDF
        const pdfRes = http.get(
            `${BASE_URL}/api/report/pdf/${data.resultId}?language=id`,
            { headers, timeout: '30s', responseType: 'binary' }
        );

        const latency = Date.now() - startTime;
        pdfLatency.add(latency);

        const success = check(pdfRes, {
            'pdf generated': (r) => r.status === 200,
            'is pdf content': (r) => {
                const contentType = r.headers['Content-Type'] || '';
                return contentType.includes('application/pdf');
            },
            'has content': (r) => r.body && r.body.length > 1000,
        });

        errorRate.add(!success);

        if (!success) {
            console.error(`PDF generation failed: ${pdfRes.status}`);
        }
    });

    group('Preview PDF', function() {
        const startTime = Date.now();
        
        const previewRes = http.get(
            `${BASE_URL}/api/report/preview-pdf/${data.resultId}?language=id`,
            { headers, timeout: '30s', responseType: 'binary' }
        );

        const latency = Date.now() - startTime;

        check(previewRes, {
            'preview pdf generated': (r) => r.status === 200,
        });
    });

    sleep(Math.random() * 2 + 1);
}
