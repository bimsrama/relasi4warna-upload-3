"""
RELASI4™ Deterministic Scoring Service
======================================
Calculates user scores based on quiz answers and the predefined weight_map.
Non-AI, purely rule-based calculation.

Scoring Logic:
1. User answers questions (chooses A, B, C, or D)
2. Each answer has a weight_map with dimension scores
3. Aggregate all weights to get dimension scores
4. Calculate derived metrics (color dominance, conflict style, etc.)

Collections used:
- r4_questions: Question metadata
- r4_answers: Answer options with weight_map
- r4_responses: User quiz responses
"""

import os
import sys
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timezone
from dataclasses import dataclass, field
from motor.motor_asyncio import AsyncIOMotorDatabase

# Canonical dimension keys (must match seed data)
DIMENSIONS_CANONICAL = [
    'color_red', 'color_yellow', 'color_green', 'color_blue',
    'conflict_attack', 'conflict_avoid', 'conflict_freeze', 'conflict_appease',
    'need_control', 'need_validation', 'need_harmony', 'need_autonomy',
    'emotion_expression', 'emotion_sensitivity',
    'decision_speed', 'structure_need'
]

# Color dimensions for primary/secondary determination
COLOR_DIMENSIONS = ['color_red', 'color_yellow', 'color_green', 'color_blue']

# Conflict style dimensions
CONFLICT_DIMENSIONS = ['conflict_attack', 'conflict_avoid', 'conflict_freeze', 'conflict_appease']

# Core need dimensions
NEED_DIMENSIONS = ['need_control', 'need_validation', 'need_harmony', 'need_autonomy']

# Human-readable labels
DIMENSION_LABELS = {
    'color_red': {'id': 'Merah (Driver)', 'en': 'Red (Driver)'},
    'color_yellow': {'id': 'Kuning (Spark)', 'en': 'Yellow (Spark)'},
    'color_green': {'id': 'Hijau (Anchor)', 'en': 'Green (Anchor)'},
    'color_blue': {'id': 'Biru (Analyst)', 'en': 'Blue (Analyst)'},
    'conflict_attack': {'id': 'Menyerang', 'en': 'Attack'},
    'conflict_avoid': {'id': 'Menghindar', 'en': 'Avoid'},
    'conflict_freeze': {'id': 'Membeku', 'en': 'Freeze'},
    'conflict_appease': {'id': 'Menenangkan', 'en': 'Appease'},
    'need_control': {'id': 'Kontrol', 'en': 'Control'},
    'need_validation': {'id': 'Validasi', 'en': 'Validation'},
    'need_harmony': {'id': 'Harmoni', 'en': 'Harmony'},
    'need_autonomy': {'id': 'Otonomi', 'en': 'Autonomy'},
    'emotion_expression': {'id': 'Ekspresi Emosi', 'en': 'Emotion Expression'},
    'emotion_sensitivity': {'id': 'Sensitivitas Emosi', 'en': 'Emotion Sensitivity'},
    'decision_speed': {'id': 'Kecepatan Keputusan', 'en': 'Decision Speed'},
    'structure_need': {'id': 'Kebutuhan Struktur', 'en': 'Structure Need'}
}


@dataclass
class UserAnswer:
    """Represents a single user answer."""
    set_code: str
    order_no: int
    label: str  # A, B, C, or D


@dataclass
class DimensionScore:
    """Score for a single dimension."""
    dimension: str
    score: int
    max_possible: int
    percentage: float
    label_id: str
    label_en: str


