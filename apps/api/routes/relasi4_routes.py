"""
RELASI4™ API Routes
===================
API endpoints for the RELASI4™ Core Engine.

Endpoints:
- GET /api/relasi4/question-sets: List available question sets
- GET /api/relasi4/questions/{set_code}: Get questions for a set
- POST /api/relasi4/assessments/start: Start a new assessment
- POST /api/relasi4/assessments/submit: Submit answers and get scores
- GET /api/relasi4/assessments/{assessment_id}: Get assessment result
- GET /api/relasi4/assessments: List user's assessments
- POST /api/relasi4/payment/create: Create payment for premium report
- POST /api/relasi4/payment/webhook: Handle Midtrans webhook
- GET /api/relasi4/payment/status/{payment_id}: Get payment status
"""

from fastapi import APIRouter, HTTPException, Depends, Request, Header
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import uuid
import sys
import os
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# Add packages to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "packages"))

from relasi4tm import (
    RELASI4ScoringService,
    ScoringResult,
    UserAnswer,
    get_scoring_service,
    DIMENSIONS_CANONICAL,
    COLOR_DIMENSIONS,
    DIMENSION_LABELS,
    color_to_archetype,
    get_color_hex,
    get_conflict_description,
)

# Router for RELASI4™ endpoints
relasi4_router = APIRouter(prefix="/relasi4", tags=["relasi4"])


# ==================== MODELS ====================

class QuestionSetResponse(BaseModel):
    """Response model for question set listing."""
    code: str
    title: str
    version: int
    is_active: bool
    question_count: int


class AnswerOption(BaseModel):
    """Single answer option."""
    label: str
    text: str


class QuestionResponse(BaseModel):
    """Response model for a question."""
    order_no: int
    prompt: str
    type: str
    answers: List[AnswerOption]


class AssessmentStartRequest(BaseModel):
    """Request to start a new assessment."""
    question_set_code: str = Field(default="R4W_CORE_V1", description="Question set to use")
    language: str = Field(default="id", description="Language preference")


class AssessmentStartResponse(BaseModel):
    """Response after starting assessment."""
    assessment_id: str
    question_set_code: str
    total_questions: int
    started_at: str


class AnswerInput(BaseModel):
    """Single answer input from user."""
    order_no: int
    label: str


class AssessmentSubmitRequest(BaseModel):
    """Request to submit assessment answers."""
    assessment_id: str
    answers: List[AnswerInput]


class ColorScore(BaseModel):
    """Color dimension score."""
    dimension: str
    score: int
    archetype: str
    color_hex: str
    label_id: str
    label_en: str


class AssessmentResultResponse(BaseModel):
    """Full assessment result response."""
    assessment_id: str
    user_id: str
    question_set_code: str
    
    # Primary results
    primary_color: str
    primary_archetype: str
    secondary_color: str
    secondary_archetype: str
    
    # Scores
    color_scores: List[ColorScore]
    conflict_scores: Dict[str, int]
    need_scores: Dict[str, int]
    
    # Additional metrics
    emotion_expression: int
    emotion_sensitivity: int
    decision_speed: int
    structure_need: int
    
    # Meta
    questions_answered: int
    total_questions: int
    completion_rate: float
    calculated_at: str


# ==================== DEPENDENCY INJECTION ====================

# These will be injected by the main server.py
_db = None
_get_current_user = None


def set_dependencies(db, get_current_user_func):
    """Set dependencies from main server module."""
    global _db, _get_current_user
    _db = db
    _get_current_user = get_current_user_func


async def get_db():
    """Get database instance."""
    if _db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    return _db


async def get_user():
    """Get current user - placeholder, replaced at runtime."""
    if _get_current_user is None:
        raise HTTPException(status_code=500, detail="Auth not initialized")
    # This is a placeholder - actual auth is handled by server.py


# ==================== ROUTES ====================

@relasi4_router.get("/question-sets", response_model=List[QuestionSetResponse])
async def list_question_sets():
    """List all available RELASI4™ question sets."""
    db = await get_db()
    
    cursor = db.r4_question_sets.find(
        {'is_active': True},
        {'_id': 0, 'code': 1, 'title': 1, 'version': 1, 'is_active': 1}
    )
    sets = await cursor.to_list(length=20)
    
    # Count questions for each set
    result = []
    for s in sets:
        count = await db.r4_questions.count_documents({
            'set_code': s['code'],
            'is_active': True
        })
        result.append(QuestionSetResponse(
            code=s['code'],
            title=s['title'],
            version=s['version'],
            is_active=s['is_active'],
            question_count=count
        ))
    
    return result


@relasi4_router.get("/questions/{set_code}", response_model=List[QuestionResponse])
async def get_questions(set_code: str):
    """Get all questions for a question set."""
    db = await get_db()
    
    # Verify set exists
    question_set = await db.r4_question_sets.find_one(
        {'code': set_code, 'is_active': True},
        {'_id': 0, 'code': 1}
    )
    if not question_set:
        raise HTTPException(status_code=404, detail=f"Question set '{set_code}' not found")
    
    # Get questions
    cursor = db.r4_questions.find(
        {'set_code': set_code, 'is_active': True},
        {'_id': 0, 'order_no': 1, 'prompt': 1, 'type': 1}
    ).sort('order_no', 1)
    questions = await cursor.to_list(length=100)
    
    # Get answers for each question
    result = []
    for q in questions:
        ans_cursor = db.r4_answers.find(
            {'set_code': set_code, 'order_no': q['order_no']},
            {'_id': 0, 'label': 1, 'text': 1}
        ).sort('label', 1)
        answers = await ans_cursor.to_list(length=10)
        
        result.append(QuestionResponse(
            order_no=q['order_no'],
            prompt=q['prompt'],
            type=q['type'],
            answers=[AnswerOption(label=a['label'], text=a['text']) for a in answers]
        ))
    
    return result


@relasi4_router.post("/assessments/start", response_model=AssessmentStartResponse)
async def start_assessment(
    request: AssessmentStartRequest,
    authorization: str = Header(None)
):
    """Start a new RELASI4™ assessment session."""
    db = await get_db()
    
    # Get user (optional - can be anonymous)
    user_id = "anonymous"
    if authorization:
        try:
            from jose import jwt
            token = authorization.replace("Bearer ", "")
            JWT_SECRET = os.environ.get('JWT_SECRET', 'default_secret_key')
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            user_id = payload.get("user_id", "anonymous")
        except Exception:
            pass  # Anonymous user
    
    # Verify question set exists
    question_set = await db.r4_question_sets.find_one(
        {'code': request.question_set_code, 'is_active': True},
        {'_id': 0, 'code': 1}
    )
    if not question_set:
        raise HTTPException(status_code=404, detail=f"Question set '{request.question_set_code}' not found")
    
    # Count questions
    total_questions = await db.r4_questions.count_documents({
        'set_code': request.question_set_code,
        'is_active': True
    })
    
    # Create assessment session
    assessment_id = f"r4_{uuid.uuid4().hex[:16]}"
    now = datetime.now(timezone.utc).isoformat()
    
    assessment = {
        'assessment_id': assessment_id,
        'user_id': user_id,
        'question_set_code': request.question_set_code,
        'language': request.language,
        'status': 'in_progress',
        'started_at': now,
        'answers': []
    }
    
    await db.r4_assessments.insert_one(assessment)
    
    return AssessmentStartResponse(
        assessment_id=assessment_id,
        question_set_code=request.question_set_code,
        total_questions=total_questions,
        started_at=now
    )


@relasi4_router.post("/assessments/submit", response_model=AssessmentResultResponse)
async def submit_assessment(request: AssessmentSubmitRequest):
    """Submit assessment answers and calculate scores."""
    db = await get_db()
    
    # Get assessment session
    assessment = await db.r4_assessments.find_one(
        {'assessment_id': request.assessment_id},
        {'_id': 0}
    )
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment session not found")
    
    if assessment.get('status') == 'completed':
        # Return existing result if already completed
        existing = await db.r4_responses.find_one(
            {'assessment_id': request.assessment_id},
            {'_id': 0}
        )
        if existing:
            return _build_result_response(existing)
    
    # Build UserAnswer objects
    user_answers = [
        UserAnswer(
            set_code=assessment['question_set_code'],
            order_no=ans.order_no,
            label=ans.label
        )
        for ans in request.answers
    ]
    
    # Calculate scores
    scoring_service = get_scoring_service(db)
    result = await scoring_service.calculate_scores(
        user_id=assessment['user_id'],
        assessment_id=request.assessment_id,
        question_set_code=assessment['question_set_code'],
        answers=user_answers
    )
    
    # Save result
    await scoring_service.save_assessment_result(result)
    
    # Update assessment status
    await db.r4_assessments.update_one(
        {'assessment_id': request.assessment_id},
        {
            '$set': {
                'status': 'completed',
                'completed_at': datetime.now(timezone.utc).isoformat(),
                'answers': [{'order_no': a.order_no, 'label': a.label} for a in request.answers]
            }
        }
    )
    
    return _build_result_response(result.to_dict())


