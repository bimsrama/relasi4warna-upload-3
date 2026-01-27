"""AI Service for report generation using AI Gateway."""

import os
import sys
import logging
from pathlib import Path

# Add packages to path for ai_gateway import
packages_path = str(Path(__file__).parent.parent.parent / "packages")
if packages_path not in sys.path:
    sys.path.insert(0, packages_path)

logger = logging.getLogger(__name__)

# Global adapter instance
_adapter = None

def get_adapter():
    """Get or create the LLM adapter instance."""
    global _adapter
    if _adapter is None:
        from ai_gateway import get_llm_adapter
        _adapter = get_llm_adapter()
    return _adapter


async def generate_ai_content(system_prompt: str, user_prompt: str, model: str | None = None) -> str:
    """Generate AI content using AI Gateway with fallback.

    NOTE: All LLM calls must go through the AI Gateway.
    """
    adapter = get_adapter()

    primary_model = model or os.environ.get("OPENAI_MODEL_PREMIUM", "gpt-4o")
    fallback_model = os.environ.get("OPENAI_MODEL_FALLBACK", "gpt-4o-mini")

    try:
        return await adapter.generate(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            model=primary_model
        )
    except Exception as e:
        logger.warning("Primary model failed (%s). Falling back to %s", e, fallback_model)
        try:
            return await adapter.generate(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                model=fallback_model
            )
        except Exception as e2:
            logger.error("All models failed: %s", e2)
            raise Exception(f"Failed to generate AI content: {e2}") from e2


def get_report_system_prompt(language: str = "id") -> str:
    """Get the ISO-STYLE system prompt for report generation."""
    if language == "id":
        return """Anda adalah MESIN KECERDASAN KEPRIBADIAN PREMIUM yang beroperasi dengan KEPATUHAN KETAT pada standar analisis hubungan.

Tugas Anda:
1. Menganalisis profil arketipe komunikasi pengguna
2. Memberikan insight mendalam tentang pola komunikasi
3. Menyediakan panduan praktis untuk pengembangan
4. Menggunakan bahasa yang hangat, profesional, dan actionable

Format output dalam Markdown dengan struktur yang jelas."""
    else:
        return """You are a PREMIUM PERSONALITY INTELLIGENCE ENGINE operating under STRICT compliance with relationship analysis standards.

Your tasks:
1. Analyze user's communication archetype profile
2. Provide deep insights on communication patterns
3. Deliver practical guidance for development
4. Use warm, professional, and actionable language

Output in Markdown with clear structure."""


async def generate_report(
    archetype: str,
    series: str,
    scores: dict,
    language: str = "id"
) -> str:
    """Generate AI-powered premium report content.
    
    Args:
        archetype: Primary archetype (driver, spark, anchor, analyst)
        series: Quiz series (family, business, couples, friendship)
        scores: Archetype scores dict
        language: Output language (id/en)
        
    Returns:
        Generated report markdown text
    """
    system_prompt = get_report_system_prompt(language)
    
    if language == "id":
        user_prompt = f"""Buat laporan analisis komunikasi komprehensif untuk:
- Arketipe Utama: {archetype}
- Seri Tes: {series}
- Distribusi Skor: {scores}

Sertakan:
1. Ringkasan profil arketipe
2. Kekuatan komunikasi
3. Area pengembangan
4. Tips praktis untuk interaksi dengan setiap arketipe
5. Rencana aksi mingguan

Output dalam format markdown."""
    else:
        user_prompt = f"""Generate a comprehensive communication analysis report for:
- Primary Archetype: {archetype}
- Quiz Series: {series}
- Score Distribution: {scores}

Include:
1. Archetype profile summary
2. Communication strengths
3. Growth areas
4. Practical tips for each archetype interaction
5. Weekly action plan

Output in markdown format."""

    return await generate_ai_content(system_prompt, user_prompt)


async def generate_elite_content(
    archetype: str,
    module: str,
    context: dict,
    language: str = "id"
) -> str:
    """Generate elite-tier specialized content."""
    if language == "id":
        system_prompt = f"Anda adalah coach komunikasi bersertifikat. Buat konten {module} yang spesialis dalam Bahasa Indonesia. Jadilah praktis, empatik, dan actionable."
        user_prompt = f"Buat konten {module} untuk arketipe {archetype}.\nKonteks: {context}\nOutput konten markdown komprehensif."
    else:
        system_prompt = f"You are a certified communication coach. Generate specialized {module} content in English. Be practical, empathetic, and actionable."
        user_prompt = f"Generate {module} content for {archetype} archetype.\nContext: {context}\nOutput comprehensive markdown content."

    return await generate_ai_content(system_prompt, user_prompt)


async def generate_tip(
    archetype: str,
    topic: str,
    language: str = "id"
) -> str:
    """Generate daily communication tip."""
    if language == "id":
        system_prompt = "Anda adalah relationship coach yang hangat dan suportif."
        user_prompt = f"Buat tips komunikasi singkat dan actionable untuk arketipe {archetype}.\nTopik: {topic}\nBatasi 100 kata, hangat dan mendorong."
    else:
        system_prompt = "You are a warm, supportive relationship coach."
        user_prompt = f"Generate a short, actionable communication tip for {archetype} archetype.\nTopic: {topic}\nKeep it under 100 words, warm and encouraging."

    return await generate_ai_content(system_prompt, user_prompt, temperature=0.7)
