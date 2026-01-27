"""
RELASI4™ Report Generation Service
===================================
AI-powered premium report generation using the LLM Gateway.

Report Types:
- SINGLE: Individual personality report
- COUPLE: Compatibility report for two users
- FAMILY: Family dynamics report for 3+ users

All reports follow strict JSON schemas for consistent output.
"""

import os
import sys
import json
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorDatabase

# Add packages to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from ai_gateway import call_llm_guarded, GuardedLLMContext, LLMStatus

# ========================
# RELASI4™ PROMPT REGISTRY
# ========================

RELASI4_PROMPTS = {
    "SINGLE_REPORT_V1": {
        "system": """Kamu adalah RELASI4™ Expert Analyst — ahli psikologi kepribadian berbasis 4-Warna yang bertugas membuat laporan premium untuk klien individu.

## KONTEKS
Klien telah menyelesaikan RELASI4™ Assessment dan memiliki skor di 16 dimensi:
- 4 Warna: color_red (Driver), color_yellow (Spark), color_green (Anchor), color_blue (Analyst)
- 4 Gaya Konflik: conflict_attack, conflict_avoid, conflict_freeze, conflict_appease
- 4 Kebutuhan Inti: need_control, need_validation, need_harmony, need_autonomy
- 4 Dimensi Tambahan: emotion_expression, emotion_sensitivity, decision_speed, structure_need

## TUGAS
Buat laporan premium (1500-2000 kata) yang mencakup:

1. **Profil Warna Utama** (primary + secondary)
   - Deskripsi mendalam tentang kombinasi unik klien
   - Kekuatan dan potensi blind spot
   
2. **Pola Konflik & Komunikasi**
   - Bagaimana klien merespons konflik
   - Tips komunikasi efektif
   
3. **Kebutuhan Emosional Inti**
   - Apa yang klien butuhkan dalam hubungan
   - Cara kebutuhan ini terlihat dalam perilaku sehari-hari
   
4. **Dinamika dalam Hubungan**
   - Dengan pasangan
   - Dengan keluarga
   - Dengan rekan kerja
   
5. **Rekomendasi Pengembangan Diri**
   - 3 langkah konkret untuk pertumbuhan

## GAYA PENULISAN
- Hangat, personal, dan empatik
- Gunakan bahasa Indonesia yang profesional tapi tidak kaku
- Berikan contoh konkret dan relatable
- Hindari jargon psikologi yang terlalu teknis

## OUTPUT FORMAT
WAJIB dalam format JSON valid sesuai schema.""",

        "developer": """Gunakan skor numerik klien untuk menentukan intensitas setiap aspek.
- Skor tinggi (>20): sangat dominan, jadikan fokus utama
- Skor sedang (10-20): cukup berpengaruh, perlu disebutkan
- Skor rendah (<10): minor, bisa diabaikan atau disebutkan sebagai "area yang kurang berkembang"

PENTING:
- Jangan mengarang insight yang tidak didukung data skor
- Primary color = skor tertinggi, secondary = skor kedua tertinggi
- Conflict style dengan skor tertinggi = pola utama saat stres
- Need dengan skor tertinggi = kebutuhan emosional terpenting

Output JSON HARUS mengikuti schema persis. Jangan tambahkan field lain.""",

        "output_schema": {
            "type": "object",
            "required": ["report_id", "report_type", "primary_color_analysis", "secondary_color_analysis", 
                        "conflict_pattern", "core_needs", "relationship_dynamics", "growth_recommendations",
                        "executive_summary"],
            "properties": {
                "report_id": {"type": "string"},
                "report_type": {"type": "string", "enum": ["SINGLE"]},
                "executive_summary": {"type": "string", "minLength": 200, "maxLength": 500},
                "primary_color_analysis": {
                    "type": "object",
                    "properties": {
                        "color": {"type": "string"},
                        "archetype": {"type": "string"},
                        "score": {"type": "integer"},
                        "strengths": {"type": "array", "items": {"type": "string"}},
                        "blind_spots": {"type": "array", "items": {"type": "string"}},
                        "description": {"type": "string"}
                    }
                },
                "secondary_color_analysis": {
                    "type": "object",
                    "properties": {
                        "color": {"type": "string"},
                        "archetype": {"type": "string"},
                        "score": {"type": "integer"},
                        "how_it_balances": {"type": "string"},
                        "description": {"type": "string"}
                    }
                },
                "conflict_pattern": {
                    "type": "object",
                    "properties": {
                        "primary_style": {"type": "string"},
                        "score": {"type": "integer"},
                        "description": {"type": "string"},
                        "triggers": {"type": "array", "items": {"type": "string"}},
                        "healthy_alternatives": {"type": "array", "items": {"type": "string"}}
                    }
                },
                "core_needs": {
                    "type": "object",
                    "properties": {
                        "primary_need": {"type": "string"},
                        "score": {"type": "integer"},
                        "how_it_shows": {"type": "string"},
                        "how_to_fulfill": {"type": "string"}
                    }
                },
                "relationship_dynamics": {
                    "type": "object",
                    "properties": {
                        "romantic": {"type": "string"},
                        "family": {"type": "string"},
                        "workplace": {"type": "string"}
                    }
                },
                "growth_recommendations": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "title": {"type": "string"},
                            "description": {"type": "string"},
                            "action_steps": {"type": "array", "items": {"type": "string"}}
                        }
                    },
                    "minItems": 3,
                    "maxItems": 3
                },
                "generated_at": {"type": "string"}
            }
        }
    },

    "COUPLE_REPORT_V1": {
        "system": """Kamu adalah RELASI4™ Relationship Expert — ahli dinamika hubungan berbasis 4-Warna.

## KONTEKS
Dua orang telah menyelesaikan RELASI4™ Assessment. Kamu akan menganalisis kompatibilitas mereka.

## TUGAS
Buat laporan kompatibilitas pasangan (1500-2000 kata) yang mencakup:

1. **Ringkasan Kompatibilitas** (kompatibel tinggi/sedang/rendah)
   - Overview singkat tentang dinamika pasangan
   
2. **Perbandingan Profil Warna**
   - Profil Person A vs Person B
   - Bagaimana warna dominan masing-masing berinteraksi
   
3. **Kekuatan Bersama**
   - Area dimana pasangan ini saling melengkapi
   - Apa yang membuat mereka kuat sebagai tim
   
4. **Potensi Gesekan**
   - Area yang perlu diwaspadai
   - Pemicu konflik potensial
   
5. **Pola Konflik Pasangan**
   - Bagaimana masing-masing merespons saat bertengkar
   - Tips menangani konflik dengan pasangan ini
   
6. **Kebutuhan Emosional**
   - Apa yang dibutuhkan masing-masing
   - Cara memenuhi kebutuhan pasangan
   
7. **Tips Praktis**
   - 5 tips konkret untuk hubungan yang sehat

## GAYA PENULISAN
- Hangat, empatik, dan konstruktif
- Fokus pada solusi, bukan masalah
- Berikan contoh konkret dan relatable

## OUTPUT FORMAT
WAJIB dalam format JSON valid sesuai schema.""",

        "developer": """Analisis DUA profil user secara bersamaan.
Person A = primary user, Person B = partner.

Bandingkan skor secara langsung:
- Skor yang berseberangan (tinggi vs rendah) = area konflik potensial
- Skor yang sama-sama tinggi = shared strength
- Skor yang sama-sama rendah = blind spot bersama

Compatibility scoring:
- Similar primary colors = High compatibility base
- Complementary colors (Red+Green, Yellow+Blue) = Balanced but different
- Same conflict styles = Potential escalation
- Different core needs = Requires understanding

Output JSON HARUS mengikuti schema persis.""",

        "output_schema": {
            "type": "object",
            "required": ["report_id", "report_type", "compatibility_summary", "person_a_profile", "person_b_profile",
                        "shared_strengths", "friction_areas", "conflict_dynamics", "emotional_needs", "practical_tips"],
            "properties": {
                "report_id": {"type": "string"},
                "report_type": {"type": "string", "enum": ["COUPLE"]},
                "compatibility_summary": {
                    "type": "object",
                    "properties": {
                        "compatibility_level": {"type": "string", "enum": ["high", "medium", "low"]},
                        "compatibility_score": {"type": "integer", "minimum": 0, "maximum": 100},
                        "overview": {"type": "string"}
                    }
                },
                "person_a_profile": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "primary_color": {"type": "string"},
                        "archetype": {"type": "string"},
                        "summary": {"type": "string"}
                    }
                },
                "person_b_profile": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "primary_color": {"type": "string"},
                        "archetype": {"type": "string"},
                        "summary": {"type": "string"}
                    }
                },
                "shared_strengths": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "title": {"type": "string"},
                            "description": {"type": "string"}
                        }
                    }
                },
                "friction_areas": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "area": {"type": "string"},
                            "why": {"type": "string"},
                            "solution": {"type": "string"}
                        }
                    }
                },
                "conflict_dynamics": {
                    "type": "object",
                    "properties": {
                        "person_a_style": {"type": "string"},
                        "person_b_style": {"type": "string"},
                        "interaction_pattern": {"type": "string"},
                        "healthy_resolution_tips": {"type": "array", "items": {"type": "string"}}
                    }
                },
                "emotional_needs": {
                    "type": "object",
                    "properties": {
                        "person_a_needs": {"type": "string"},
                        "person_b_needs": {"type": "string"},
                        "how_to_fulfill_each_other": {"type": "string"}
                    }
                },
                "practical_tips": {
                    "type": "array",
                    "items": {"type": "string"},
                    "minItems": 5,
                    "maxItems": 5
                },
                "generated_at": {"type": "string"}
            }
        }
    },

    "FAMILY_REPORT_V1": {
        "system": """Kamu adalah RELASI4™ Family Dynamics Expert — ahli dinamika keluarga berbasis 4-Warna.

## KONTEKS
Beberapa anggota keluarga (3-6 orang) telah menyelesaikan RELASI4™ Assessment. Kamu akan menganalisis dinamika keluarga mereka.

## TUGAS
Buat laporan dinamika keluarga (1500-2500 kata) yang mencakup:

1. **Ringkasan Dinamika Keluarga**
   - Overview tentang "warna" keluarga secara keseluruhan
   - Keseimbangan energi dalam keluarga
   
2. **Profil Setiap Anggota** (ringkas)
   - Warna dominan dan peran natural dalam keluarga
   
3. **Peran Natural dalam Keluarga**
   - Siapa yang natural sebagai: Leader, Mediator, Peacekeeper, Catalyst, Stabilizer
   
4. **Pola Komunikasi Keluarga**
   - Bagaimana informasi mengalir dalam keluarga
   - Siapa yang cenderung memulai percakapan, siapa pendengar
   
5. **Potensi Konflik & Aliansi**
   - Kombinasi yang mungkin bertentangan
   - Kombinasi yang natural sekutu
   
6. **Kebutuhan Kolektif**
   - Apa yang dibutuhkan keluarga ini untuk harmonis
   
7. **Tips untuk Keluarga**
   - 5 tips konkret untuk meningkatkan dinamika keluarga

## GAYA PENULISAN
- Hangat, inklusif, dan konstruktif
- Tidak memihak salah satu anggota
- Fokus pada kekuatan kolektif

## OUTPUT FORMAT
WAJIB dalam format JSON valid sesuai schema.""",

        "developer": """Analisis MULTIPLE profil (3-6 orang) dalam konteks keluarga.
Setiap member diberi label: Member 1, Member 2, dst.

Identifikasi:
- Distribusi warna dalam keluarga (apakah seimbang atau dominan satu warna?)
- Potensi aliansi natural (warna yang mirip)
- Potensi gesekan (warna yang berlawanan)
- Peran natural berdasarkan kombinasi warna dan conflict style

Family roles:
- Leader: High red/control
- Mediator: High green/harmony  
- Catalyst: High yellow/validation
- Analyst: High blue/autonomy
- Peacekeeper: High appease/avoid

Output JSON HARUS mengikuti schema persis.""",

        "output_schema": {
            "type": "object",
            "required": ["report_id", "report_type", "family_summary", "member_profiles", 
                        "family_roles", "communication_patterns", "conflict_alliances", 
                        "collective_needs", "family_tips"],
            "properties": {
                "report_id": {"type": "string"},
                "report_type": {"type": "string", "enum": ["FAMILY"]},
                "family_summary": {
                    "type": "object",
                    "properties": {
                        "dominant_colors": {"type": "array", "items": {"type": "string"}},
                        "energy_balance": {"type": "string"},
                        "overview": {"type": "string"}
                    }
                },
                "member_profiles": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "member_id": {"type": "string"},
                            "label": {"type": "string"},
                            "primary_color": {"type": "string"},
                            "archetype": {"type": "string"},
                            "role_in_family": {"type": "string"},
                            "brief_summary": {"type": "string"}
                        }
                    }
                },
                "family_roles": {
                    "type": "object",
                    "properties": {
                        "leader": {"type": "string"},
                        "mediator": {"type": "string"},
                        "catalyst": {"type": "string"},
                        "stabilizer": {"type": "string"},
                        "role_dynamics": {"type": "string"}
                    }
                },
                "communication_patterns": {
                    "type": "object",
                    "properties": {
                        "initiators": {"type": "array", "items": {"type": "string"}},
                        "listeners": {"type": "array", "items": {"type": "string"}},
                        "flow_description": {"type": "string"}
                    }
                },
                "conflict_alliances": {
                    "type": "object",
                    "properties": {
                        "natural_alliances": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "members": {"type": "array", "items": {"type": "string"}},
                                    "why": {"type": "string"}
                                }
                            }
                        },
                        "potential_conflicts": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "members": {"type": "array", "items": {"type": "string"}},
                                    "trigger": {"type": "string"},
                                    "resolution": {"type": "string"}
                                }
                            }
                        }
                    }
                },
                "collective_needs": {
                    "type": "object",
                    "properties": {
                        "primary_need": {"type": "string"},
                        "how_to_fulfill": {"type": "string"}
                    }
                },
                "family_tips": {
                    "type": "array",
                    "items": {"type": "string"},
                    "minItems": 5,
                    "maxItems": 5
                },
                "generated_at": {"type": "string"}
            }
        }
    }
}