# NOTE: These routes must be BEFORE /assessments/{assessment_id} to avoid path conflict
@relasi4_router.get("/assessments/history")
async def get_assessment_history(
    authorization: str = Header(None),
    limit: int = 10
):
    """Get user's assessment history for progress tracking."""
    db = await get_db()
    
    # Get user ID from token
    user_id = "anonymous"
    if authorization:
        try:
            from jose import jwt
            import os
            token = authorization.replace("Bearer ", "")
            JWT_SECRET = os.environ.get("JWT_SECRET", "default_secret_key")
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            user_id = payload.get("user_id", "anonymous")
        except Exception:
            pass
    
    if user_id == "anonymous":
        return {"assessments": [], "message": "Login required for history"}
    
    # Get assessments sorted by date (newest first)
    cursor = db.r4_responses.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("calculated_at", -1).limit(min(limit, 50))
    
    assessments = await cursor.to_list(length=limit)
    
    return {
        "assessments": assessments,
        "total": len(assessments)
    }


@relasi4_router.get("/assessments/compare/{assessment_id_1}/{assessment_id_2}")
async def compare_assessments(
    assessment_id_1: str,
    assessment_id_2: str,
    authorization: str = Header(None)
):
    """Compare two assessments for progress tracking."""
    db = await get_db()
    
    # Get both assessments
    assessment1 = await db.r4_responses.find_one(
        {"assessment_id": assessment_id_1},
        {"_id": 0}
    )
    assessment2 = await db.r4_responses.find_one(
        {"assessment_id": assessment_id_2},
        {"_id": 0}
    )
    
    if not assessment1 or not assessment2:
        raise HTTPException(status_code=404, detail="One or both assessments not found")
    
    # Calculate differences
    color_keys = ["color_red", "color_yellow", "color_green", "color_blue"]
    
    changes = []
    for color in color_keys:
        score1 = assessment1.get("color_scores", {}).get(color, 0)
        score2 = assessment2.get("color_scores", {}).get(color, 0)
        diff = score2 - score1
        
        changes.append({
            "dimension": color,
            "before": score1,
            "after": score2,
            "change": diff,
            "change_percent": round((diff / max(score1, 1)) * 100, 1) if score1 > 0 else 0
        })
    
    # Check if primary color changed
    primary_changed = assessment1.get("primary_color") != assessment2.get("primary_color")
    
    return {
        "assessment_before": {
            "assessment_id": assessment1.get("assessment_id"),
            "primary_color": assessment1.get("primary_color"),
            "secondary_color": assessment1.get("secondary_color"),
            "date": assessment1.get("calculated_at")
        },
        "assessment_after": {
            "assessment_id": assessment2.get("assessment_id"),
            "primary_color": assessment2.get("primary_color"),
            "secondary_color": assessment2.get("secondary_color"),
            "date": assessment2.get("calculated_at")
        },
        "color_changes": changes,
        "primary_color_changed": primary_changed
    }


@relasi4_router.get("/assessments/{assessment_id}", response_model=AssessmentResultResponse)
async def get_assessment(assessment_id: str):
    """Get a specific assessment result."""
    db = await get_db()
    
    result = await db.r4_responses.find_one(
        {'assessment_id': assessment_id},
        {'_id': 0}
    )
    if not result:
        raise HTTPException(status_code=404, detail="Assessment result not found")
    
    return _build_result_response(result)


@relasi4_router.get("/assessments")
async def list_user_assessments(
    authorization: str = None,
    limit: int = 10
):
    """List assessments for the current user."""
    db = await get_db()
    
    # Get user
    user_id = "anonymous"
    if authorization and _get_current_user:
        try:
            from jose import jwt
            import os
            token = authorization.replace("Bearer ", "")
            JWT_SECRET = os.environ.get('JWT_SECRET', 'default_secret_key')
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            user_id = payload.get("user_id", "anonymous")
        except Exception:
            pass
    
    cursor = db.r4_responses.find(
        {'user_id': user_id},
        {'_id': 0}
    ).sort('calculated_at', -1).limit(limit)
    
    results = await cursor.to_list(length=limit)
    
    return {
        'assessments': [_build_result_response(r) for r in results],
        'total': len(results)
    }


# ==================== HELPERS ====================

def _build_result_response(result: Dict[str, Any]) -> AssessmentResultResponse:
    """Build response model from result dict."""
    color_scores = []
    for dim in COLOR_DIMENSIONS:
        score = result.get('color_scores', {}).get(dim, 0)
        archetype = color_to_archetype(dim)
        labels = DIMENSION_LABELS.get(dim, {})
        color_scores.append(ColorScore(
            dimension=dim,
            score=score,
            archetype=archetype,
            color_hex=get_color_hex(dim),
            label_id=labels.get('id', dim),
            label_en=labels.get('en', dim)
        ))
    
    # Sort by score descending
    color_scores.sort(key=lambda x: x.score, reverse=True)
    
    primary_color = result.get('primary_color', '')
    secondary_color = result.get('secondary_color', '')
    
    return AssessmentResultResponse(
        assessment_id=result.get('assessment_id', ''),
        user_id=result.get('user_id', ''),
        question_set_code=result.get('question_set_code', ''),
        primary_color=primary_color,
        primary_archetype=color_to_archetype(primary_color),
        secondary_color=secondary_color,
        secondary_archetype=color_to_archetype(secondary_color),
        color_scores=color_scores,
        conflict_scores=result.get('conflict_scores', {}),
        need_scores=result.get('need_scores', {}),
        emotion_expression=result.get('emotion_expression_score', 0),
        emotion_sensitivity=result.get('emotion_sensitivity_score', 0),
        decision_speed=result.get('decision_speed_score', 0),
        structure_need=result.get('structure_need_score', 0),
        questions_answered=result.get('questions_answered', 0),
        total_questions=result.get('total_questions', 0),
        completion_rate=result.get('completion_rate', 0.0),
        calculated_at=result.get('calculated_at', '')
    )


# ==================== REPORT GENERATION ====================

class ReportGenerateRequest(BaseModel):
    """Request to generate a premium report."""
    assessment_id: str
    report_type: str = Field(default="SINGLE", description="SINGLE, COUPLE, or FAMILY")


class FreeTeaserResponse(BaseModel):
    """Free teaser response (no paywall)."""
    assessment_id: str
    primary_color: str
    primary_archetype: str
    primary_archetype_name: str
    secondary_color: str
    secondary_archetype: str
    color_scores: List[ColorScore]
    
    # Free teaser content
    teaser_title: str
    teaser_description: str
    strengths_preview: List[str]  # Show 2 strengths only
    
    # Paywall info
    report_available: bool
    report_price: float
    report_price_formatted: str
    
    # CTA
    upgrade_cta: str


class PremiumReportResponse(BaseModel):
    """Full premium report response."""
    report_id: str
    assessment_id: str
    report_type: str
    
    # Executive summary
    executive_summary: str
    
    # Primary color analysis
    primary_color_analysis: Dict[str, Any]
    
    # Secondary color analysis
    secondary_color_analysis: Dict[str, Any]
    
    # Conflict pattern
    conflict_pattern: Dict[str, Any]
    
    # Core needs
    core_needs: Dict[str, Any]
    
    # Relationship dynamics
    relationship_dynamics: Dict[str, Any]
    
    # Growth recommendations
    growth_recommendations: List[Dict[str, Any]]
    
    # Metadata
    generated_at: str
    is_degraded: bool = False


@relasi4_router.get("/free-teaser/{assessment_id}", response_model=FreeTeaserResponse)
async def get_free_teaser(assessment_id: str):
    """Get free teaser result for an assessment (no premium content)."""
    db = await get_db()
    
    # Get assessment result
    result = await db.r4_responses.find_one(
        {'assessment_id': assessment_id},
        {'_id': 0}
    )
    if not result:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    # Build color scores
    color_scores = []
    for dim in COLOR_DIMENSIONS:
        score = result.get('color_scores', {}).get(dim, 0)
        archetype = color_to_archetype(dim)
        labels = DIMENSION_LABELS.get(dim, {})
        color_scores.append(ColorScore(
            dimension=dim,
            score=score,
            archetype=archetype,
            color_hex=get_color_hex(dim),
            label_id=labels.get('id', dim),
            label_en=labels.get('en', dim)
        ))
    color_scores.sort(key=lambda x: x.score, reverse=True)
    
    primary_color = result.get('primary_color', '')
    secondary_color = result.get('secondary_color', '')
    primary_archetype = color_to_archetype(primary_color)
    secondary_archetype = color_to_archetype(secondary_color)
    
    # Archetype names
    archetype_names = {
        'driver': 'The Driver',
        'spark': 'The Spark', 
        'anchor': 'The Anchor',
        'analyst': 'The Analyst'
    }
    
    # Basic free teaser content (no AI needed)
    teaser_content = _get_teaser_content(primary_archetype, secondary_archetype)
    
    # Check if report exists
    existing_report = await db.r4_reports.find_one(
        {'assessment_id': assessment_id},
        {'_id': 0, 'report_id': 1}
    )
    
    # Get pricing
    pricing = await db.pricing.find_one({'product_id': 'relasi4_single_report'})
    price = pricing['price'] if pricing else 49000
    
    return FreeTeaserResponse(
        assessment_id=assessment_id,
        primary_color=primary_color,
        primary_archetype=primary_archetype,
        primary_archetype_name=archetype_names.get(primary_archetype, primary_archetype),
        secondary_color=secondary_color,
        secondary_archetype=secondary_archetype,
        color_scores=color_scores,
        teaser_title=teaser_content['title'],
        teaser_description=teaser_content['description'],
        strengths_preview=teaser_content['strengths'][:2],  # Only 2 strengths
        report_available=existing_report is not None,
        report_price=price,
        report_price_formatted=f"Rp {price:,.0f}",
        upgrade_cta="Dapatkan Laporan Premium lengkap dengan analisis mendalam!"
    )


