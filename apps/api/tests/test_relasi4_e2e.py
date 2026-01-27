"""
RELASI4™ End-to-End API Tests
=============================
Comprehensive E2E testing for the RELASI4™ quiz application.
Tests: Login, Start Assessment, Submit Quiz, Get History, Free Teaser

Test User: test@test.com / testpassword
"""

import pytest
import requests
import os
import time

# Get BASE_URL from environment
# Prefer explicit BASE_URL (tests), fallback to REACT_APP_BACKEND_URL (frontend build),
# then fallback to local docker default.
BASE_URL = (os.environ.get('BASE_URL') or os.environ.get('REACT_APP_BACKEND_URL') or '').rstrip('/')
if not BASE_URL:
    # Default for self-host / local runs
    BASE_URL = "http://localhost:8001"
    
# Normalize: allow passing just domain without /api
BASE_URL = BASE_URL.rstrip('/')

# Test credentials
TEST_EMAIL = "test@test.com"
TEST_PASSWORD = "testpassword"
ADMIN_EMAIL = "admin@relasi4warna.com"
ADMIN_PASSWORD = "Admin123!"

# Question set for testing
QUESTION_SET_CODE = "R4T_DEEP_V1"


class TestHealthCheck:
    """Basic health check tests"""
    
    def test_api_health(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print(f"✓ API health check passed: {data}")


class TestAuthentication:
    """Authentication flow tests"""
    
    def test_login_success(self):
        """Test successful login with test user"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        # Handle rate limiting
        if response.status_code == 429:
            pytest.skip("Rate limited - skipping login test")
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        # API returns access_token, not token
        assert "access_token" in data, f"No access_token in response: {data.keys()}"
        assert "user" in data, "No user in response"
        print(f"✓ Login successful for {TEST_EMAIL}")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "invalid@test.com", "password": "wrongpassword"}
        )
        # Handle rate limiting
        if response.status_code == 429:
            pytest.skip("Rate limited - skipping test")
        assert response.status_code in [401, 400], f"Expected 401/400, got {response.status_code}"
        print("✓ Invalid login correctly rejected")
    
    def test_get_current_user(self):
        """Test getting current user info"""
        # First login
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        if login_response.status_code == 429:
            pytest.skip("Rate limited - skipping test")
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        
        # Get user info
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("email") == TEST_EMAIL
        print(f"✓ Current user retrieved: {data.get('email')}")


class TestRelasi4QuestionSets:
    """Question set API tests"""
    
    def test_list_question_sets(self):
        """Test listing available question sets"""
        response = requests.get(f"{BASE_URL}/api/relasi4/question-sets")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Expected list of question sets"
        
        # Check if R4T_DEEP_V1 exists
        set_codes = [s.get("code") for s in data]
        assert QUESTION_SET_CODE in set_codes, f"{QUESTION_SET_CODE} not found in question sets"
        print(f"✓ Found {len(data)} question sets: {set_codes}")
    
    def test_get_questions_for_set(self):
        """Test getting questions for a specific set"""
        response = requests.get(f"{BASE_URL}/api/relasi4/questions/{QUESTION_SET_CODE}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Expected list of questions"
        assert len(data) > 0, "No questions found"
        
        # Verify question structure
        first_q = data[0]
        assert "order_no" in first_q
        assert "prompt" in first_q
        assert "answers" in first_q
        print(f"✓ Retrieved {len(data)} questions for {QUESTION_SET_CODE}")


class TestRelasi4Assessment:
    """Assessment flow tests - Start, Submit, Verify"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        if response.status_code == 429:
            pytest.skip("Rate limited - skipping authenticated tests")
        if response.status_code != 200:
            pytest.skip("Login failed - skipping authenticated tests")
        return response.json()["access_token"]
    
    def test_start_assessment(self, auth_token):
        """Test starting a new assessment"""
        response = requests.post(
            f"{BASE_URL}/api/relasi4/assessments/start",
            json={"question_set_code": QUESTION_SET_CODE, "language": "id"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Start assessment failed: {response.text}"
        data = response.json()
        
        assert "assessment_id" in data, "No assessment_id in response"
        assert data.get("question_set_code") == QUESTION_SET_CODE
        assert data.get("total_questions") > 0
        print(f"✓ Assessment started: {data['assessment_id']}, {data['total_questions']} questions")
    
    def test_submit_assessment_and_verify_persistence(self, auth_token):
        """Test submitting assessment answers and verify data is saved to database"""
        # Step 1: Start assessment
        start_response = requests.post(
            f"{BASE_URL}/api/relasi4/assessments/start",
            json={"question_set_code": QUESTION_SET_CODE, "language": "id"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert start_response.status_code == 200
        assessment_id = start_response.json()["assessment_id"]
        print(f"✓ Started assessment: {assessment_id}")
        
        # Step 2: Get questions to know how many answers to submit
        questions_response = requests.get(f"{BASE_URL}/api/relasi4/questions/{QUESTION_SET_CODE}")
        assert questions_response.status_code == 200
        questions = questions_response.json()
        
        # Step 3: Generate answers (cycle through A, B, C, D)
        labels = ["A", "B", "C", "D"]
        answers = []
        for i, q in enumerate(questions):
            answers.append({
                "order_no": q["order_no"],
                "label": labels[i % 4]
            })
        
        print(f"✓ Generated {len(answers)} answers for submission")
        
        # Step 4: Submit assessment
        submit_response = requests.post(
            f"{BASE_URL}/api/relasi4/assessments/submit",
            json={
                "assessment_id": assessment_id,
                "answers": answers
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert submit_response.status_code == 200, f"Submit failed: {submit_response.text}"
        result = submit_response.json()
        
        # Verify result structure
        assert result.get("assessment_id") == assessment_id
        assert "primary_color" in result
        assert "secondary_color" in result
        assert "color_scores" in result
        assert result.get("questions_answered") > 0
        print(f"✓ Assessment submitted successfully")
        print(f"  Primary color: {result.get('primary_color')}")
        print(f"  Secondary color: {result.get('secondary_color')}")
        
        # Step 5: VERIFY PERSISTENCE - Get assessment result from database
        get_response = requests.get(
            f"{BASE_URL}/api/relasi4/assessments/{assessment_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert get_response.status_code == 200, f"Get assessment failed: {get_response.text}"
        saved_result = get_response.json()
        
        # Verify saved data matches submitted data
        assert saved_result.get("assessment_id") == assessment_id
        assert saved_result.get("primary_color") == result.get("primary_color")
        assert saved_result.get("secondary_color") == result.get("secondary_color")
        print(f"✓ VERIFIED: Assessment data persisted to database correctly")


class TestRelasi4History:
    """Assessment history tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        if response.status_code == 429:
            pytest.skip("Rate limited - skipping authenticated tests")
        if response.status_code != 200:
            pytest.skip("Login failed - skipping authenticated tests")
        return response.json()["access_token"]
    
    def test_get_assessment_history(self, auth_token):
        """Test getting user's assessment history"""
        response = requests.get(
            f"{BASE_URL}/api/relasi4/assessments/history",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Get history failed: {response.text}"
        data = response.json()
        
        assert "assessments" in data
        print(f"✓ Retrieved {len(data.get('assessments', []))} assessments in history")


class TestRelasi4FreeTeaser:
    """Free teaser endpoint tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        if response.status_code == 429:
            pytest.skip("Rate limited - skipping authenticated tests")
        if response.status_code != 200:
            pytest.skip("Login failed - skipping authenticated tests")
        return response.json()["access_token"]
    
    def test_get_free_teaser(self, auth_token):
        """Test getting free teaser for an assessment"""
        # First, get an existing assessment from history
        history_response = requests.get(
            f"{BASE_URL}/api/relasi4/assessments/history",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        if history_response.status_code != 200:
            pytest.skip("Could not get history")
        
        assessments = history_response.json().get("assessments", [])
        if not assessments:
            # Create a new assessment first
            start_response = requests.post(
                f"{BASE_URL}/api/relasi4/assessments/start",
                json={"question_set_code": QUESTION_SET_CODE, "language": "id"},
                headers={"Authorization": f"Bearer {auth_token}"}
            )
            assessment_id = start_response.json()["assessment_id"]
            
            # Submit with minimal answers
            questions_response = requests.get(f"{BASE_URL}/api/relasi4/questions/{QUESTION_SET_CODE}")
            questions = questions_response.json()
            answers = [{"order_no": q["order_no"], "label": "A"} for q in questions]
            
            requests.post(
                f"{BASE_URL}/api/relasi4/assessments/submit",
                json={"assessment_id": assessment_id, "answers": answers},
                headers={"Authorization": f"Bearer {auth_token}"}
            )
        else:
            assessment_id = assessments[0].get("assessment_id")
        
        # Get free teaser
        response = requests.get(
            f"{BASE_URL}/api/relasi4/free-teaser/{assessment_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Get teaser failed: {response.text}"
        data = response.json()
        
        # Verify teaser structure
        assert "assessment_id" in data
        assert "primary_color" in data
        assert "primary_archetype" in data
        assert "teaser_title" in data
        assert "teaser_description" in data
        assert "strengths_preview" in data
        assert "report_price" in data
        print(f"✓ Free teaser retrieved for {assessment_id}")
        print(f"  Primary archetype: {data.get('primary_archetype_name')}")
        print(f"  Report price: {data.get('report_price_formatted')}")


class TestRelasi4FullE2EFlow:
    """Complete E2E flow test - Login → Start → Submit → Verify → History → Teaser"""
    
    def test_complete_e2e_flow(self):
        """Test the complete user journey"""
        print("\n" + "="*60)
        print("RELASI4™ Complete E2E Flow Test")
        print("="*60)
        
        # Step 1: Login
        print("\n[Step 1] Login...")
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        if login_response.status_code == 429:
            pytest.skip("Rate limited - please wait and retry")
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        token = login_response.json()["access_token"]
        user = login_response.json()["user"]
        print(f"✓ Logged in as: {user.get('email')}")
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # Step 2: Check available question sets
        print("\n[Step 2] Check question sets...")
        sets_response = requests.get(f"{BASE_URL}/api/relasi4/question-sets")
        assert sets_response.status_code == 200
        sets = sets_response.json()
        print(f"✓ Available sets: {[s['code'] for s in sets]}")
        
        # Step 3: Start assessment
        print("\n[Step 3] Start assessment...")
        start_response = requests.post(
            f"{BASE_URL}/api/relasi4/assessments/start",
            json={"question_set_code": QUESTION_SET_CODE, "language": "id"},
            headers=headers
        )
        assert start_response.status_code == 200, f"Start failed: {start_response.text}"
        assessment_data = start_response.json()
        assessment_id = assessment_data["assessment_id"]
        print(f"✓ Assessment started: {assessment_id}")
        print(f"  Total questions: {assessment_data['total_questions']}")
        
        # Step 4: Get questions
        print("\n[Step 4] Get questions...")
        questions_response = requests.get(f"{BASE_URL}/api/relasi4/questions/{QUESTION_SET_CODE}")
        assert questions_response.status_code == 200
        questions = questions_response.json()
        print(f"✓ Retrieved {len(questions)} questions")
        
        # Step 5: Submit answers
        print("\n[Step 5] Submit answers...")
        labels = ["A", "B", "C", "D"]
        answers = [{"order_no": q["order_no"], "label": labels[i % 4]} for i, q in enumerate(questions)]
        
        submit_response = requests.post(
            f"{BASE_URL}/api/relasi4/assessments/submit",
            json={"assessment_id": assessment_id, "answers": answers},
            headers=headers
        )
        assert submit_response.status_code == 200, f"Submit failed: {submit_response.text}"
        result = submit_response.json()
        print(f"✓ Assessment submitted successfully")
        print(f"  Primary color: {result.get('primary_color')}")
        print(f"  Primary archetype: {result.get('primary_archetype')}")
        print(f"  Secondary color: {result.get('secondary_color')}")
        print(f"  Questions answered: {result.get('questions_answered')}")
        
        # Step 6: Verify data persistence
        print("\n[Step 6] Verify data persistence...")
        get_response = requests.get(
            f"{BASE_URL}/api/relasi4/assessments/{assessment_id}",
            headers=headers
        )
        assert get_response.status_code == 200, f"Get assessment failed: {get_response.text}"
        saved = get_response.json()
        assert saved["assessment_id"] == assessment_id
        assert saved["primary_color"] == result["primary_color"]
        print(f"✓ Data verified in database")
        
        # Step 7: Check history
        print("\n[Step 7] Check assessment history...")
        history_response = requests.get(
            f"{BASE_URL}/api/relasi4/assessments/history",
            headers=headers
        )
        assert history_response.status_code == 200
        history = history_response.json()
        print(f"✓ History contains {len(history.get('assessments', []))} assessments")
        
        # Step 8: Get free teaser
        print("\n[Step 8] Get free teaser...")
        teaser_response = requests.get(
            f"{BASE_URL}/api/relasi4/free-teaser/{assessment_id}",
            headers=headers
        )
        assert teaser_response.status_code == 200, f"Teaser failed: {teaser_response.text}"
        teaser = teaser_response.json()
        print(f"✓ Free teaser retrieved")
        print(f"  Title: {teaser.get('teaser_title')}")
        print(f"  Archetype: {teaser.get('primary_archetype_name')}")
        print(f"  Price: {teaser.get('report_price_formatted')}")
        
        print("\n" + "="*60)
        print("✓ COMPLETE E2E FLOW PASSED")
        print("="*60)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