# Color mappings
COLOR_MAP = {
    "color_red": {"name": "Merah", "archetype": "Driver", "hex": "#C05640"},
    "color_yellow": {"name": "Kuning", "archetype": "Spark", "hex": "#D99E30"},
    "color_green": {"name": "Hijau", "archetype": "Anchor", "hex": "#5D8A66"},
    "color_blue": {"name": "Biru", "archetype": "Analyst", "hex": "#5B8FA8"}
}

CONFLICT_MAP = {
    "conflict_attack": {"name": "Menyerang", "en": "Attack"},
    "conflict_avoid": {"name": "Menghindar", "en": "Avoid"},
    "conflict_freeze": {"name": "Membeku", "en": "Freeze"},
    "conflict_appease": {"name": "Menenangkan", "en": "Appease"}
}

NEED_MAP = {
    "need_control": {"name": "Kontrol", "en": "Control"},
    "need_validation": {"name": "Validasi", "en": "Validation"},
    "need_harmony": {"name": "Harmoni", "en": "Harmony"},
    "need_autonomy": {"name": "Otonomi", "en": "Autonomy"}
}


@dataclass
class ReportRequest:
    """Request to generate a RELASI4™ report."""
    user_id: str
    assessment_id: str
    report_type: str  # SINGLE, COUPLE, FAMILY
    scores: Dict[str, Any]
    language: str = "id"
    tier: str = "premium"
    
    # For COUPLE/FAMILY reports
    partner_scores: Optional[Dict[str, Any]] = None
    family_scores: Optional[List[Dict[str, Any]]] = None


