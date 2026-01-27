"""
RELASI4™ Package
================
Premium insight engine for Relasi4Warna.

Components:
- scoring_service: Deterministic scoring service (no AI)
- prompts: RELASI4™ prompt registry
- reports: Report generation service
- schemas: Input/output JSON schemas
"""

from .scoring_service import (
    RELASI4ScoringService,
    ScoringResult,
    UserAnswer,
    DimensionScore,
    get_scoring_service,
    DIMENSIONS_CANONICAL,
    COLOR_DIMENSIONS,
    CONFLICT_DIMENSIONS,
    NEED_DIMENSIONS,
    DIMENSION_LABELS,
    color_to_archetype,
    archetype_to_color,
    get_color_hex,
    get_conflict_description,
)

__all__ = [
    'RELASI4ScoringService',
    'ScoringResult',
    'UserAnswer',
    'DimensionScore',
    'get_scoring_service',
    'DIMENSIONS_CANONICAL',
    'COLOR_DIMENSIONS',
    'CONFLICT_DIMENSIONS',
    'NEED_DIMENSIONS',
    'DIMENSION_LABELS',
    'color_to_archetype',
    'archetype_to_color',
    'get_color_hex',
    'get_conflict_description',
]