@relasi4_router.post("/reports/generate")
async def generate_premium_report(
    request: ReportGenerateRequest,
    authorization: str = None
):
    """Generate a premium RELASI4™ report (requires payment or premium tier)."""
    db = await get_db()
    
    # Get user
    user_id = "anonymous"
    tier = "free"
    if authorization and _get_current_user:
        try:
            from jose import jwt
            import os
            token = authorization.replace("Bearer ", "")
            JWT_SECRET = os.environ.get('JWT_SECRET', 'default_secret_key')
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            user_id = payload.get("user_id", "anonymous")
            # Get user tier from database
            user = await db.users.find_one({'user_id': user_id})
            if user:
                tier = user.get('tier', 'free')
        except Exception:
            pass
    
    # Get assessment result
    assessment = await db.r4_responses.find_one(
        {'assessment_id': request.assessment_id},
        {'_id': 0}
    )
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    # Check if report already exists
    existing_report = await db.r4_reports.find_one(
        {'assessment_id': request.assessment_id},
        {'_id': 0}
    )
    if existing_report:
        return {
            "success": True,
            "cached": True,
            "report": existing_report
        }
    
    # Import report service
    from relasi4tm.report_service import get_report_service, ReportRequest
    
    report_service = get_report_service(db)
    
    # Build report request
    report_request = ReportRequest(
        user_id=user_id,
        assessment_id=request.assessment_id,
        report_type=request.report_type,
        scores=assessment,
        language="id",
        tier=tier
    )
    
    # Generate report
    result = await report_service.generate_single_report(report_request)
    
    if result.get("success"):
        return {
            "success": True,
            "cached": False,
            "report": result["report"]
        }
    else:
        raise HTTPException(
            status_code=500, 
            detail=result.get("error", "Report generation failed")
        )


@relasi4_router.get("/reports/{report_id}")
async def get_premium_report(report_id: str):
    """Get a generated premium report (any type)."""
    db = await get_db()
    
    report = await db.r4_reports.find_one(
        {'report_id': report_id},
        {'_id': 0}
    )
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # For COUPLE and FAMILY reports, return raw data
    # For SINGLE reports, return formatted response
    report_type = report.get('report_type', 'SINGLE')
    
    if report_type in ['COUPLE', 'FAMILY']:
        return report
    
    # SINGLE report - use formatted response
    return PremiumReportResponse(
        report_id=report.get('report_id', ''),
        assessment_id=report.get('assessment_id', ''),
        report_type=report.get('report_type', 'SINGLE'),
        executive_summary=report.get('executive_summary', ''),
        primary_color_analysis=report.get('primary_color_analysis', {}),
        secondary_color_analysis=report.get('secondary_color_analysis', {}),
        conflict_pattern=report.get('conflict_pattern', {}),
        core_needs=report.get('core_needs', {}),
        relationship_dynamics=report.get('relationship_dynamics', {}),
        growth_recommendations=report.get('growth_recommendations', []),
        generated_at=report.get('generated_at', ''),
        is_degraded=report.get('llm_metadata', {}).get('status') == 'degraded'
    )


@relasi4_router.get("/reports/by-assessment/{assessment_id}")
async def get_report_by_assessment(assessment_id: str):
    """Get report by assessment ID."""
    db = await get_db()
    
    report = await db.r4_reports.find_one(
        {'assessment_id': assessment_id},
        {'_id': 0}
    )
    if not report:
        return {"exists": False, "report": None}
    
    return {"exists": True, "report": report}


# ==================== COUPLE REPORT ====================

class CoupleReportRequest(BaseModel):
    """Request to generate couple compatibility report."""
    person_a_assessment_id: str
    person_b_assessment_id: str


class CoupleInviteRequest(BaseModel):
    """Request to create couple invite link."""
    assessment_id: str
    partner_name: Optional[str] = None