@dataclass
class ScoringResult:
    """Complete scoring result for a user."""
    # User & Assessment info
    user_id: str
    assessment_id: str
    question_set_code: str
    
    # Raw dimension scores
    dimension_scores: Dict[str, int] = field(default_factory=dict)
    
    # Derived scores
    primary_color: str = ""
    secondary_color: str = ""
    color_scores: Dict[str, int] = field(default_factory=dict)
    
    primary_conflict_style: str = ""
    conflict_scores: Dict[str, int] = field(default_factory=dict)
    
    primary_need: str = ""
    need_scores: Dict[str, int] = field(default_factory=dict)
    
    # Additional metrics
    emotion_expression_score: int = 0
    emotion_sensitivity_score: int = 0
    decision_speed_score: int = 0
    structure_need_score: int = 0
    
    # Metadata
    questions_answered: int = 0
    total_questions: int = 0
    completion_rate: float = 0.0
    
    # Timestamps
    calculated_at: str = ""
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage/API response."""
        return {
            'user_id': self.user_id,
            'assessment_id': self.assessment_id,
            'question_set_code': self.question_set_code,
            'dimension_scores': self.dimension_scores,
            'primary_color': self.primary_color,
            'secondary_color': self.secondary_color,
            'color_scores': self.color_scores,
            'primary_conflict_style': self.primary_conflict_style,
            'conflict_scores': self.conflict_scores,
            'primary_need': self.primary_need,
            'need_scores': self.need_scores,
            'emotion_expression_score': self.emotion_expression_score,
            'emotion_sensitivity_score': self.emotion_sensitivity_score,
            'decision_speed_score': self.decision_speed_score,
            'structure_need_score': self.structure_need_score,
            'questions_answered': self.questions_answered,
            'total_questions': self.total_questions,
            'completion_rate': self.completion_rate,
            'calculated_at': self.calculated_at
        }


class RELASI4ScoringService:
    """Deterministic scoring engine for RELASI4™ assessments."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    def _derive_colors_from_psychology(
        self,
        need_scores: Dict[str, int],
        conflict_scores: Dict[str, int],
        dimension_scores: Dict[str, int]
    ) -> Dict[str, int]:
        """
        Derive color archetype scores from psychological dimensions.
        Used for R4T_DEEP_V1 which doesn't have explicit color weights.
        
        Mapping (based on RELASI4™ psychology):
        - color_red (Driver): need_control + conflict_attack + decision_speed
        - color_yellow (Spark): need_validation + emotion_expression  
        - color_green (Anchor): need_harmony + conflict_appease + conflict_avoid
        - color_blue (Analyst): need_autonomy + conflict_freeze + structure_need
        """
        derived_colors = {
            'color_red': (
                need_scores.get('need_control', 0) * 2 +
                conflict_scores.get('conflict_attack', 0) * 1.5 +
                dimension_scores.get('decision_speed', 0)
            ),
            'color_yellow': (
                need_scores.get('need_validation', 0) * 2 +
                dimension_scores.get('emotion_expression', 0) * 1.5
            ),
            'color_green': (
                need_scores.get('need_harmony', 0) * 2 +
                conflict_scores.get('conflict_appease', 0) +
                conflict_scores.get('conflict_avoid', 0)
            ),
            'color_blue': (
                need_scores.get('need_autonomy', 0) * 2 +
                conflict_scores.get('conflict_freeze', 0) * 1.5 +
                dimension_scores.get('structure_need', 0)
            )
        }
        
        # Round to integers
        return {k: int(v) for k, v in derived_colors.items()}
    
    async def get_weight_map_for_answer(
        self, 
        set_code: str, 
        order_no: int, 
        label: str
    ) -> Optional[Dict[str, int]]:
        """
        Fetch weight_map for a specific answer from r4_answers collection.
        
        Args:
            set_code: Question set code (e.g., 'R4W_CORE_V1')
            order_no: Question number (1-40)
            label: Answer label (A, B, C, D)
            
        Returns:
            weight_map dict or None if not found
        """
        answer = await self.db.r4_answers.find_one(
            {
                'set_code': set_code,
                'order_no': order_no,
                'label': label.upper()
            },
            {'_id': 0, 'weight_map': 1}
        )
        
        if answer:
            return answer.get('weight_map', {})
        return None
    
    async def calculate_scores(
        self,
        user_id: str,
        assessment_id: str,
        question_set_code: str,
        answers: List[UserAnswer]
    ) -> ScoringResult:
        """
        Calculate dimension scores based on user answers.
        
        Args:
            user_id: User identifier
            assessment_id: Unique assessment session ID
            question_set_code: Question set code (e.g., 'R4W_CORE_V1')
            answers: List of user answers
            
        Returns:
            ScoringResult with all calculated scores
        """
        # Initialize dimension scores to 0
        dimension_scores = {dim: 0 for dim in DIMENSIONS_CANONICAL}
        
        # Count questions in the set
        total_questions = await self.db.r4_questions.count_documents({
            'set_code': question_set_code,
            'is_active': True
        })
        
        questions_answered = 0
        
        # Aggregate scores from each answer
        for answer in answers:
            weight_map = await self.get_weight_map_for_answer(
                answer.set_code,
                answer.order_no,
                answer.label
            )
            
            if weight_map:
                questions_answered += 1
                for dim, weight in weight_map.items():
                    if dim in dimension_scores:
                        dimension_scores[dim] += weight
        
        # Extract sub-scores
        color_scores = {dim: dimension_scores[dim] for dim in COLOR_DIMENSIONS}
        conflict_scores = {dim: dimension_scores[dim] for dim in CONFLICT_DIMENSIONS}
        need_scores = {dim: dimension_scores[dim] for dim in NEED_DIMENSIONS}
        
        # DEEP QUIZ FIX: If color scores are all zero (R4T_DEEP_V1 doesn't have color weights),
        # derive color scores from need/conflict patterns using psychological mapping
        if all(score == 0 for score in color_scores.values()) and any(score > 0 for score in need_scores.values()):
            color_scores = self._derive_colors_from_psychology(
                need_scores, 
                conflict_scores, 
                dimension_scores
            )
        
        # Determine primary/secondary colors
        sorted_colors = sorted(color_scores.items(), key=lambda x: x[1], reverse=True)
        primary_color = sorted_colors[0][0] if sorted_colors else ''
        secondary_color = sorted_colors[1][0] if len(sorted_colors) > 1 else ''
        
        # Determine primary conflict style
        sorted_conflicts = sorted(conflict_scores.items(), key=lambda x: x[1], reverse=True)
        primary_conflict = sorted_conflicts[0][0] if sorted_conflicts else ''
        
        # Determine primary need
        sorted_needs = sorted(need_scores.items(), key=lambda x: x[1], reverse=True)
        primary_need = sorted_needs[0][0] if sorted_needs else ''
        
        # Completion rate
        completion_rate = (questions_answered / total_questions * 100) if total_questions > 0 else 0
        
        return ScoringResult(
            user_id=user_id,
            assessment_id=assessment_id,
            question_set_code=question_set_code,
            dimension_scores=dimension_scores,
            primary_color=primary_color,
            secondary_color=secondary_color,
            color_scores=color_scores,
            primary_conflict_style=primary_conflict,
            conflict_scores=conflict_scores,
            primary_need=primary_need,
            need_scores=need_scores,
            emotion_expression_score=dimension_scores.get('emotion_expression', 0),
            emotion_sensitivity_score=dimension_scores.get('emotion_sensitivity', 0),
            decision_speed_score=dimension_scores.get('decision_speed', 0),
            structure_need_score=dimension_scores.get('structure_need', 0),
            questions_answered=questions_answered,
            total_questions=total_questions,
            completion_rate=round(completion_rate, 1),
            calculated_at=datetime.now(timezone.utc).isoformat()
        )
    
    async def save_assessment_result(self, result: ScoringResult) -> str:
        """
        Save scoring result to r4_responses collection.
        
        Args:
            result: ScoringResult to save
            
        Returns:
            assessment_id
        """
        doc = result.to_dict()
        doc['created_at'] = datetime.now(timezone.utc)
        
        # Upsert by assessment_id
        await self.db.r4_responses.update_one(
            {'assessment_id': result.assessment_id},
            {'$set': doc},
            upsert=True
        )
        
        return result.assessment_id
    
    async def get_assessment_result(self, assessment_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve a saved assessment result.
        
        Args:
            assessment_id: Assessment ID to retrieve
            
        Returns:
            Assessment result dict or None
        """
        result = await self.db.r4_responses.find_one(
            {'assessment_id': assessment_id},
            {'_id': 0}
        )
        return result
    
    async def get_user_assessments(
        self, 
        user_id: str, 
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get recent assessments for a user.
        
        Args:
            user_id: User identifier
            limit: Max results to return
            
        Returns:
            List of assessment results
        """
        cursor = self.db.r4_responses.find(
            {'user_id': user_id},
            {'_id': 0}
        ).sort('created_at', -1).limit(limit)
        
        return await cursor.to_list(length=limit)


def color_to_archetype(color_dimension: str) -> str:
    """Convert color dimension to archetype name."""
    mapping = {
        'color_red': 'driver',
        'color_yellow': 'spark',
        'color_green': 'anchor',
        'color_blue': 'analyst'
    }
    return mapping.get(color_dimension, '')


def archetype_to_color(archetype: str) -> str:
    """Convert archetype name to color dimension."""
    mapping = {
        'driver': 'color_red',
        'spark': 'color_yellow',
        'anchor': 'color_green',
        'analyst': 'color_blue'
    }
    return mapping.get(archetype.lower(), '')


def get_color_hex(color_dimension: str) -> str:
    """Get hex color code for a color dimension."""
    colors = {
        'color_red': '#C05640',
        'color_yellow': '#D99E30',
        'color_green': '#5D8A66',
        'color_blue': '#5B8FA8'
    }
    return colors.get(color_dimension, '#666666')


def get_conflict_description(conflict_style: str, language: str = 'id') -> str:
    """Get human-readable description for conflict style."""
    descriptions = {
        'conflict_attack': {
            'id': 'Cenderung langsung menghadapi konflik dengan nada tegas',
            'en': 'Tends to directly confront conflict with assertive tone'
        },
        'conflict_avoid': {
            'id': 'Cenderung menghindari konflik dan mencari waktu tenang',
            'en': 'Tends to avoid conflict and seek calm time'
        },
        'conflict_freeze': {
            'id': 'Cenderung diam dan butuh waktu memproses saat konflik',
            'en': 'Tends to freeze and need processing time during conflict'
        },
        'conflict_appease': {
            'id': 'Cenderung menenangkan situasi dan mencari kedamaian',
            'en': 'Tends to appease situations and seek peace'
        }
    }
    style_desc = descriptions.get(conflict_style, {})
    return style_desc.get(language, style_desc.get('en', ''))


# Singleton instance for the scoring service
_scoring_service: Optional[RELASI4ScoringService] = None


def get_scoring_service(db: AsyncIOMotorDatabase) -> RELASI4ScoringService:
    """Get or create scoring service singleton."""
    global _scoring_service
    if _scoring_service is None:
        _scoring_service = RELASI4ScoringService(db)
    return _scoring_service
