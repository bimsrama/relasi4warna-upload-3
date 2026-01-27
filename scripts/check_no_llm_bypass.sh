#!/bin/bash
#===============================================================================
# CI Check: No LLM Bypass
#===============================================================================
# This script ensures no code in the application bypasses the LLM Gateway.
# Run this in CI before merging any code.
#
# Exit codes:
#   0 - All checks passed
#   1 - LLM bypass detected
#===============================================================================

set -e

echo "🔍 Checking for LLM Gateway bypasses..."
echo "========================================"

# Files that are ALLOWED to have direct OpenAI imports
# These are the ONLY authorized locations for OpenAI SDK usage
ALLOWED_FILES=(
    "packages/ai_gateway/llm_provider_adapter.py"
    "packages/ai_provider/provider.py"
    # LEGACY: These files are deprecated and should be refactored
    # TODO: Remove these exceptions once migration is complete
    "apps/api/services/llm_provider.py"
)

# Patterns that indicate bypass
BYPASS_PATTERNS=(
    "from openai import"
    "import openai"
)

# Directories to check
CHECK_DIRS=(
    "apps/api"
    "packages/security"
    "packages/core"
)

# Function to check if file is in allowed list
is_allowed() {
    local file="$1"
    for allowed in "${ALLOWED_FILES[@]}"; do
        if [[ "$file" == *"$allowed" ]]; then
            return 0
        fi
    done
    return 1
}

BYPASS_FOUND=0
ISSUES=""
LEGACY_WARNINGS=""

# Check each directory
for dir in "${CHECK_DIRS[@]}"; do
    if [[ ! -d "/app/$dir" ]]; then
        continue
    fi
    
    # Find all Python files
    while IFS= read -r -d '' file; do
        # Skip allowed files
        if is_allowed "$file"; then
            # Check if it's a legacy file
            if [[ "$file" == *"services/llm_provider.py"* ]]; then
                LEGACY_WARNINGS="$LEGACY_WARNINGS\n⚠️  LEGACY: $file - Should be migrated to ai_gateway"
            fi
            continue
        fi
        
        # Check for bypass patterns
        for pattern in "${BYPASS_PATTERNS[@]}"; do
            if grep -q "$pattern" "$file" 2>/dev/null; then
                BYPASS_FOUND=1
                ISSUES="$ISSUES\n❌ $file: Found '$pattern'"
            fi
        done
    done < <(find "/app/$dir" -name "*.py" -print0)
done

# Also check that gateway imports are used correctly
echo ""
echo "📦 Checking for proper gateway usage..."
echo "----------------------------------------"

# Check that server.py imports from ai_gateway
if grep -q "from ai_gateway import" /app/apps/api/server.py 2>/dev/null; then
    echo "✅ server.py imports from ai_gateway package"
else
    echo "⚠️  Warning: server.py should import from ai_gateway package"
fi

# Check for direct get_ai() calls that should use gateway
DIRECT_CALLS=$(grep -n "get_ai()\." /app/apps/api/server.py 2>/dev/null | wc -l)
if [[ $DIRECT_CALLS -gt 0 ]]; then
    echo "⚠️  Warning: Found $DIRECT_CALLS direct get_ai() calls that should use ai_gateway"
    echo "   These should be migrated to call_llm_guarded() for full guardrail enforcement"
fi

# Show legacy warnings
if [[ -n "$LEGACY_WARNINGS" ]]; then
    echo ""
    echo "📋 Legacy files (pending migration):"
    echo "------------------------------------"
    echo -e "$LEGACY_WARNINGS"
fi

# Report results
echo ""
echo "========================================"
if [[ $BYPASS_FOUND -eq 1 ]]; then
    echo "❌ LLM BYPASS DETECTED!"
    echo -e "$ISSUES"
    echo ""
    echo "All LLM calls must go through the ai_gateway package."
    echo "Only packages/ai_gateway/llm_provider_adapter.py is allowed to import OpenAI directly."
    exit 1
else
    echo "✅ No unauthorized LLM bypass detected"
    echo ""
    echo "Note: This check verifies import patterns."
    echo "Runtime behavior should be reviewed in code review."
    exit 0
fi
