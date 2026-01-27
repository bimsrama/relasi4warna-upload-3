"""
RELASI4™ API Tests
==================
Tests for Couple Report, Couple Invite, Family Group features
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from review request
TEST_COUPLE_REPORT_ID = "r4c_7d95778b11ca"
TEST_ASSESSMENT_ID = "r4_a7b56fff99a9444c"


class TestRelasi4CoupleReport:
    """Tests for Couple Report viewing"""
    
    def test_get_couple_report_success(self):
        """GET /api/relasi4/reports/{report_id} should return full couple report data"""
        response = requests.get(f"{BASE_URL}/api/relasi4/reports/{TEST_COUPLE_REPORT_ID}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify report type is COUPLE
        assert data.get('report_type') == 'COUPLE', f"Expected COUPLE report type, got {data.get('report_type')}"
        
        # Verify compatibility_score exists in compatibility_summary
        compatibility = data.get('compatibility_summary', {})
        assert 'compatibility_score' in compatibility, "Missing compatibility_score in compatibility_summary"
        assert isinstance(compatibility['compatibility_score'], (int, float)), "compatibility_score should be numeric"
        
        # Verify person profiles exist
        assert 'person_a_profile' in data, "Missing person_a_profile"
        assert 'person_b_profile' in data, "Missing person_b_profile"
        
        print(f"✓ Couple report retrieved successfully with {compatibility['compatibility_score']}% compatibility")
    
    def test_get_couple_report_not_found(self):
        """GET /api/relasi4/reports/{invalid_id} should return 404"""
        response = requests.get(f"{BASE_URL}/api/relasi4/reports/invalid_report_id_12345")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Invalid report ID correctly returns 404")


class TestRelasi4CoupleInvite:
    """Tests for Couple Invite creation and retrieval"""
    
    def test_create_couple_invite_success(self):
        """POST /api/relasi4/couple/invite should create invite link"""
        response = requests.post(
            f"{BASE_URL}/api/relasi4/couple/invite",
            json={"assessment_id": TEST_ASSESSMENT_ID}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify invite_code exists
        assert 'invite_code' in data, "Missing invite_code in response"
        assert len(data['invite_code']) > 0, "invite_code should not be empty"
        
        # Verify invite_link exists
        assert 'invite_link' in data, "Missing invite_link in response"
        assert '/relasi4/couple/join/' in data['invite_link'], "invite_link should contain correct path"
        
        print(f"✓ Couple invite created: {data['invite_code']}")
        
        # Store for next test
        self.__class__.created_invite_code = data['invite_code']
        return data['invite_code']
    
    def test_get_couple_invite_success(self):
        """GET /api/relasi4/couple/invite/{invite_code} should return invite details"""
        # First create an invite
        create_response = requests.post(
            f"{BASE_URL}/api/relasi4/couple/invite",
            json={"assessment_id": TEST_ASSESSMENT_ID}
        )
        invite_code = create_response.json().get('invite_code')
        
        # Then retrieve it
        response = requests.get(f"{BASE_URL}/api/relasi4/couple/invite/{invite_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify invite details
        assert data.get('invite_code') == invite_code, "invite_code mismatch"
        assert 'status' in data, "Missing status in response"
        assert data.get('status') == 'pending', f"Expected pending status, got {data.get('status')}"
        
        print(f"✓ Couple invite retrieved: status={data['status']}")
    
    def test_get_couple_invite_not_found(self):
        """GET /api/relasi4/couple/invite/{invalid_code} should return 404"""
        response = requests.get(f"{BASE_URL}/api/relasi4/couple/invite/INVALID123")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Invalid invite code correctly returns 404")
    
    def test_create_couple_invite_invalid_assessment(self):
        """POST /api/relasi4/couple/invite with invalid assessment should return 404"""
        response = requests.post(
            f"{BASE_URL}/api/relasi4/couple/invite",
            json={"assessment_id": "invalid_assessment_id"}
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Invalid assessment ID correctly returns 404")


class TestRelasi4FamilyGroup:
    """Tests for Family Group creation and retrieval"""
    
    def test_create_family_group_success(self):
        """POST /api/relasi4/family/create should create a family group"""
        response = requests.post(
            f"{BASE_URL}/api/relasi4/family/create",
            json={
                "creator_assessment_id": TEST_ASSESSMENT_ID,
                "family_name": "Test Family",
                "max_members": 4
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify group_id exists
        assert 'group_id' in data, "Missing group_id in response"
        assert data['group_id'].startswith('fam_'), f"group_id should start with 'fam_', got {data['group_id']}"
        
        # Verify invite_code exists
        assert 'invite_code' in data, "Missing invite_code in response"
        assert len(data['invite_code']) > 0, "invite_code should not be empty"
        
        # Verify invite_link exists
        assert 'invite_link' in data, "Missing invite_link in response"
        assert '/relasi4/family/join/' in data['invite_link'], "invite_link should contain correct path"
        
        # Verify family_name
        assert data.get('family_name') == "Test Family", f"family_name mismatch"
        
        # Verify max_members
        assert data.get('max_members') == 4, f"max_members should be 4, got {data.get('max_members')}"
        
        # Verify current_members is 1 (creator)
        assert data.get('current_members') == 1, f"current_members should be 1, got {data.get('current_members')}"
        
        print(f"✓ Family group created: {data['group_id']} with invite code {data['invite_code']}")
        
        # Store for next tests
        self.__class__.created_group_id = data['group_id']
        self.__class__.created_invite_code = data['invite_code']
        return data
    
    def test_get_family_group_by_invite_code(self):
        """GET /api/relasi4/family/invite/{invite_code} should return group info"""
        # First create a group
        create_response = requests.post(
            f"{BASE_URL}/api/relasi4/family/create",
            json={
                "creator_assessment_id": TEST_ASSESSMENT_ID,
                "family_name": "Test Family 2",
                "max_members": 5
            }
        )
        invite_code = create_response.json().get('invite_code')
        
        # Then retrieve by invite code
        response = requests.get(f"{BASE_URL}/api/relasi4/family/invite/{invite_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify group details
        assert 'group_id' in data, "Missing group_id"
        assert data.get('family_name') == "Test Family 2", "family_name mismatch"
        assert data.get('current_members') == 1, "current_members should be 1"
        assert data.get('max_members') == 5, "max_members should be 5"
        assert data.get('status') == 'open', "status should be 'open'"
        assert data.get('can_join') == True, "can_join should be True"
        
        print(f"✓ Family group retrieved by invite code: {data['family_name']}")
    
    def test_get_family_group_by_id(self):
        """GET /api/relasi4/family/group/{group_id} should return full group details"""
        # First create a group
        create_response = requests.post(
            f"{BASE_URL}/api/relasi4/family/create",
            json={
                "creator_assessment_id": TEST_ASSESSMENT_ID,
                "family_name": "Test Family 3",
                "max_members": 6
            }
        )
        group_id = create_response.json().get('group_id')
        
        # Then retrieve by group_id
        response = requests.get(f"{BASE_URL}/api/relasi4/family/group/{group_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify full group details
        assert data.get('group_id') == group_id, "group_id mismatch"
        assert data.get('family_name') == "Test Family 3", "family_name mismatch"
        assert 'members' in data, "Missing members array"
        assert len(data['members']) == 1, "Should have 1 member (creator)"
        assert data['members'][0].get('is_creator') == True, "First member should be creator"
        
        print(f"✓ Family group retrieved by ID: {data['group_id']}")
    
    def test_get_family_invite_not_found(self):
        """GET /api/relasi4/family/invite/{invalid_code} should return 404"""
        response = requests.get(f"{BASE_URL}/api/relasi4/family/invite/INVALID")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Invalid family invite code correctly returns 404")
    
    def test_create_family_group_invalid_assessment(self):
        """POST /api/relasi4/family/create with invalid assessment should return 404"""
        response = requests.post(
            f"{BASE_URL}/api/relasi4/family/create",
            json={
                "creator_assessment_id": "invalid_assessment_id",
                "family_name": "Invalid Family"
            }
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Invalid assessment ID correctly returns 404")


class TestRelasi4TeaserPage:
    """Tests for Teaser page API"""
    
    def test_get_free_teaser_success(self):
        """GET /api/relasi4/free-teaser/{assessment_id} should return teaser data"""
        response = requests.get(f"{BASE_URL}/api/relasi4/free-teaser/{TEST_ASSESSMENT_ID}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify teaser data structure
        assert 'assessment_id' in data, "Missing assessment_id"
        assert data['assessment_id'] == TEST_ASSESSMENT_ID, "assessment_id mismatch"
        
        assert 'primary_color' in data, "Missing primary_color"
        assert 'primary_archetype' in data, "Missing primary_archetype"
        assert 'teaser_title' in data, "Missing teaser_title"
        assert 'teaser_description' in data, "Missing teaser_description"
        assert 'strengths_preview' in data, "Missing strengths_preview"
        assert 'color_scores' in data, "Missing color_scores"
        
        print(f"✓ Free teaser retrieved: {data['primary_archetype']} ({data['primary_color']})")
    
    def test_get_free_teaser_not_found(self):
        """GET /api/relasi4/free-teaser/{invalid_id} should return 404"""
        response = requests.get(f"{BASE_URL}/api/relasi4/free-teaser/invalid_assessment_id")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Invalid assessment ID correctly returns 404")


class TestRelasi4ReportByAssessment:
    """Tests for getting report by assessment ID"""
    
    def test_get_report_by_assessment(self):
        """GET /api/relasi4/reports/by-assessment/{assessment_id} should return report status"""
        response = requests.get(f"{BASE_URL}/api/relasi4/reports/by-assessment/{TEST_ASSESSMENT_ID}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert 'exists' in data, "Missing 'exists' field"
        assert isinstance(data['exists'], bool), "'exists' should be boolean"
        
        if data['exists']:
            assert 'report' in data, "Missing 'report' when exists=True"
            print(f"✓ Report exists for assessment: {data['report'].get('report_id', 'N/A')}")
        else:
            print("✓ No report exists for assessment (expected for some cases)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