@relasi4_router.post("/couple/invite")
async def create_couple_invite(
    request: CoupleInviteRequest,
    authorization: str = None
):
    """Create an invite link for partner to join couple assessment."""
    import uuid as uuid_lib
    db = await get_db()
    
    # Verify assessment exists
    assessment = await db.r4_responses.find_one(
        {'assessment_id': request.assessment_id},
        {'_id': 0}
    )
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    # Get user
    user_id = assessment.get('user_id', 'anonymous')
    
    # Create invite
    invite_code = uuid_lib.uuid4().hex[:8].upper()
    invite = {
        "invite_code": invite_code,
        "creator_assessment_id": request.assessment_id,
        "creator_user_id": user_id,
        "partner_name": request.partner_name,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.r4_couple_invites.insert_one(invite)
    
    import os
    APP_URL = os.environ.get('APP_URL', 'https://relasi4warna.com')
    
    return {
        "invite_code": invite_code,
        "invite_link": f"{APP_URL}/relasi4/couple/join/{invite_code}",
        "expires_in_hours": 72
    }


@relasi4_router.get("/couple/invite/{invite_code}")
async def get_couple_invite(invite_code: str):
    """Get couple invite details."""
    db = await get_db()
    
    invite = await db.r4_couple_invites.find_one(
        {'invite_code': invite_code.upper()},
        {'_id': 0}
    )
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found or expired")
    
    # Get creator's assessment
    creator_assessment = await db.r4_responses.find_one(
        {'assessment_id': invite['creator_assessment_id']},
        {'_id': 0, 'primary_color': 1, 'user_id': 1}
    )
    
    return {
        "invite_code": invite_code,
        "status": invite.get('status'),
        "partner_name": invite.get('partner_name'),
        "creator_primary_color": creator_assessment.get('primary_color') if creator_assessment else None,
        "partner_assessment_id": invite.get('partner_assessment_id')
    }


@relasi4_router.post("/couple/join/{invite_code}")
async def join_couple_invite(
    invite_code: str,
    partner_assessment_id: str
):
    """Join a couple invite with partner's assessment."""
    db = await get_db()
    
    # Get invite
    invite = await db.r4_couple_invites.find_one({'invite_code': invite_code.upper()})
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
    
    if invite.get('status') == 'completed':
        raise HTTPException(status_code=400, detail="Invite already used")
    
    # Verify partner assessment
    partner_assessment = await db.r4_responses.find_one(
        {'assessment_id': partner_assessment_id},
        {'_id': 0}
    )
    if not partner_assessment:
        raise HTTPException(status_code=404, detail="Partner assessment not found")
    
    # Update invite
    await db.r4_couple_invites.update_one(
        {'invite_code': invite_code.upper()},
        {'$set': {
            'partner_assessment_id': partner_assessment_id,
            'status': 'completed',
            'completed_at': datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "invite_code": invite_code,
        "creator_assessment_id": invite['creator_assessment_id'],
        "partner_assessment_id": partner_assessment_id
    }


@relasi4_router.post("/couple/reports/generate")
async def generate_couple_report(
    request: CoupleReportRequest,
    authorization: str = None
):
    """Generate couple compatibility report."""
    import os
    db = await get_db()
    
    # Get user
    user_id = "anonymous"
    tier = "free"
    if authorization:
        try:
            from jose import jwt
            token = authorization.replace("Bearer ", "")
            JWT_SECRET = os.environ.get('JWT_SECRET', 'default_secret_key')
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            user_id = payload.get("user_id", "anonymous")
        except Exception:
            pass
    
    # Get both assessments
    person_a = await db.r4_responses.find_one(
        {'assessment_id': request.person_a_assessment_id},
        {'_id': 0}
    )
    person_b = await db.r4_responses.find_one(
        {'assessment_id': request.person_b_assessment_id},
        {'_id': 0}
    )
    
    if not person_a:
        raise HTTPException(status_code=404, detail="Person A assessment not found")
    if not person_b:
        raise HTTPException(status_code=404, detail="Person B assessment not found")
    
    # Check if couple report already exists
    existing = await db.r4_reports.find_one({
        'assessment_id': request.person_a_assessment_id,
        'partner_assessment_id': request.person_b_assessment_id,
        'report_type': 'COUPLE'
    }, {'_id': 0})
    
    if existing:
        return {
            "success": True,
            "cached": True,
            "report": existing
        }
    
    # Import report service
    from relasi4tm.report_service import get_report_service, ReportRequest
    
    report_service = get_report_service(db)
    
    # Build report request
    report_request = ReportRequest(
        user_id=user_id,
        assessment_id=request.person_a_assessment_id,
        report_type="COUPLE",
        scores=person_a,
        partner_scores=person_b,
        language="id",
        tier=tier
    )
    report_request.partner_assessment_id = request.person_b_assessment_id
    
    # Generate couple report
    result = await report_service.generate_couple_report(report_request)
    
    if result.get("success"):
        return {
            "success": True,
            "cached": False,
            "report": result["report"]
        }
    else:
        raise HTTPException(
            status_code=500, 
            detail=result.get("error", "Report generation failed")
        )


# ==================== FAMILY REPORT ====================

class FamilyGroupCreateRequest(BaseModel):
    """Request to create a family group."""
    creator_assessment_id: str
    family_name: Optional[str] = "Keluarga Kita"
    max_members: int = Field(default=6, ge=3, le=6)


class FamilyMemberJoinRequest(BaseModel):
    """Request to join a family group."""
    assessment_id: str
    member_name: Optional[str] = None


class FamilyReportGenerateRequest(BaseModel):
    """Request to generate family report."""
    family_group_id: str


@relasi4_router.post("/family/create")
async def create_family_group(
    request: FamilyGroupCreateRequest,
    authorization: str = None
):
    """Create a family group for family report."""
    import uuid as uuid_lib
    import os
    db = await get_db()
    
    # Verify creator assessment
    assessment = await db.r4_responses.find_one(
        {'assessment_id': request.creator_assessment_id},
        {'_id': 0}
    )
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    # Get user
    user_id = assessment.get('user_id', 'anonymous')
    
    # Create family group
    group_id = f"fam_{uuid_lib.uuid4().hex[:8]}"
    invite_code = uuid_lib.uuid4().hex[:6].upper()
    
    family_group = {
        "group_id": group_id,
        "invite_code": invite_code,
        "family_name": request.family_name,
        "creator_user_id": user_id,
        "creator_assessment_id": request.creator_assessment_id,
        "max_members": request.max_members,
        "members": [{
            "assessment_id": request.creator_assessment_id,
            "member_name": "Anggota 1",
            "joined_at": datetime.now(timezone.utc).isoformat(),
            "is_creator": True
        }],
        "status": "open",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.r4_family_groups.insert_one(family_group)
    
    APP_URL = os.environ.get('APP_URL', 'https://relasi4warna.com')
    
    return {
        "group_id": group_id,
        "invite_code": invite_code,
        "invite_link": f"{APP_URL}/relasi4/family/join/{invite_code}",
        "family_name": request.family_name,
        "max_members": request.max_members,
        "current_members": 1
    }


@relasi4_router.get("/family/group/{group_id}")
async def get_family_group(group_id: str):
    """Get family group details."""
    db = await get_db()
    
    group = await db.r4_family_groups.find_one(
        {'group_id': group_id},
        {'_id': 0}
    )
    if not group:
        raise HTTPException(status_code=404, detail="Family group not found")
    
    return group


@relasi4_router.get("/family/invite/{invite_code}")
async def get_family_invite(invite_code: str):
    """Get family group by invite code."""
    db = await get_db()
    
    group = await db.r4_family_groups.find_one(
        {'invite_code': invite_code.upper()},
        {'_id': 0}
    )
    if not group:
        raise HTTPException(status_code=404, detail="Invite not found")
    
    return {
        "group_id": group['group_id'],
        "family_name": group['family_name'],
        "current_members": len(group.get('members', [])),
        "max_members": group['max_members'],
        "status": group['status'],
        "can_join": len(group.get('members', [])) < group['max_members'] and group['status'] == 'open'
    }


@relasi4_router.post("/family/join/{invite_code}")
async def join_family_group(
    invite_code: str,
    request: FamilyMemberJoinRequest
):
    """Join a family group with assessment."""
    db = await get_db()
    
    # Get group
    group = await db.r4_family_groups.find_one({'invite_code': invite_code.upper()})
    if not group:
        raise HTTPException(status_code=404, detail="Family group not found")
    
    if group['status'] != 'open':
        raise HTTPException(status_code=400, detail="Family group is closed")
    
    if len(group.get('members', [])) >= group['max_members']:
        raise HTTPException(status_code=400, detail="Family group is full")
    
    # Check if already joined
    existing_ids = [m['assessment_id'] for m in group.get('members', [])]
    if request.assessment_id in existing_ids:
        raise HTTPException(status_code=400, detail="Already joined this family group")
    
    # Verify assessment
    assessment = await db.r4_responses.find_one(
        {'assessment_id': request.assessment_id},
        {'_id': 0}
    )
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    # Add member
    member_num = len(group['members']) + 1
    new_member = {
        "assessment_id": request.assessment_id,
        "member_name": request.member_name or f"Anggota {member_num}",
        "joined_at": datetime.now(timezone.utc).isoformat(),
        "is_creator": False
    }
    
    await db.r4_family_groups.update_one(
        {'group_id': group['group_id']},
        {'$push': {'members': new_member}}
    )
    
    return {
        "success": True,
        "group_id": group['group_id'],
        "member_number": member_num,
        "current_members": member_num,
        "max_members": group['max_members']
    }


@relasi4_router.post("/family/reports/generate")
async def generate_family_report(
    request: FamilyReportGenerateRequest,
    authorization: str = None
):
    """Generate family dynamics report."""
    import os
    db = await get_db()
    
    # Get family group
    group = await db.r4_family_groups.find_one(
        {'group_id': request.family_group_id},
        {'_id': 0}
    )
    if not group:
        raise HTTPException(status_code=404, detail="Family group not found")
    
    members = group.get('members', [])
    if len(members) < 3:
        raise HTTPException(status_code=400, detail="Need at least 3 members for family report")
    
    # Get user
    user_id = group.get('creator_user_id', 'anonymous')
    
    # Check if report already exists
    existing = await db.r4_reports.find_one({
        'family_group_id': request.family_group_id,
        'report_type': 'FAMILY'
    }, {'_id': 0})
    
    if existing:
        return {
            "success": True,
            "cached": True,
            "report": existing
        }
    
    # Get all assessments
    creator_assessment = await db.r4_responses.find_one(
        {'assessment_id': group['creator_assessment_id']},
        {'_id': 0}
    )
    if not creator_assessment:
        raise HTTPException(status_code=404, detail="Creator assessment not found")
    
    family_assessments = []
    for member in members[1:]:  # Skip creator (already have)
        assessment = await db.r4_responses.find_one(
            {'assessment_id': member['assessment_id']},
            {'_id': 0}
        )
        if assessment:
            family_assessments.append(assessment)
    
    if len(family_assessments) < 2:
        raise HTTPException(status_code=400, detail="Not enough valid assessments")
    
    # Import report service
    from relasi4tm.report_service import get_report_service, ReportRequest
    
    report_service = get_report_service(db)
    
    # Build report request
    report_request = ReportRequest(
        user_id=user_id,
        assessment_id=group['creator_assessment_id'],
        report_type="FAMILY",
        scores=creator_assessment,
        family_scores=family_assessments,
        language="id",
        tier="premium"
    )
    report_request.family_assessment_ids = [m['assessment_id'] for m in members]
    
    # Generate report
    result = await report_service.generate_family_report(report_request)
    
    if result.get("success"):
        # Add family group reference
        result["report"]["family_group_id"] = request.family_group_id
        await db.r4_reports.update_one(
            {'report_id': result["report"]["report_id"]},
            {'$set': {'family_group_id': request.family_group_id}}
        )
        
        # Close group
        await db.r4_family_groups.update_one(
            {'group_id': request.family_group_id},
            {'$set': {'status': 'completed'}}
        )
        
        return {
            "success": True,
            "cached": False,
            "report": result["report"]
        }
    else:
        raise HTTPException(
            status_code=500, 
            detail=result.get("error", "Report generation failed")
        )


# ==================== TEASER HELPERS ====================

def _get_teaser_content(primary: str, secondary: str) -> Dict[str, Any]:
    """Get free teaser content based on archetype combination."""
    
    archetypes = {
        'driver': {
            'title': 'Kamu adalah Driver yang Tegas',
            'description': 'Sebagai Driver, kamu memiliki dorongan alami untuk memimpin dan mencapai hasil. Kamu langsung ke inti masalah dan tidak suka bertele-tele.',
            'strengths': ['Tegas dalam mengambil keputusan', 'Fokus pada hasil', 'Berani menghadapi tantangan', 'Efisien dalam bertindak']
        },
        'spark': {
            'title': 'Kamu adalah Spark yang Bersemangat',
            'description': 'Sebagai Spark, energimu menular ke orang-orang di sekitarmu. Kamu membawa keceriaan dan kreativitas dalam setiap interaksi.',
            'strengths': ['Kreatif dan inovatif', 'Pandai memotivasi orang lain', 'Optimis dan antusias', 'Adaptif terhadap perubahan']
        },
        'anchor': {
            'title': 'Kamu adalah Anchor yang Stabil',
            'description': 'Sebagai Anchor, kamu adalah pilar kekuatan bagi orang-orang di sekitarmu. Kehadiranmu membawa ketenangan dan rasa aman.',
            'strengths': ['Sabar dan penuh pengertian', 'Bisa diandalkan', 'Pendengar yang baik', 'Menciptakan harmoni']
        },
        'analyst': {
            'title': 'Kamu adalah Analyst yang Cermat',
            'description': 'Sebagai Analyst, kamu memiliki kemampuan luar biasa untuk melihat detail yang terlewat orang lain. Ketelitianmu memastikan semuanya berjalan dengan benar.',
            'strengths': ['Teliti dan akurat', 'Pemikir sistematis', 'Berbasis data dan fakta', 'Standar kualitas tinggi']
        }
    }
    
    base = archetypes.get(primary, archetypes['driver'])
    
    # Modify based on secondary
    if secondary:
        secondary_info = archetypes.get(secondary, {})
        # Add blended description
        base['description'] += f" Dengan sentuhan {secondary.capitalize()}, kamu juga memiliki sisi {secondary_info.get('strengths', ['unik'])[0].lower()}."
    
    return base


# ==================== PAYMENT ENDPOINTS ====================

class Relasi4PaymentRequest(BaseModel):
    """Request to create payment for RELASI4™ report."""
    assessment_id: str
    product_type: str = Field(default="relasi4_single", description="relasi4_single, relasi4_couple, relasi4_family")
    currency: str = Field(default="IDR", description="IDR or USD")
    partner_assessment_id: Optional[str] = None  # For couple report
    family_assessment_ids: Optional[List[str]] = None  # For family report


class Relasi4PaymentResponse(BaseModel):
    """Payment creation response."""
    payment_id: str
    snap_token: str
    redirect_url: str
    amount: float
    currency: str
    product_name: str


@relasi4_router.post("/payment/create", response_model=Relasi4PaymentResponse)
async def create_relasi4_payment(
    request: Relasi4PaymentRequest,
    authorization: str = None
):
    """Create a Midtrans payment for RELASI4™ report."""
    import os
    import uuid as uuid_lib
    import midtransclient
    
    db = await get_db()
    
    # Get user
    user_id = "anonymous"
    user_email = "customer@relasi4warna.com"
    user_name = "Customer"
    
    if authorization:
        try:
            from jose import jwt
            token = authorization.replace("Bearer ", "")
            JWT_SECRET = os.environ.get('JWT_SECRET', 'default_secret_key')
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            user_id = payload.get("user_id", "anonymous")
            
            # Get user details
            user = await db.users.find_one({'user_id': user_id}, {'_id': 0, 'email': 1, 'name': 1})
            if user:
                user_email = user.get('email', user_email)
                user_name = user.get('name', user_name)
        except Exception:
            pass
    
    # Verify assessment exists
    assessment = await db.r4_responses.find_one(
        {'assessment_id': request.assessment_id},
        {'_id': 0}
    )
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    # Product pricing
    RELASI4_PRODUCTS = {
        "relasi4_single": {"price_idr": 49000, "price_usd": 3.49, "name_id": "RELASI4™ Laporan Premium", "name_en": "RELASI4™ Premium Report"},
        "relasi4_couple": {"price_idr": 79000, "price_usd": 5.49, "name_id": "RELASI4™ Laporan Pasangan", "name_en": "RELASI4™ Couple Report"},
        "relasi4_family": {"price_idr": 129000, "price_usd": 8.99, "name_id": "RELASI4™ Laporan Keluarga", "name_en": "RELASI4™ Family Report"},
    }
    
    product = RELASI4_PRODUCTS.get(request.product_type)
    if not product:
        raise HTTPException(status_code=400, detail="Invalid product type")
    
    amount = product["price_idr"] if request.currency == "IDR" else product["price_usd"]
    payment_id = f"R4-{uuid_lib.uuid4().hex[:12].upper()}"
    
    # Initialize Midtrans
    MIDTRANS_SERVER_KEY = os.environ.get('MIDTRANS_SERVER_KEY', '')
    MIDTRANS_CLIENT_KEY = os.environ.get('MIDTRANS_CLIENT_KEY', '')
    MIDTRANS_IS_PRODUCTION = os.environ.get('MIDTRANS_IS_PRODUCTION', 'False') == 'True'
    
    if not MIDTRANS_SERVER_KEY:
        raise HTTPException(status_code=500, detail="Payment system not configured")
    
    try:
        midtrans_snap = midtransclient.Snap(
            is_production=MIDTRANS_IS_PRODUCTION,
            server_key=MIDTRANS_SERVER_KEY,
            client_key=MIDTRANS_CLIENT_KEY
        )
        
        APP_URL = os.environ.get('APP_URL', 'https://relasi4warna.com')
        
        transaction_params = {
            "transaction_details": {
                "order_id": payment_id,
                "gross_amount": int(amount)
            },
            "customer_details": {
                "email": user_email,
                "first_name": user_name.split()[0] if user_name else "Customer",
                "last_name": " ".join(user_name.split()[1:]) if user_name and len(user_name.split()) > 1 else "",
            },
            "item_details": [{
                "id": request.product_type,
                "price": int(amount),
                "quantity": 1,
                "name": product["name_id"],
                "category": "RELASI4™ Report"
            }],
            "credit_card": {
                "secure": True
            },
            "callbacks": {
                "finish": f"{APP_URL}/relasi4/payment/finish?order_id={payment_id}"
            },
            "custom_field1": request.assessment_id,
            "custom_field2": user_id,
            "custom_field3": request.product_type
        }
        
        # Create Snap transaction
        snap_response = midtrans_snap.create_transaction(transaction_params)
        
        # Save payment record
        payment_doc = {
            "payment_id": payment_id,
            "user_id": user_id,
            "assessment_id": request.assessment_id,
            "partner_assessment_id": request.partner_assessment_id,
            "family_assessment_ids": request.family_assessment_ids,
            "product_type": request.product_type,
            "amount": amount,
            "currency": request.currency,
            "status": "pending",
            "snap_token": snap_response.get("token"),
            "redirect_url": snap_response.get("redirect_url"),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.r4_payments.insert_one(payment_doc)
        
        return Relasi4PaymentResponse(
            payment_id=payment_id,
            snap_token=snap_response.get("token"),
            redirect_url=snap_response.get("redirect_url"),
            amount=amount,
            currency=request.currency,
            product_name=product["name_id"]
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Payment creation failed: {str(e)}")


@relasi4_router.post("/payment/webhook")
async def relasi4_payment_webhook(request_data: Request):
    """Handle Midtrans webhook for RELASI4™ payments."""
    import os
    import hashlib
    
    db = await get_db()
    
    try:
        body = await request_data.json()
        
        order_id = body.get("order_id", "")
        transaction_status = body.get("transaction_status")
        fraud_status = body.get("fraud_status")
        payment_type = body.get("payment_type")
        
        # Only process RELASI4 payments (R4- prefix)
        if not order_id.startswith("R4-"):
            return {"status": "ignored", "reason": "not_relasi4_payment"}
        
        # Verify signature
        signature_key = body.get("signature_key")
        status_code = body.get("status_code")
        gross_amount = body.get("gross_amount")
        MIDTRANS_SERVER_KEY = os.environ.get('MIDTRANS_SERVER_KEY', '')
        
        raw_signature = f"{order_id}{status_code}{gross_amount}{MIDTRANS_SERVER_KEY}"
        calculated_signature = hashlib.sha512(raw_signature.encode()).hexdigest()
        
        MIDTRANS_IS_PRODUCTION = os.environ.get('MIDTRANS_IS_PRODUCTION', 'False') == 'True'
        
        if signature_key != calculated_signature and MIDTRANS_IS_PRODUCTION:
            raise HTTPException(status_code=401, detail="Invalid signature")
        
        if transaction_status in ["capture", "settlement"]:
            if fraud_status == "accept" or fraud_status is None:
                # Payment successful
                await db.r4_payments.update_one(
                    {"payment_id": order_id},
                    {"$set": {
                        "status": "paid",
                        "payment_type": payment_type,
                        "transaction_status": transaction_status,
                        "paid_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                
                # Get payment details and generate report
                payment = await db.r4_payments.find_one({"payment_id": order_id}, {"_id": 0})
                if payment:
                    # Auto-generate report after payment
                    assessment_id = payment.get("assessment_id")
                    product_type = payment.get("product_type")
                    user_id = payment.get("user_id")
                    
                    # Mark assessment as paid
                    await db.r4_responses.update_one(
                        {"assessment_id": assessment_id},
                        {"$set": {"is_paid": True, "payment_id": order_id}}
                    )
                    
                    # Generate report automatically
                    if product_type == "relasi4_single":
                        from relasi4tm.report_service import get_report_service, ReportRequest
                        
                        assessment = await db.r4_responses.find_one(
                            {"assessment_id": assessment_id}, {"_id": 0}
                        )
                        if assessment:
                            report_service = get_report_service(db)
                            report_request = ReportRequest(
                                user_id=user_id,
                                assessment_id=assessment_id,
                                report_type="SINGLE",
                                scores=assessment,
                                language="id",
                                tier="premium"
                            )
                            await report_service.generate_single_report(report_request)
                
        elif transaction_status == "pending":
            await db.r4_payments.update_one(
                {"payment_id": order_id},
                {"$set": {"status": "pending", "transaction_status": transaction_status}}
            )
            
        elif transaction_status in ["deny", "cancel", "expire"]:
            await db.r4_payments.update_one(
                {"payment_id": order_id},
                {"$set": {"status": transaction_status, "transaction_status": transaction_status}}
            )
        
        return {"status": "ok"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@relasi4_router.get("/payment/status/{payment_id}")
async def get_relasi4_payment_status(payment_id: str):
    """Get payment status for a RELASI4™ payment."""
    db = await get_db()
    
    payment = await db.r4_payments.find_one(
        {"payment_id": payment_id},
        {"_id": 0}
    )
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    # If paid, check if report exists
    report = None
    if payment.get("status") == "paid":
        report = await db.r4_reports.find_one(
            {"assessment_id": payment.get("assessment_id")},
            {"_id": 0, "report_id": 1}
        )
    
    return {
        "payment_id": payment_id,
        "status": payment.get("status"),
        "assessment_id": payment.get("assessment_id"),
        "product_type": payment.get("product_type"),
        "amount": payment.get("amount"),
        "currency": payment.get("currency"),
        "report_id": report.get("report_id") if report else None,
        "paid_at": payment.get("paid_at")
    }





# ==================== ADMIN ENDPOINTS ====================

@relasi4_router.get("/admin/reports")
async def admin_get_all_reports(authorization: str = None):
    """Admin: Get all RELASI4 reports."""
    db = await get_db()
    
    # Get all reports
    cursor = db.r4_reports.find({}, {'_id': 0}).sort('created_at', -1).limit(500)
    reports = await cursor.to_list(length=500)
    
    return reports


@relasi4_router.get("/admin/assessments")
async def admin_get_all_assessments(authorization: str = None):
    """Admin: Get all RELASI4 assessments."""
    db = await get_db()
    
    # Get all assessments with scores
    cursor = db.r4_responses.find({}, {'_id': 0}).sort('calculated_at', -1).limit(500)
    assessments = await cursor.to_list(length=500)
    
    return assessments


@relasi4_router.delete("/admin/reports/{report_id}")
async def admin_delete_report(report_id: str, authorization: str = None):
    """Admin: Delete a specific report."""
    db = await get_db()
    
    result = await db.r4_reports.delete_one({'report_id': report_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Report not found")
    
    return {"success": True, "deleted_report_id": report_id}


@relasi4_router.get("/admin/stats")
async def admin_get_stats(authorization: str = None):
    """Admin: Get RELASI4 statistics."""
    db = await get_db()
    
    # Count documents
    total_assessments = await db.r4_responses.count_documents({})
    total_reports = await db.r4_reports.count_documents({})
    single_reports = await db.r4_reports.count_documents({'report_type': 'SINGLE'})
    couple_reports = await db.r4_reports.count_documents({'report_type': 'COUPLE'})
    family_reports = await db.r4_reports.count_documents({'report_type': 'FAMILY'})
    
    # Get leaderboard (top 10 couple compatibility scores)
    leaderboard_cursor = db.r4_reports.find(
        {'report_type': 'COUPLE'},
        {'_id': 0, 'report_id': 1, 'compatibility_summary': 1, 'person_a_profile': 1, 'person_b_profile': 1, 'created_at': 1}
    ).sort('compatibility_summary.compatibility_score', -1).limit(10)
    leaderboard = await leaderboard_cursor.to_list(length=10)
    
    return {
        "total_assessments": total_assessments,
        "total_reports": total_reports,
        "single_reports": single_reports,
        "couple_reports": couple_reports,
        "family_reports": family_reports,
        "leaderboard": leaderboard
    }


# ==================== PUBLIC LEADERBOARD ====================

@relasi4_router.get("/leaderboard/couples")
async def get_couple_leaderboard(limit: int = 10):
    """Get public leaderboard of couple compatibility scores."""
    db = await get_db()
    
    cursor = db.r4_reports.find(
        {'report_type': 'COUPLE'},
        {
            '_id': 0, 
            'report_id': 1, 
            'compatibility_summary.compatibility_score': 1,
            'compatibility_summary.compatibility_level': 1,
            'person_a_profile.primary_color': 1,
            'person_a_profile.archetype': 1,
            'person_b_profile.primary_color': 1,
            'person_b_profile.archetype': 1,
            'created_at': 1
        }
    ).sort('compatibility_summary.compatibility_score', -1).limit(min(limit, 50))
    
    couples = await cursor.to_list(length=limit)
    
    return {
        "leaderboard": couples,
        "total_couples": await db.r4_reports.count_documents({'report_type': 'COUPLE'})
    }


@relasi4_router.get("/leaderboard/families")
async def get_family_leaderboard(limit: int = 10):
    """Get public leaderboard of family harmony scores."""
    db = await get_db()
    
    cursor = db.r4_reports.find(
        {'report_type': 'FAMILY'},
        {
            '_id': 0, 
            'report_id': 1, 
            'family_name': 1,
            'family_summary.harmony_score': 1,
            'member_profiles': 1,
            'created_at': 1
        }
    ).sort('family_summary.harmony_score', -1).limit(min(limit, 50))
    
    families = await cursor.to_list(length=limit)
    
    return {
        "leaderboard": families,
        "total_families": await db.r4_reports.count_documents({'report_type': 'FAMILY'})
    }



# ==================== (Routes moved earlier in file to avoid path conflict) ====================


# ==================== ANALYTICS ENDPOINTS ====================

class AnalyticsEventRequest(BaseModel):
    """Request model for analytics event tracking."""
    event: str = Field(..., description="Event name (e.g., relasi4_cta_rendered)")
    cta_variant: Optional[str] = Field(None, description="CTA variant (color/psychological/hybrid)")
    variant: Optional[str] = Field(None, description="Legacy variant field")
    primary_color: Optional[str] = Field(None, description="User's primary color archetype")
    primary_need: Optional[str] = Field(None, description="User's primary need dimension")
    primary_conflict_style: Optional[str] = Field(None, description="User's primary conflict style")
    entry_point: Optional[str] = Field(None, description="Where the event was triggered")
    cta_location: Optional[str] = Field(None, description="CTA location on page")
    package_type: Optional[str] = Field(None, description="Package type (single/couple/family)")
    conversion: Optional[bool] = Field(False, description="Whether conversion occurred")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional event data")


@relasi4_router.post("/analytics/track")
async def track_analytics_event(event_data: AnalyticsEventRequest, request: Request):
    """
    Track an analytics event (fire-and-forget).
    Stores in MongoDB r4_analytics collection and updates daily aggregates.
    """
    db = await get_db()
    
    try:
        # Get user info if available
        user_id = None
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.replace("Bearer ", "")
            try:
                from jose import jwt
                SECRET_KEY = os.environ.get("JWT_SECRET", "relasi4-secret-key")
                payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
                user_id = payload.get("sub")
            except:
                pass
        
        # Determine CTA variant (prefer cta_variant over variant for backward compat)
        cta_variant = event_data.cta_variant or event_data.variant or "unknown"
        
        # Get today's date for aggregation
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        
        # Create event document
        event_doc = {
            "event_id": f"evt_{uuid.uuid4().hex[:12]}",
            "event": event_data.event,
            "cta_variant": cta_variant,
            "variant": cta_variant,  # backward compat
            "primary_color": event_data.primary_color,
            "primary_need": event_data.primary_need,
            "primary_conflict_style": event_data.primary_conflict_style,
            "entry_point": event_data.entry_point,
            "cta_location": event_data.cta_location,
            "package_type": event_data.package_type,
            "conversion": event_data.conversion,
            "metadata": event_data.metadata,
            "user_id": user_id,
            "date": today,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "user_agent": request.headers.get("User-Agent", ""),
            "ip_hash": None  # Don't store raw IP for privacy
        }
        
        await db.r4_analytics.insert_one(event_doc)
        
        # Update daily aggregate for heatmap (non-PII)
        if event_data.primary_need and event_data.primary_conflict_style:
            await db.r4_analytics_daily.update_one(
                {
                    "date": today,
                    "primary_need": event_data.primary_need,
                    "primary_conflict_style": event_data.primary_conflict_style,
                    "cta_variant": cta_variant,
                    "package_type": event_data.package_type or "unknown"
                },
                {
                    "$inc": {
                        "count": 1,
                        "conversions": 1 if event_data.conversion else 0
                    },
                    "$setOnInsert": {
                        "created_at": datetime.now(timezone.utc).isoformat()
                    }
                },
                upsert=True
            )
        
        return {"status": "ok", "event_id": event_doc["event_id"]}
    except Exception as e:
        # Fire-and-forget - don't fail the request
        return {"status": "ok", "error": str(e)}


class AnalyticsSummary(BaseModel):
    """Summary statistics for A/B testing dashboard."""
    total_views: int
    total_clicks: int
    conversion_rate: float
    variants: Dict[str, Any]
    by_color: Dict[str, Any]
    by_entry_point: Dict[str, Any]


@relasi4_router.get("/analytics/summary")
async def get_analytics_summary(days: int = 30, admin_key: Optional[str] = None):
    """
    Get A/B testing analytics summary.
    Requires admin authentication or admin_key query param.
    """
    db = await get_db()
    
    # Simple admin check (in production, use proper auth)
    ADMIN_KEY = os.environ.get("ANALYTICS_ADMIN_KEY", "relasi4-analytics-admin")
    if admin_key != ADMIN_KEY:
        # Check if user is admin via session
        pass  # Allow for now, add proper auth later
    
    from datetime import timedelta
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    
    # Aggregation pipeline for summary
    pipeline = [
        {"$match": {"created_at": {"$gte": cutoff}}},
        {"$facet": {
            "totals": [
                {"$group": {
                    "_id": "$event",
                    "count": {"$sum": 1}
                }}
            ],
            "by_variant": [
                {"$group": {
                    "_id": {"variant": "$variant", "event": "$event"},
                    "count": {"$sum": 1}
                }}
            ],
            "by_color": [
                {"$match": {"primary_color": {"$ne": None}}},
                {"$group": {
                    "_id": {"color": "$primary_color", "event": "$event"},
                    "count": {"$sum": 1}
                }}
            ],
            "by_need": [
                {"$match": {"primary_need": {"$ne": None}}},
                {"$group": {
                    "_id": {"need": "$primary_need", "event": "$event"},
                    "count": {"$sum": 1}
                }}
            ],
            "by_conflict_style": [
                {"$match": {"primary_conflict_style": {"$ne": None}}},
                {"$group": {
                    "_id": {"conflict_style": "$primary_conflict_style", "event": "$event"},
                    "count": {"$sum": 1}
                }}
            ],
            "by_entry_point": [
                {"$group": {
                    "_id": {"entry_point": "$entry_point", "event": "$event"},
                    "count": {"$sum": 1}
                }}
            ],
            "timeline": [
                {"$group": {
                    "_id": {
                        "date": {"$substr": ["$created_at", 0, 10]},
                        "event": "$event",
                        "variant": "$variant"
                    },
                    "count": {"$sum": 1}
                }},
                {"$sort": {"_id.date": 1}}
            ]
        }}
    ]
    
    result = await db.r4_analytics.aggregate(pipeline).to_list(1)
    
    if not result:
        return {
            "total_views": 0,
            "total_clicks": 0,
            "conversion_rate": 0,
            "variants": {"soft": {"views": 0, "clicks": 0, "rate": 0}, "aggressive": {"views": 0, "clicks": 0, "rate": 0}},
            "by_color": {},
            "by_entry_point": {},
            "timeline": [],
            "period_days": days
        }
    
    data = result[0]
    
    # Process totals
    totals = {item["_id"]: item["count"] for item in data.get("totals", [])}
    total_views = totals.get("relasi4_teaser_viewed", 0)
    total_clicks = totals.get("relasi4_cta_clicked", 0)
    conversion_rate = round((total_clicks / max(total_views, 1)) * 100, 2)
    
    # Process by variant
    variants = {"soft": {"views": 0, "clicks": 0}, "aggressive": {"views": 0, "clicks": 0}}
    for item in data.get("by_variant", []):
        variant = item["_id"]["variant"]
        event = item["_id"]["event"]
        if variant in variants:
            if event == "relasi4_teaser_viewed":
                variants[variant]["views"] = item["count"]
            elif event == "relasi4_cta_clicked":
                variants[variant]["clicks"] = item["count"]
    
    # Calculate conversion rates per variant
    for v in variants:
        views = variants[v]["views"]
        clicks = variants[v]["clicks"]
        variants[v]["rate"] = round((clicks / max(views, 1)) * 100, 2)
    
    # Process by color
    by_color = {}
    for item in data.get("by_color", []):
        color = item["_id"]["color"]
        event = item["_id"]["event"]
        if color not in by_color:
            by_color[color] = {"views": 0, "clicks": 0}
        if event == "relasi4_teaser_viewed":
            by_color[color]["views"] = item["count"]
        elif event == "relasi4_cta_clicked":
            by_color[color]["clicks"] = item["count"]
    
    for c in by_color:
        views = by_color[c]["views"]
        clicks = by_color[c]["clicks"]
        by_color[c]["rate"] = round((clicks / max(views, 1)) * 100, 2)
    
    # Process by entry point
    by_entry_point = {}
    for item in data.get("by_entry_point", []):
        entry = item["_id"]["entry_point"] or "unknown"
        event = item["_id"]["event"]
        if entry not in by_entry_point:
            by_entry_point[entry] = {"views": 0, "clicks": 0}
        if event == "relasi4_teaser_viewed":
            by_entry_point[entry]["views"] = item["count"]
        elif event == "relasi4_cta_clicked":
            by_entry_point[entry]["clicks"] = item["count"]
    
    for e in by_entry_point:
        views = by_entry_point[e]["views"]
        clicks = by_entry_point[e]["clicks"]
        by_entry_point[e]["rate"] = round((clicks / max(views, 1)) * 100, 2)
    
    # Process timeline
    timeline = []
    for item in data.get("timeline", []):
        timeline.append({
            "date": item["_id"]["date"],
            "event": item["_id"]["event"],
            "variant": item["_id"]["variant"],
            "count": item["count"]
        })
    
    # Process by need (psychological CTA)
    by_need = {}
    for item in data.get("by_need", []):
        need = item["_id"]["need"]
        event = item["_id"]["event"]
        if need not in by_need:
            by_need[need] = {"views": 0, "clicks": 0}
        # Include both old and new event names
        if event in ["relasi4_teaser_viewed", "relasi4_cta_rendered_psychological"]:
            by_need[need]["views"] = by_need[need].get("views", 0) + item["count"]
        elif event in ["relasi4_cta_clicked", "relasi4_cta_clicked_psychological"]:
            by_need[need]["clicks"] = by_need[need].get("clicks", 0) + item["count"]
    
    for n in by_need:
        views = by_need[n]["views"]
        clicks = by_need[n]["clicks"]
        by_need[n]["rate"] = round((clicks / max(views, 1)) * 100, 2)
    
    # Process by conflict style
    by_conflict_style = {}
    for item in data.get("by_conflict_style", []):
        style = item["_id"]["conflict_style"]
        event = item["_id"]["event"]
        if style not in by_conflict_style:
            by_conflict_style[style] = {"views": 0, "clicks": 0}
        if event in ["relasi4_teaser_viewed", "relasi4_cta_rendered_psychological"]:
            by_conflict_style[style]["views"] = by_conflict_style[style].get("views", 0) + item["count"]
        elif event in ["relasi4_cta_clicked", "relasi4_cta_clicked_psychological"]:
            by_conflict_style[style]["clicks"] = by_conflict_style[style].get("clicks", 0) + item["count"]
    
    for s in by_conflict_style:
        views = by_conflict_style[s]["views"]
        clicks = by_conflict_style[s]["clicks"]
        by_conflict_style[s]["rate"] = round((clicks / max(views, 1)) * 100, 2)
    
    # Calculate psychological vs color-based comparison
    psych_views = sum(by_need[n]["views"] for n in by_need)
    psych_clicks = sum(by_need[n]["clicks"] for n in by_need)
    color_views = sum(by_color[c]["views"] for c in by_color)
    color_clicks = sum(by_color[c]["clicks"] for c in by_color)
    
    psychological_stats = {
        "views": psych_views,
        "clicks": psych_clicks,
        "rate": round((psych_clicks / max(psych_views, 1)) * 100, 2) if psych_views > 0 else 0,
        "vs_color_rate": round(
            ((psych_clicks / max(psych_views, 1)) - (color_clicks / max(color_views, 1))) * 100, 2
        ) if psych_views > 0 and color_views > 0 else 0
    }
    
    return {
        "total_views": total_views,
        "total_clicks": total_clicks,
        "conversion_rate": conversion_rate,
        "variants": variants,
        "by_color": by_color,
        "by_need": by_need,
        "by_conflict_style": by_conflict_style,
        "psychological_stats": psychological_stats,
        "by_entry_point": by_entry_point,
        "timeline": timeline,
        "period_days": days
    }


@relasi4_router.get("/analytics/events")
async def get_analytics_events(
    limit: int = 100,
    event_type: Optional[str] = None,
    variant: Optional[str] = None
):
    """Get raw analytics events for detailed analysis."""
    db = await get_db()
    
    query = {}
    if event_type:
        query["event"] = event_type
    if variant:
        query["variant"] = variant
    
    events = await db.r4_analytics.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return {"events": events, "count": len(events)}



# ==================== HEATMAP & INSIGHTS ENDPOINTS ====================

@relasi4_router.get("/analytics/heatmap")
async def get_emotional_heatmap(days: int = 30):
    """
    Get emotional needs heatmap data (aggregated, non-PII).
    X-axis: Primary Need, Y-axis: Conflict Style
    Returns volume and conversion rate per cell.
    """
    db = await get_db()
    
    from datetime import timedelta
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
    
    # Aggregate from daily collection
    pipeline = [
        {"$match": {"date": {"$gte": cutoff}}},
        {"$group": {
            "_id": {
                "need": "$primary_need",
                "conflict": "$primary_conflict_style"
            },
            "total_count": {"$sum": "$count"},
            "total_conversions": {"$sum": "$conversions"}
        }},
        {"$project": {
            "_id": 0,
            "need": "$_id.need",
            "conflict": "$_id.conflict",
            "volume": "$total_count",
            "conversions": "$total_conversions",
            "conversion_rate": {
                "$cond": {
                    "if": {"$gt": ["$total_count", 0]},
                    "then": {"$multiply": [{"$divide": ["$total_conversions", "$total_count"]}, 100]},
                    "else": 0
                }
            }
        }}
    ]
    
    result = await db.r4_analytics_daily.aggregate(pipeline).to_list(100)
    
    # Build heatmap matrix
    needs = ['need_control', 'need_validation', 'need_harmony', 'need_autonomy']
    conflicts = ['conflict_attack', 'conflict_avoid', 'conflict_freeze', 'conflict_appease']
    
    heatmap = {}
    for need in needs:
        heatmap[need] = {}
        for conflict in conflicts:
            heatmap[need][conflict] = {"volume": 0, "conversions": 0, "rate": 0}
    
    total_volume = 0
    for item in result:
        need = item.get("need")
        conflict = item.get("conflict")
        if need in heatmap and conflict in heatmap.get(need, {}):
            heatmap[need][conflict] = {
                "volume": item["volume"],
                "conversions": item["conversions"],
                "rate": round(item["conversion_rate"], 2)
            }
            total_volume += item["volume"]
    
    # Calculate percentages
    for need in needs:
        for conflict in conflicts:
            cell = heatmap[need][conflict]
            cell["percentage"] = round((cell["volume"] / max(total_volume, 1)) * 100, 2)
    
    return {
        "heatmap": heatmap,
        "needs": needs,
        "conflicts": conflicts,
        "total_volume": total_volume,
        "period_days": days
    }


@relasi4_router.get("/analytics/abc-comparison")
async def get_abc_test_comparison(days: int = 30):
    """
    Get A/B/C test comparison data.
    Compares color vs psychological vs hybrid variants.
    """
    db = await get_db()
    
    from datetime import timedelta
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    
    pipeline = [
        {"$match": {"created_at": {"$gte": cutoff}}},
        {"$group": {
            "_id": {"variant": "$cta_variant", "event": "$event"},
            "count": {"$sum": 1}
        }}
    ]
    
    result = await db.r4_analytics.aggregate(pipeline).to_list(100)
    
    # Process results
    variants = {
        "color": {"rendered": 0, "clicked": 0, "payment_started": 0, "payment_success": 0},
        "psychological": {"rendered": 0, "clicked": 0, "payment_started": 0, "payment_success": 0},
        "hybrid": {"rendered": 0, "clicked": 0, "payment_started": 0, "payment_success": 0}
    }
    
    event_mapping = {
        "relasi4_cta_rendered": "rendered",
        "relasi4_teaser_viewed": "rendered",
        "relasi4_cta_rendered_psychological": "rendered",
        "relasi4_cta_clicked": "clicked",
        "relasi4_cta_clicked_psychological": "clicked",
        "relasi4_payment_started": "payment_started",
        "relasi4_payment_success": "payment_success"
    }
    
    for item in result:
        variant = item["_id"].get("variant")
        event = item["_id"].get("event")
        
        # Skip if missing data
        if not variant or not event:
            continue
        
        # Map old variant names to new
        if variant in ["soft", "aggressive"]:
            variant = "color"
        elif variant == "psychological":
            variant = "psychological"
        
        if variant in variants and event in event_mapping:
            variants[variant][event_mapping[event]] += item["count"]
    
    # Calculate rates
    for v in variants:
        rendered = variants[v]["rendered"]
        clicked = variants[v]["clicked"]
        payment_started = variants[v]["payment_started"]
        payment_success = variants[v]["payment_success"]
        
        variants[v]["click_rate"] = round((clicked / max(rendered, 1)) * 100, 2)
        variants[v]["payment_rate"] = round((payment_started / max(clicked, 1)) * 100, 2)
        variants[v]["conversion_rate"] = round((payment_success / max(rendered, 1)) * 100, 2)
    
    # Determine winner
    best_variant = max(variants.keys(), key=lambda v: variants[v]["conversion_rate"])
    best_rate = variants[best_variant]["conversion_rate"]
    
    return {
        "variants": variants,
        "winner": best_variant,
        "best_conversion_rate": best_rate,
        "period_days": days
    }


@relasi4_router.get("/analytics/weekly-insights")
async def get_weekly_insights():
    """
    Generate auto-generated weekly insights text.
    Analyzes dominant needs, conflict patterns, and CTA performance.
    """
    db = await get_db()
    
    from datetime import timedelta
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    
    # Get aggregated data
    pipeline = [
        {"$match": {"created_at": {"$gte": week_ago}}},
        {"$facet": {
            "by_need": [
                {"$match": {"primary_need": {"$ne": None}}},
                {"$group": {"_id": "$primary_need", "count": {"$sum": 1}}}
            ],
            "by_conflict": [
                {"$match": {"primary_conflict_style": {"$ne": None}}},
                {"$group": {"_id": "$primary_conflict_style", "count": {"$sum": 1}}}
            ],
            "by_variant": [
                {"$group": {
                    "_id": {"variant": "$cta_variant", "event": "$event"},
                    "count": {"$sum": 1}
                }}
            ],
            "totals": [
                {"$group": {"_id": None, "total": {"$sum": 1}}}
            ]
        }}
    ]
    
    result = await db.r4_analytics.aggregate(pipeline).to_list(1)
    
    if not result:
        return {
            "insights": [],
            "summary_id": "Belum ada data cukup untuk analisis minggu ini.",
            "summary_en": "Not enough data for this week's analysis."
        }
    
    data = result[0]
    
    # Process needs
    needs_data = {item["_id"]: item["count"] for item in data.get("by_need", [])}
    total_needs = sum(needs_data.values())
    
    # Process conflicts
    conflicts_data = {item["_id"]: item["count"] for item in data.get("by_conflict", [])}
    
    # Process variants
    variant_stats = {"color": {"views": 0, "clicks": 0}, "psychological": {"views": 0, "clicks": 0}, "hybrid": {"views": 0, "clicks": 0}}
    for item in data.get("by_variant", []):
        v = item["_id"].get("variant")
        e = item["_id"].get("event")
        if not v or not e:
            continue
        if v in ["soft", "aggressive"]:
            v = "color"
        if v in variant_stats:
            if "rendered" in e or "viewed" in e:
                variant_stats[v]["views"] += item["count"]
            elif "clicked" in e:
                variant_stats[v]["clicks"] += item["count"]
    
    insights = []
    
    # Generate need insights
    if needs_data:
        dominant_need = max(needs_data.keys(), key=lambda x: needs_data[x])
        dominant_pct = round((needs_data[dominant_need] / max(total_needs, 1)) * 100)
        
        need_labels = {
            "need_control": ("kontrol", "control"),
            "need_validation": ("validasi", "validation"),
            "need_harmony": ("harmoni", "harmony"),
            "need_autonomy": ("otonomi", "autonomy")
        }
        need_label = need_labels.get(dominant_need, (dominant_need, dominant_need))
        
        insights.append({
            "type": "need_dominant",
            "text_id": f"Kebutuhan {need_label[0]} mendominasi ({dominant_pct}%)",
            "text_en": f"Need for {need_label[1]} dominates ({dominant_pct}%)"
        })
    
    # Generate conflict insights
    if conflicts_data:
        dominant_conflict = max(conflicts_data.keys(), key=lambda x: conflicts_data[x])
        conflict_labels = {
            "conflict_attack": ("menyerang", "attack"),
            "conflict_avoid": ("menghindar", "avoidance"),
            "conflict_freeze": ("membeku", "freeze"),
            "conflict_appease": ("menenangkan", "appease")
        }
        conflict_label = conflict_labels.get(dominant_conflict, (dominant_conflict, dominant_conflict))
        
        insights.append({
            "type": "conflict_pattern",
            "text_id": f"Pola konflik paling umum: {conflict_label[0]}",
            "text_en": f"Most common conflict pattern: {conflict_label[1]}"
        })
    
    # Generate variant insights
    best_variant = None
    best_rate = 0
    for v, stats in variant_stats.items():
        rate = (stats["clicks"] / max(stats["views"], 1)) * 100
        if rate > best_rate and stats["views"] > 5:  # Minimum sample size
            best_rate = rate
            best_variant = v
    
    if best_variant:
        variant_labels = {
            "color": ("berbasis warna", "color-based"),
            "psychological": ("psikologis", "psychological"),
            "hybrid": ("hybrid", "hybrid")
        }
        v_label = variant_labels.get(best_variant, (best_variant, best_variant))
        
        insights.append({
            "type": "variant_winner",
            "text_id": f"CTA {v_label[0]} paling efektif (+{round(best_rate)}% konversi)",
            "text_en": f"{v_label[1].capitalize()} CTA most effective (+{round(best_rate)}% conversion)"
        })
    
    # Generate summary
    summary_parts_id = []
    summary_parts_en = []
    
    if needs_data:
        dominant_need = max(needs_data.keys(), key=lambda x: needs_data[x])
        need_labels = {"need_control": "kontrol", "need_validation": "validasi", "need_harmony": "harmoni", "need_autonomy": "otonomi"}
        dominant_pct = round((needs_data[dominant_need] / max(total_needs, 1)) * 100)
        summary_parts_id.append(f"kebutuhan {need_labels.get(dominant_need, dominant_need)} mendominasi ({dominant_pct}%)")
        
        need_labels_en = {"need_control": "control", "need_validation": "validation", "need_harmony": "harmony", "need_autonomy": "autonomy"}
        summary_parts_en.append(f"need for {need_labels_en.get(dominant_need, dominant_need)} dominates ({dominant_pct}%)")
    
    if conflicts_data and needs_data:
        dominant_conflict = max(conflicts_data.keys(), key=lambda x: conflicts_data[x])
        conflict_labels = {"conflict_attack": "menyerang", "conflict_avoid": "menghindar", "conflict_freeze": "membeku", "conflict_appease": "menenangkan"}
        conflict_labels_en = {"conflict_attack": "attack", "conflict_avoid": "avoidance", "conflict_freeze": "freeze", "conflict_appease": "appease"}
        summary_parts_id.append(f"terutama dengan pola {conflict_labels.get(dominant_conflict, dominant_conflict)}")
        summary_parts_en.append(f"especially with {conflict_labels_en.get(dominant_conflict, dominant_conflict)} pattern")
    
    if best_variant:
        variant_labels = {"color": "warna", "psychological": "psikologis", "hybrid": "hybrid"}
        variant_labels_en = {"color": "color-based", "psychological": "psychological", "hybrid": "hybrid"}
        summary_parts_id.append(f"CTA {variant_labels.get(best_variant, best_variant)} meningkatkan konversi {round(best_rate)}%")
        summary_parts_en.append(f"{variant_labels_en.get(best_variant, best_variant)} CTA improves conversion by {round(best_rate)}%")
    
    summary_id = f"Minggu ini, {'. '.join(summary_parts_id)}." if summary_parts_id else "Belum ada data cukup untuk analisis."
    summary_en = f"This week, {'. '.join(summary_parts_en)}." if summary_parts_en else "Not enough data for analysis."
    
    return {
        "insights": insights,
        "summary_id": summary_id,
        "summary_en": summary_en,
        "period": "weekly",
        "generated_at": datetime.now(timezone.utc).isoformat()
    }