class RELASI4ReportService:
    """AI-powered report generation service."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    def _format_scores_for_prompt(self, scores: Dict[str, Any]) -> str:
        """Format scores into a readable string for the LLM."""
        lines = ["## SKOR KLIEN"]
        
        # Color scores
        lines.append("\n### Warna Kepribadian:")
        for color_key in ["color_red", "color_yellow", "color_green", "color_blue"]:
            color_info = COLOR_MAP.get(color_key, {})
            score = scores.get("dimension_scores", {}).get(color_key, 0)
            lines.append(f"- {color_info.get('name', color_key)} ({color_info.get('archetype', '')}): {score}")
        
        # Conflict scores
        lines.append("\n### Gaya Konflik:")
        for conflict_key in ["conflict_attack", "conflict_avoid", "conflict_freeze", "conflict_appease"]:
            conflict_info = CONFLICT_MAP.get(conflict_key, {})
            score = scores.get("dimension_scores", {}).get(conflict_key, 0)
            lines.append(f"- {conflict_info.get('name', conflict_key)}: {score}")
        
        # Need scores
        lines.append("\n### Kebutuhan Inti:")
        for need_key in ["need_control", "need_validation", "need_harmony", "need_autonomy"]:
            need_info = NEED_MAP.get(need_key, {})
            score = scores.get("dimension_scores", {}).get(need_key, 0)
            lines.append(f"- {need_info.get('name', need_key)}: {score}")
        
        # Additional dimensions
        lines.append("\n### Dimensi Tambahan:")
        for dim in ["emotion_expression", "emotion_sensitivity", "decision_speed", "structure_need"]:
            score = scores.get("dimension_scores", {}).get(dim, 0)
            lines.append(f"- {dim.replace('_', ' ').title()}: {score}")
        
        # Summary
        lines.append(f"\n### Ringkasan:")
        lines.append(f"- Warna Primer: {scores.get('primary_color', 'unknown')}")
        lines.append(f"- Warna Sekunder: {scores.get('secondary_color', 'unknown')}")
        lines.append(f"- Gaya Konflik Utama: {scores.get('primary_conflict_style', 'unknown')}")
        lines.append(f"- Kebutuhan Utama: {scores.get('primary_need', 'unknown')}")
        
        return "\n".join(lines)
    
    async def generate_single_report(self, request: ReportRequest) -> Dict[str, Any]:
        """Generate a premium single-user report."""
        
        prompt_config = RELASI4_PROMPTS["SINGLE_REPORT_V1"]
        
        # Build user prompt with scores
        user_prompt = f"""Buat laporan RELASI4™ Premium untuk klien berikut:

