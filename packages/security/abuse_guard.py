"""
Prompt Abuse Guard
==================
Detect and block prompt injection, manipulation, and diagnostic labeling attempts.
"""

import re
import logging
from dataclasses import dataclass
from typing import List, Optional, Tuple
from enum import Enum

logger = logging.getLogger(__name__)


class AbuseType(str, Enum):
    PROMPT_INJECTION = "prompt_injection"
    MANIPULATION = "manipulation"
    DIAGNOSTIC_LABELING = "diagnostic_labeling"
    JAILBREAK = "jailbreak"
    PII_EXTRACTION = "pii_extraction"


@dataclass
class AbuseDetection:
    detected: bool
    abuse_type: Optional[AbuseType]
    severity: int  # 1-10
    matched_patterns: List[str]
    should_block: bool
    risk_score_modifier: int  # Added to HITL risk score


class PromptAbuseGuard:
    """
    Detects and scores prompt abuse attempts.
    Integrates with HITL risk assessment.
    """
    
    # Prompt injection patterns (severity 8-10)
    INJECTION_PATTERNS = [
        (r"ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|rules?)", 10),
        (r"disregard\s+(all\s+)?(previous|prior|above)", 10),
        (r"forget\s+(everything|all)\s+(you\s+)?know", 10),
        (r"you\s+are\s+now\s+(a|an)\s+", 9),
        (r"act\s+as\s+(if\s+you\s+are|a|an)", 9),
        (r"pretend\s+(to\s+be|you\s+are)", 9),
        (r"from\s+now\s+on,?\s+(you|i\s+want)", 9),
        (r"new\s+instruction[s]?:", 10),
        (r"override\s+(your|the)\s+(instructions?|rules?|guidelines?)", 10),
        (r"system\s*:\s*", 10),
        (r"\[system\]", 10),
        (r"<\|?system\|?>", 10),
        (r"jailbreak", 10),
        (r"dan\s+mode", 10),
        (r"developer\s+mode", 9),
    ]
    
    # Manipulation patterns (severity 6-9)
    MANIPULATION_PATTERNS = [
        (r"(how\s+to\s+)?(control|manipulate|dominate)\s+(my|your|the|a)\s+(partner|spouse|wife|husband|girlfriend|boyfriend)", 9),
        (r"(make|force|coerce)\s+(him|her|them|someone)\s+to", 8),
        (r"(gaslight|gaslighting)", 9),
        (r"(emotional\s+)?blackmail", 8),
        (r"(how\s+to\s+)?weaponize", 9),
        (r"use\s+(this|their|his|her)\s+(weakness|vulnerability|insecurity)", 8),
        (r"exploit\s+(their|his|her)", 8),
        (r"break\s+(them|him|her)\s+down", 8),
        (r"(silent\s+treatment|stonewalling)\s+as\s+(a\s+)?(weapon|tool|strategy)", 7),
        (r"(punish|punishment)\s+(them|him|her|my)", 7),
        (r"make\s+(them|him|her)\s+(feel\s+)?(guilty|ashamed|worthless)", 8),
    ]
    
    # Diagnostic labeling patterns (severity 7-9)
    DIAGNOSTIC_PATTERNS = [
        (r"(is|am|are)\s+(he|she|they|i|my\s+\w+)\s+(a\s+)?(narcissist|sociopath|psychopath)", 9),
        (r"diagnose\s+(me|him|her|them|my)", 9),
        (r"(bipolar|borderline|bpd|npd|aspd)\s+(disorder|personality)", 8),
        (r"(clinical|psychiatric)\s+(diagnosis|assessment)", 8),
        (r"(mental\s+illness|mentally\s+ill)", 7),
        (r"(he|she|they)\s+(is|are)\s+(toxic|abusive|crazy|insane)", 7),
        (r"(certified|confirmed)\s+(narcissist|abuser)", 8),
        (r"what\s+(disorder|mental\s+illness)\s+do\s+(i|they)", 8),
    ]
    
    # Jailbreak patterns (severity 9-10)
    JAILBREAK_PATTERNS = [
        (r"bypass\s+(your|the)\s+(safety|content|ethical)", 10),
        (r"disable\s+(your|the)\s+(filters?|restrictions?|limitations?)", 10),
        (r"without\s+(any\s+)?(restrictions?|limitations?|filters?)", 9),
        (r"(remove|ignore)\s+(all\s+)?(safety|ethical)\s+(guidelines?|restrictions?)", 10),
        (r"hypothetically,?\s+if\s+you\s+(could|were|had)", 7),
        (r"for\s+(educational|research|academic)\s+purposes?\s+only", 6),
        (r"this\s+is\s+(just\s+)?(fiction|a\s+story|roleplay)", 6),
    ]
    
    # PII extraction patterns (severity 8-10)
    PII_PATTERNS = [
        (r"(tell|give|show)\s+me\s+(the|your|their)\s+(email|phone|address|ssn|credit\s+card)", 9),
        (r"(extract|retrieve|access)\s+(user|customer|client)\s+(data|information)", 10),
        (r"(database|db)\s+(dump|export|extract)", 10),
        (r"list\s+(all\s+)?(users?|customers?|emails?)", 9),
    ]
    
    def __init__(self):
        self._compile_patterns()
    
    def _compile_patterns(self):
        """Pre-compile regex patterns for performance."""
        self.compiled_injection = [(re.compile(p, re.IGNORECASE), s) for p, s in self.INJECTION_PATTERNS]
        self.compiled_manipulation = [(re.compile(p, re.IGNORECASE), s) for p, s in self.MANIPULATION_PATTERNS]
        self.compiled_diagnostic = [(re.compile(p, re.IGNORECASE), s) for p, s in self.DIAGNOSTIC_PATTERNS]
        self.compiled_jailbreak = [(re.compile(p, re.IGNORECASE), s) for p, s in self.JAILBREAK_PATTERNS]
        self.compiled_pii = [(re.compile(p, re.IGNORECASE), s) for p, s in self.PII_PATTERNS]
    
    def analyze(self, text: str) -> AbuseDetection:
        """
        Analyze text for abuse patterns.
        Returns detection result with severity and blocking recommendation.
        """
        if not text:
            return AbuseDetection(
                detected=False,
                abuse_type=None,
                severity=0,
                matched_patterns=[],
                should_block=False,
                risk_score_modifier=0
            )
        
        text_lower = text.lower()
        max_severity = 0
        detected_type = None
        matched = []
        
        # Check each category
        checks = [
            (self.compiled_injection, AbuseType.PROMPT_INJECTION),
            (self.compiled_manipulation, AbuseType.MANIPULATION),
            (self.compiled_diagnostic, AbuseType.DIAGNOSTIC_LABELING),
            (self.compiled_jailbreak, AbuseType.JAILBREAK),
            (self.compiled_pii, AbuseType.PII_EXTRACTION),
        ]
        
        for patterns, abuse_type in checks:
            for pattern, severity in patterns:
                if pattern.search(text):
                    matched.append(pattern.pattern)
                    if severity > max_severity:
                        max_severity = severity
                        detected_type = abuse_type
        
        if not matched:
            return AbuseDetection(
                detected=False,
                abuse_type=None,
                severity=0,
                matched_patterns=[],
                should_block=False,
                risk_score_modifier=0
            )
        
        # Determine blocking and risk modifier
        should_block = max_severity >= 9
        risk_modifier = max_severity * 5  # 0-50 points
        
        logger.warning(
            f"Abuse detected: type={detected_type}, severity={max_severity}, "
            f"patterns={len(matched)}, block={should_block}"
        )
        
        return AbuseDetection(
            detected=True,
            abuse_type=detected_type,
            severity=max_severity,
            matched_patterns=matched[:5],  # Limit for logging
            should_block=should_block,
            risk_score_modifier=risk_modifier
        )
    
    def get_safe_response(self, abuse_type: AbuseType, language: str = "id") -> str:
        """Get safe response for blocked requests."""
        responses = {
            AbuseType.PROMPT_INJECTION: {
                "id": "Maaf, permintaan Anda tidak dapat diproses. Silakan ajukan pertanyaan yang berkaitan dengan pemahaman diri dan hubungan interpersonal.",
                "en": "Sorry, your request cannot be processed. Please ask questions related to self-understanding and interpersonal relationships."
            },
            AbuseType.MANIPULATION: {
                "id": "Relasi4Warna berkomitmen untuk membangun hubungan yang sehat dan saling menghormati. Kami tidak dapat memberikan panduan untuk mengontrol atau memanipulasi orang lain. Jika Anda mengalami kesulitan dalam hubungan, pertimbangkan untuk berbicara dengan konselor profesional.",
                "en": "Relasi4Warna is committed to building healthy and mutually respectful relationships. We cannot provide guidance for controlling or manipulating others. If you're experiencing relationship difficulties, consider speaking with a professional counselor."
            },
            AbuseType.DIAGNOSTIC_LABELING: {
                "id": "Relasi4Warna adalah alat edukatif untuk memahami gaya komunikasi, bukan alat diagnosis klinis. Kami tidak dapat memberikan diagnosis psikologis. Jika Anda memiliki kekhawatiran tentang kesehatan mental, silakan konsultasikan dengan profesional berlisensi.",
                "en": "Relasi4Warna is an educational tool for understanding communication styles, not a clinical diagnostic tool. We cannot provide psychological diagnoses. If you have concerns about mental health, please consult a licensed professional."
            },
            AbuseType.JAILBREAK: {
                "id": "Permintaan ini tidak dapat diproses karena melanggar pedoman keamanan kami.",
                "en": "This request cannot be processed as it violates our safety guidelines."
            },
            AbuseType.PII_EXTRACTION: {
                "id": "Permintaan untuk mengakses data pribadi tidak dapat diproses.",
                "en": "Requests to access personal data cannot be processed."
            }
        }
        
        return responses.get(abuse_type, responses[AbuseType.PROMPT_INJECTION]).get(language, "en")


# Singleton instance
_abuse_guard: Optional[PromptAbuseGuard] = None


def get_abuse_guard() -> PromptAbuseGuard:
    """Get singleton abuse guard instance."""
    global _abuse_guard
    if _abuse_guard is None:
        _abuse_guard = PromptAbuseGuard()
    return _abuse_guard
