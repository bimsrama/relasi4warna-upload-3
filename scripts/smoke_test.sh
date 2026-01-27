#!/bin/bash
# =============================================================================
# RELASI4WARNA + RELASI4™ - Smoke Test Script
# =============================================================================
# Usage: ./scripts/smoke_test.sh https://yourdomain.com
# Exit codes:
#   0 = All tests passed
#   1 = One or more tests failed
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get domain from argument or use default
DOMAIN=${1:-"http://localhost"}

echo "========================================"
echo "  RELASI4WARNA SMOKE TEST"
echo "  Domain: $DOMAIN"
echo "========================================"
echo ""

PASSED=0
FAILED=0

# Function to test endpoint
test_endpoint() {
    local name=$1
    local url=$2
    local expected_status=${3:-200}
    
    echo -n "Testing $name... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" --max-time 30 || echo "000")
    
    if [ "$response" == "$expected_status" ]; then
        echo -e "${GREEN}PASSED${NC} (HTTP $response)"
        ((PASSED++))
    else
        echo -e "${RED}FAILED${NC} (Expected $expected_status, got $response)"
        ((FAILED++))
    fi
}

# Function to test endpoint with JSON response
test_endpoint_json() {
    local name=$1
    local url=$2
    local json_key=$3
    
    echo -n "Testing $name... "
    
    response=$(curl -s "$url" --max-time 30 || echo "{}")
    
    if echo "$response" | grep -q "\"$json_key\""; then
        echo -e "${GREEN}PASSED${NC}"
        ((PASSED++))
    else
        echo -e "${RED}FAILED${NC} (Missing key: $json_key)"
        ((FAILED++))
    fi
}

echo "--- Core Health Checks ---"
test_endpoint "Nginx Health" "$DOMAIN/health"
test_endpoint "Backend API Health" "$DOMAIN/api/health"
test_endpoint "Backend Root" "$DOMAIN/api/"

echo ""
echo "--- Quiz Endpoints ---"
test_endpoint_json "Quiz Archetypes" "$DOMAIN/api/quiz/archetypes" "archetypes"
test_endpoint "Quiz Series" "$DOMAIN/api/quiz/series"

echo ""
echo "--- RELASI4™ Endpoints ---"
test_endpoint_json "RELASI4 Question Sets" "$DOMAIN/api/relasi4/question-sets" "code"
test_endpoint "RELASI4 Analytics Summary" "$DOMAIN/api/relasi4/analytics/summary?days=7"
test_endpoint "RELASI4 Heatmap" "$DOMAIN/api/relasi4/analytics/heatmap?days=7"
test_endpoint "RELASI4 Weekly Insights" "$DOMAIN/api/relasi4/analytics/weekly-insights"

echo ""
echo "--- Frontend ---"
test_endpoint "Frontend Homepage" "$DOMAIN"

echo ""
echo "========================================"
echo "  RESULTS"
echo "========================================"
echo -e "  ${GREEN}Passed:${NC} $PASSED"
echo -e "  ${RED}Failed:${NC} $FAILED"
echo "========================================"

if [ $FAILED -gt 0 ]; then
    echo -e "${RED}Some tests failed!${NC}"
    exit 1
else
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
fi