{self._format_scores_for_prompt(request.scores)}

## INSTRUKSI
1. Analisis skor di atas secara mendalam
2. Tulis laporan premium (1500-2000 kata)
3. Output HARUS dalam format JSON valid

## OUTPUT SCHEMA
{json.dumps(prompt_config['output_schema'], indent=2)}

Berikan output JSON saja, tanpa markdown code block."""

        # Build system prompt
        system_prompt = f"{prompt_config['system']}\n\n{prompt_config['developer']}"
        
        # Create LLM context
        context = GuardedLLMContext(
            user_id=request.user_id,
            tier=request.tier,
            endpoint_name="relasi4/generate-single-report",
            mode="final",
            hitl_level=1,
            prompt=user_prompt,
            system_instructions=system_prompt,
            language=request.language,
            input_payload_metadata={
                "assessment_id": request.assessment_id,
                "report_type": "SINGLE"
            },
            desired_output_schema=prompt_config["output_schema"]
        )
        
        # Call LLM Gateway
        result = await call_llm_guarded(context)
        
        if result.status == LLMStatus.OK or result.status == LLMStatus.DEGRADED:
            try:
                # Parse JSON output
                report_data = self._parse_json_output(result.output_text)
                
                # Add metadata
                report_data["report_id"] = f"r4r_{uuid.uuid4().hex[:12]}"
                report_data["assessment_id"] = request.assessment_id
                report_data["user_id"] = request.user_id
                report_data["generated_at"] = datetime.now(timezone.utc).isoformat()
                report_data["llm_metadata"] = {
                    "model_used": result.model_used,
                    "tokens_in": result.tokens_in,
                    "tokens_out": result.tokens_out,
                    "cost_usd": result.cost_estimate_usd,
                    "status": result.status.value
                }
                
                # Save to database
                await self._save_report(report_data)
                
                return {
                    "success": True,
                    "report": report_data
                }
                
            except Exception as e:
                return {
                    "success": False,
                    "error": f"Failed to parse report: {str(e)}",
                    "raw_output": result.output_text[:500]
                }
        else:
            return {
                "success": False,
                "error": result.blocked_reason or "LLM call failed",
                "message": result.output_text
            }
    
    def _parse_json_output(self, text: str) -> Dict[str, Any]:
        """Parse JSON from LLM output, handling various formats."""
        # Clean up the text
        text = text.strip()
        
        # Remove markdown code blocks if present
        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]
        
        if text.endswith("```"):
            text = text[:-3]
        
        text = text.strip()
        
        # Try to find JSON object
        start_idx = text.find("{")
        end_idx = text.rfind("}") + 1
        
        if start_idx != -1 and end_idx > start_idx:
            json_str = text[start_idx:end_idx]
            return json.loads(json_str)
        
        raise ValueError("No valid JSON found in output")
    
    async def _save_report(self, report_data: Dict[str, Any]):
        """Save report to r4_reports collection."""
        report_data["created_at"] = datetime.now(timezone.utc)
        await self.db.r4_reports.update_one(
            {"report_id": report_data["report_id"]},
            {"$set": report_data},
            upsert=True
        )
    
    async def get_report(self, report_id: str) -> Optional[Dict[str, Any]]:
        """Get a saved report by ID."""
        report = await self.db.r4_reports.find_one(
            {"report_id": report_id},
            {"_id": 0}
        )
        return report
    
    async def get_user_reports(self, user_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Get all reports for a user."""
        cursor = self.db.r4_reports.find(
            {"user_id": user_id},
            {"_id": 0}
        ).sort("created_at", -1).limit(limit)
        
        return await cursor.to_list(length=limit)
    
    def _format_couple_scores_for_prompt(
        self, 
        person_a: Dict[str, Any], 
        person_b: Dict[str, Any],
        name_a: str = "Person A",
        name_b: str = "Person B"
    ) -> str:
        """Format two profiles for couple report."""
        lines = [f"## PROFIL {name_a.upper()}"]
        lines.append(self._format_scores_for_prompt(person_a))
        
        lines.append(f"\n\n## PROFIL {name_b.upper()}")
        lines.append(self._format_scores_for_prompt(person_b))
        
        return "\n".join(lines)
    
    async def generate_couple_report(self, request: ReportRequest) -> Dict[str, Any]:
        """Generate a couple compatibility report."""
        
        if not request.partner_scores:
            return {
                "success": False,
                "error": "Partner scores required for couple report"
            }
        
        prompt_config = RELASI4_PROMPTS["COUPLE_REPORT_V1"]
        
        # Build user prompt with both profiles
        user_prompt = f"""Buat laporan kompatibilitas RELASI4™ untuk pasangan berikut:

{self._format_couple_scores_for_prompt(request.scores, request.partner_scores, "Person A", "Person B")}

## INSTRUKSI
1. Analisis kedua profil secara bersamaan
2. Bandingkan skor dan identifikasi pola interaksi
3. Tulis laporan kompatibilitas (1500-2000 kata)
4. Output HARUS dalam format JSON valid

## OUTPUT SCHEMA
{json.dumps(prompt_config['output_schema'], indent=2)}

Berikan output JSON saja, tanpa markdown code block."""

        # Build system prompt
        system_prompt = f"{prompt_config['system']}\n\n{prompt_config['developer']}"
        
        # Create LLM context
        context = GuardedLLMContext(
            user_id=request.user_id,
            tier=request.tier,
            endpoint_name="relasi4/generate-couple-report",
            mode="final",
            hitl_level=1,
            prompt=user_prompt,
            system_instructions=system_prompt,
            language=request.language,
            input_payload_metadata={
                "assessment_id": request.assessment_id,
                "report_type": "COUPLE"
            },
            desired_output_schema=prompt_config["output_schema"]
        )
        
        # Call LLM Gateway
        result = await call_llm_guarded(context)
        
        if result.status == LLMStatus.OK or result.status == LLMStatus.DEGRADED:
            try:
                # Parse JSON output
                report_data = self._parse_json_output(result.output_text)
                
                # Add metadata
                report_data["report_id"] = f"r4c_{uuid.uuid4().hex[:12]}"
                report_data["report_type"] = "COUPLE"
                report_data["assessment_id"] = request.assessment_id
                report_data["partner_assessment_id"] = getattr(request, 'partner_assessment_id', None)
                report_data["user_id"] = request.user_id
                report_data["generated_at"] = datetime.now(timezone.utc).isoformat()
                report_data["llm_metadata"] = {
                    "model_used": result.model_used,
                    "tokens_in": result.tokens_in,
                    "tokens_out": result.tokens_out,
                    "cost_usd": result.cost_estimate_usd,
                    "status": result.status.value
                }
                
                # Save to database
                await self._save_report(report_data)
                
                return {
                    "success": True,
                    "report": report_data
                }
                
            except Exception as e:
                return {
                    "success": False,
                    "error": f"Failed to parse report: {str(e)}",
                    "raw_output": result.output_text[:500] if result.output_text else ""
                }
        else:
            return {
                "success": False,
                "error": result.blocked_reason or "LLM call failed",
                "message": result.output_text
            }
    
    def _format_family_scores_for_prompt(self, members: List[Dict[str, Any]]) -> str:
        """Format multiple family member profiles for prompt."""
        lines = []
        for i, member in enumerate(members, 1):
            lines.append(f"## MEMBER {i}")
            lines.append(self._format_scores_for_prompt(member))
            lines.append("")
        return "\n".join(lines)
    
    async def generate_family_report(self, request: ReportRequest) -> Dict[str, Any]:
        """Generate a family dynamics report for 3-6 members."""
        
        # family_scores doesn't include primary user, so total = 1 (primary) + len(family_scores)
        family_scores = request.family_scores or []
        total_members = 1 + len(family_scores)
        
        if total_members < 3:
            return {
                "success": False,
                "error": f"At least 3 family members required (currently {total_members})"
            }
        
        if total_members > 6:
            return {
                "success": False,
                "error": "Maximum 6 family members allowed"
            }
        
        prompt_config = RELASI4_PROMPTS["FAMILY_REPORT_V1"]
        
        # Include primary user's scores as Member 1
        all_members = [request.scores] + family_scores
        
        # Build user prompt
        user_prompt = f"""Buat laporan dinamika keluarga RELASI4™ untuk {len(all_members)} anggota keluarga berikut:

{self._format_family_scores_for_prompt(all_members)}

## INSTRUKSI
1. Analisis semua profil dalam konteks keluarga
2. Identifikasi peran natural setiap anggota
3. Analisis pola komunikasi dan potensi konflik/aliansi
4. Tulis laporan (1500-2500 kata)
5. Output HARUS dalam format JSON valid

## OUTPUT SCHEMA
{json.dumps(prompt_config['output_schema'], indent=2)}

Berikan output JSON saja, tanpa markdown code block."""

        # Build system prompt
        system_prompt = f"{prompt_config['system']}\n\n{prompt_config['developer']}"
        
        # Create LLM context
        context = GuardedLLMContext(
            user_id=request.user_id,
            tier=request.tier,
            endpoint_name="relasi4/generate-family-report",
            mode="final",
            hitl_level=1,
            prompt=user_prompt,
            system_instructions=system_prompt,
            language=request.language,
            input_payload_metadata={
                "assessment_id": request.assessment_id,
                "report_type": "FAMILY",
                "member_count": len(all_members)
            },
            desired_output_schema=prompt_config["output_schema"]
        )
        
        # Call LLM Gateway
        result = await call_llm_guarded(context)
        
        if result.status == LLMStatus.OK or result.status == LLMStatus.DEGRADED:
            try:
                # Parse JSON output
                report_data = self._parse_json_output(result.output_text)
                
                # Add metadata
                report_data["report_id"] = f"r4f_{uuid.uuid4().hex[:12]}"
                report_data["report_type"] = "FAMILY"
                report_data["assessment_id"] = request.assessment_id
                report_data["family_assessment_ids"] = getattr(request, 'family_assessment_ids', [])
                report_data["user_id"] = request.user_id
                report_data["member_count"] = len(all_members)
                report_data["generated_at"] = datetime.now(timezone.utc).isoformat()
                report_data["llm_metadata"] = {
                    "model_used": result.model_used,
                    "tokens_in": result.tokens_in,
                    "tokens_out": result.tokens_out,
                    "cost_usd": result.cost_estimate_usd,
                    "status": result.status.value
                }
                
                # Save to database
                await self._save_report(report_data)
                
                return {
                    "success": True,
                    "report": report_data
                }
                
            except Exception as e:
                return {
                    "success": False,
                    "error": f"Failed to parse report: {str(e)}",
                    "raw_output": result.output_text[:500] if result.output_text else ""
                }
        else:
            return {
                "success": False,
                "error": result.blocked_reason or "LLM call failed",
                "message": result.output_text
            }


# Factory function
_report_service: Optional[RELASI4ReportService] = None


def get_report_service(db: AsyncIOMotorDatabase) -> RELASI4ReportService:
    """Get or create report service singleton."""
    global _report_service
    if _report_service is None:
        _report_service = RELASI4ReportService(db)
    return _report_service
