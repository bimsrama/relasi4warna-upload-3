"""
RELASI4™ Question Bank Seed Script (Python)
==========================================
- Creates collections + indexes for question_sets, questions, answers
- Inserts 2 question_set + 40 questions + 160 answers (idempotent via upsert)
- Locks v1 with locked:true + lock_hash (tamper-evident)

Usage:
    python seed_relasi4_v1.py

Note: This script is safe to rerun. If an existing locked doc has a different
lock_hash, script will STOP (prevents accidental changes).
"""

import os
import sys
import json
import hashlib
from datetime import datetime, timezone
from typing import Dict, List, Any

# Add packages path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from motor.motor_asyncio import AsyncIOMotorClient
import asyncio

# ---------- Configuration ----------
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'relasi4warna')

# ---------- Canonical Dimension Keys (LOCKED - DO NOT CHANGE) ----------
DIMENSIONS_CANONICAL = [
    'color_red', 'color_yellow', 'color_green', 'color_blue',
    'conflict_attack', 'conflict_avoid', 'conflict_freeze', 'conflict_appease',
    'need_control', 'need_validation', 'need_harmony', 'need_autonomy',
    'emotion_expression', 'emotion_sensitivity',
    'decision_speed', 'structure_need'
]

# ---------- Helpers ----------
def stable_stringify(obj: Any) -> str:
    """Stable JSON stringify with sorted keys for consistent hashing."""
    if obj is None:
        return 'null'
    if isinstance(obj, bool):
        return 'true' if obj else 'false'
    if isinstance(obj, (int, float)):
        return json.dumps(obj)
    if isinstance(obj, str):
        return json.dumps(obj)
    if isinstance(obj, list):
        return '[' + ','.join(stable_stringify(item) for item in obj) + ']'
    if isinstance(obj, dict):
        keys = sorted(obj.keys())
        items = [json.dumps(k) + ':' + stable_stringify(obj[k]) for k in keys]
        return '{' + ','.join(items) + '}'
    return json.dumps(obj)

def sha256_hex(input_str: str) -> str:
    """Generate SHA256 hash of input string."""
    return hashlib.sha256(input_str.encode('utf-8')).hexdigest()

def q(set_code: str, order_no: int, prompt: str, answers: List[Dict]) -> Dict:
    """Helper to build question object."""
    return {
        'set_code': set_code,
        'order_no': order_no,
        'type': 'single_choice',
        'prompt': prompt,
        'answers': answers
    }

# ---------- Question Sets ----------
QUESTION_SETS = [
    {'code': 'R4W_CORE_V1', 'title': 'Relasi4Warna Core v1', 'version': 1, 'is_active': True, 'locked': True},
    {'code': 'R4T_DEEP_V1', 'title': 'RELASI4™ Deep v1', 'version': 1, 'is_active': True, 'locked': True}
]

# ---------- Core Questions (20) ----------
CORE_QUESTIONS = [
    q('R4W_CORE_V1', 1, 'Saat ada masalah, reaksi pertamamu biasanya…', [
        {'label': 'A', 'text': 'Langsung ambil alih dan cari solusi cepat.', 'weight_map': {'color_red': 3, 'decision_speed': 2, 'need_control': 2, 'conflict_attack': 1}},
        {'label': 'B', 'text': 'Bikin suasana tetap ringan dulu, nanti baru dibahas.', 'weight_map': {'color_yellow': 3, 'emotion_expression': 2, 'need_validation': 1, 'conflict_appease': 1}},
        {'label': 'C', 'text': 'Menjaga damai, cari titik tengah supaya semua nyaman.', 'weight_map': {'color_green': 3, 'need_harmony': 2, 'conflict_appease': 2}},
        {'label': 'D', 'text': 'Analisa dulu: data, sebab-akibat, baru ambil keputusan.', 'weight_map': {'color_blue': 3, 'structure_need': 2, 'decision_speed': 0, 'conflict_freeze': 1}}
    ]),
    q('R4W_CORE_V1', 2, 'Orang paling sering melihatmu sebagai…', [
        {'label': 'A', 'text': 'Tegas, to the point.', 'weight_map': {'color_red': 3, 'need_control': 2, 'conflict_attack': 1}},
        {'label': 'B', 'text': 'Seru, mudah akrab.', 'weight_map': {'color_yellow': 3, 'emotion_expression': 2, 'need_validation': 1}},
        {'label': 'C', 'text': 'Kalem, penenang.', 'weight_map': {'color_green': 3, 'need_harmony': 2, 'conflict_appease': 1}},
        {'label': 'D', 'text': 'Rapi, teliti.', 'weight_map': {'color_blue': 3, 'structure_need': 2, 'emotion_expression': 0}}
    ]),
    q('R4W_CORE_V1', 3, 'Kalau rencana berubah mendadak, kamu…', [
        {'label': 'A', 'text': 'Langsung putuskan alternatif.', 'weight_map': {'color_red': 2, 'decision_speed': 2, 'need_control': 2}},
        {'label': 'B', 'text': 'Santai, yang penting tetap enjoy.', 'weight_map': {'color_yellow': 2, 'need_autonomy': 1, 'emotion_expression': 1}},
        {'label': 'C', 'text': 'Agak tidak enak, tapi ikut saja demi damai.', 'weight_map': {'color_green': 2, 'need_harmony': 2, 'conflict_appease': 1}},
        {'label': 'D', 'text': 'Terganggu, perlu susun ulang dengan jelas.', 'weight_map': {'color_blue': 2, 'structure_need': 3, 'emotion_sensitivity': 1}}
    ]),
    q('R4W_CORE_V1', 4, 'Dalam tim, kamu biasanya berperan sebagai…', [
        {'label': 'A', 'text': 'Pengambil keputusan/leader.', 'weight_map': {'color_red': 3, 'need_control': 3}},
        {'label': 'B', 'text': 'Penggerak semangat/connector.', 'weight_map': {'color_yellow': 3, 'need_validation': 2, 'emotion_expression': 2}},
        {'label': 'C', 'text': 'Penjaga harmoni/mediator.', 'weight_map': {'color_green': 3, 'need_harmony': 3, 'conflict_appease': 2}},
        {'label': 'D', 'text': 'Quality control/analyst.', 'weight_map': {'color_blue': 3, 'structure_need': 3}}
    ]),
    q('R4W_CORE_V1', 5, 'Kalau ada orang lambat, kamu cenderung…', [
        {'label': 'A', 'text': 'Dorong lebih cepat, kadang jadi tegas.', 'weight_map': {'color_red': 2, 'conflict_attack': 2, 'need_control': 2}},
        {'label': 'B', 'text': 'Bercanda dulu supaya tidak tegang.', 'weight_map': {'color_yellow': 2, 'conflict_appease': 1, 'emotion_expression': 2}},
        {'label': 'C', 'text': 'Sabar, bantu pelan-pelan.', 'weight_map': {'color_green': 2, 'need_harmony': 2, 'conflict_appease': 2}},
        {'label': 'D', 'text': 'Kesal, karena standar dan rapi itu penting.', 'weight_map': {'color_blue': 2, 'structure_need': 2, 'emotion_sensitivity': 1}}
    ]),
    q('R4W_CORE_V1', 6, 'Saat kamu sayang seseorang, kamu paling sering…', [
        {'label': 'A', 'text': 'Melindungi & memastikan semua beres.', 'weight_map': {'color_red': 2, 'need_control': 2, 'need_harmony': 1}},
        {'label': 'B', 'text': 'Memberi perhatian & suasana menyenangkan.', 'weight_map': {'color_yellow': 2, 'emotion_expression': 2, 'need_validation': 2}},
        {'label': 'C', 'text': 'Hadir, mendengar, dan setia.', 'weight_map': {'color_green': 2, 'need_harmony': 2, 'conflict_appease': 1}},
        {'label': 'D', 'text': 'Membuktikan lewat tindakan yang rapi/terukur.', 'weight_map': {'color_blue': 2, 'structure_need': 2, 'emotion_expression': 0}}
    ]),
    q('R4W_CORE_V1', 7, 'Saat stres, kamu lebih sering…', [
        {'label': 'A', 'text': 'Makin menekan, makin ingin cepat selesai.', 'weight_map': {'color_red': 2, 'conflict_attack': 2, 'need_control': 2}},
        {'label': 'B', 'text': 'Mencari distraksi: ngobrol, kegiatan, hiburan.', 'weight_map': {'color_yellow': 2, 'need_validation': 2, 'emotion_expression': 2}},
        {'label': 'C', 'text': 'Menahan diri, tidak mau bikin konflik.', 'weight_map': {'color_green': 2, 'conflict_appease': 2, 'need_harmony': 2}},
        {'label': 'D', 'text': 'Menarik diri, diam, butuh waktu mikir.', 'weight_map': {'color_blue': 2, 'conflict_freeze': 2, 'need_autonomy': 2}}
    ]),
    q('R4W_CORE_V1', 8, 'Kamu paling terganggu kalau…', [
        {'label': 'A', 'text': 'Orang tidak kompeten/bertele-tele.', 'weight_map': {'color_red': 2, 'need_control': 2, 'conflict_attack': 1}},
        {'label': 'B', 'text': 'Suasana dingin, tidak ada kehangatan.', 'weight_map': {'color_yellow': 2, 'need_validation': 2, 'emotion_sensitivity': 1}},
        {'label': 'C', 'text': 'Ada konflik terbuka, bikin tidak nyaman.', 'weight_map': {'color_green': 2, 'need_harmony': 3, 'conflict_avoid': 1}},
        {'label': 'D', 'text': 'Tidak rapi, tidak jelas, tidak konsisten.', 'weight_map': {'color_blue': 2, 'structure_need': 3, 'emotion_sensitivity': 1}}
    ]),
    q('R4W_CORE_V1', 9, 'Kalau debat, kamu cenderung…', [
        {'label': 'A', 'text': 'To the point, kadang keras.', 'weight_map': {'color_red': 2, 'conflict_attack': 3}},
        {'label': 'B', 'text': 'Bawa humor supaya reda.', 'weight_map': {'color_yellow': 2, 'conflict_appease': 2}},
        {'label': 'C', 'text': 'Mengalah dulu, asal damai.', 'weight_map': {'color_green': 2, 'conflict_appease': 3, 'need_harmony': 1}},
        {'label': 'D', 'text': 'Diam dulu, susun argumen.', 'weight_map': {'color_blue': 2, 'conflict_freeze': 2, 'structure_need': 1}}
    ]),
    q('R4W_CORE_V1', 10, 'Kamu paling merasa dicintai saat…', [
        {'label': 'A', 'text': 'Ada kepastian & komitmen nyata.', 'weight_map': {'color_red': 1, 'need_control': 1, 'need_harmony': 2}},
        {'label': 'B', 'text': 'Dipuji, diperhatikan, diajak ngobrol.', 'weight_map': {'color_yellow': 1, 'need_validation': 3, 'emotion_expression': 1}},
        {'label': 'C', 'text': 'Diterima apa adanya dan tidak ditekan.', 'weight_map': {'color_green': 1, 'need_harmony': 3, 'conflict_avoid': 1}},
        {'label': 'D', 'text': 'Dihargai kompetensinya dan dipercaya.', 'weight_map': {'color_blue': 1, 'structure_need': 2, 'need_autonomy': 1}}
    ]),
    q('R4W_CORE_V1', 11, 'Kalau ada target, kamu…', [
        {'label': 'A', 'text': 'Gas, fokus hasil.', 'weight_map': {'color_red': 3, 'decision_speed': 2, 'need_control': 2}},
        {'label': 'B', 'text': 'Bikin rame supaya semangat.', 'weight_map': {'color_yellow': 3, 'emotion_expression': 2, 'need_validation': 1}},
        {'label': 'C', 'text': 'Cari cara yang nyaman untuk semua.', 'weight_map': {'color_green': 3, 'need_harmony': 2, 'conflict_appease': 1}},
        {'label': 'D', 'text': 'Susun rencana detail.', 'weight_map': {'color_blue': 3, 'structure_need': 3}}
    ]),
    q('R4W_CORE_V1', 12, 'Kalau dikritik, kamu…', [
        {'label': 'A', 'text': 'Balas argumen / klarifikasi tegas.', 'weight_map': {'color_red': 2, 'conflict_attack': 2, 'emotion_sensitivity': 1}},
        {'label': 'B', 'text': 'Tertawa, tapi kepikiran juga.', 'weight_map': {'color_yellow': 2, 'need_validation': 2, 'emotion_sensitivity': 2}},
        {'label': 'C', 'text': 'Mikir perasaan orang, lalu mengalah.', 'weight_map': {'color_green': 2, 'conflict_appease': 2, 'need_harmony': 2}},
        {'label': 'D', 'text': 'Tanya detail: bagian mana, buktinya apa.', 'weight_map': {'color_blue': 2, 'structure_need': 2, 'conflict_freeze': 1}}
    ]),
    q('R4W_CORE_V1', 13, 'Sisi terkuatmu menurutmu…', [
        {'label': 'A', 'text': 'Berani ambil keputusan.', 'weight_map': {'color_red': 3, 'need_control': 2, 'decision_speed': 2}},
        {'label': 'B', 'text': 'Membawa energi positif.', 'weight_map': {'color_yellow': 3, 'emotion_expression': 2, 'need_validation': 1}},
        {'label': 'C', 'text': 'Sabar dan setia.', 'weight_map': {'color_green': 3, 'need_harmony': 2, 'conflict_appease': 1}},
        {'label': 'D', 'text': 'Teliti dan objektif.', 'weight_map': {'color_blue': 3, 'structure_need': 2}}
    ]),
    q('R4W_CORE_V1', 14, 'Sisi yang sering bikin masalah…', [
        {'label': 'A', 'text': 'Terlalu ngotot/keras.', 'weight_map': {'color_red': 1, 'conflict_attack': 2, 'need_control': 1}},
        {'label': 'B', 'text': 'Terlalu spontan, jadi kurang konsisten.', 'weight_map': {'color_yellow': 1, 'need_autonomy': 1, 'structure_need': 1}},
        {'label': 'C', 'text': 'Terlalu mengalah, jadi kependem.', 'weight_map': {'color_green': 1, 'conflict_appease': 2, 'conflict_avoid': 1}},
        {'label': 'D', 'text': 'Terlalu kritis, jadi terasa dingin.', 'weight_map': {'color_blue': 1, 'structure_need': 2, 'emotion_expression': 0}}
    ]),
    q('R4W_CORE_V1', 15, 'Dalam komunikasi, kamu lebih suka…', [
        {'label': 'A', 'text': 'Singkat, jelas, langsung inti.', 'weight_map': {'color_red': 2, 'decision_speed': 2, 'need_control': 1}},
        {'label': 'B', 'text': 'Cair, banyak cerita, hangat.', 'weight_map': {'color_yellow': 2, 'emotion_expression': 2, 'need_validation': 1}},
        {'label': 'C', 'text': 'Pelan, aman, tidak menyinggung.', 'weight_map': {'color_green': 2, 'need_harmony': 2, 'conflict_avoid': 1}},
        {'label': 'D', 'text': 'Terstruktur, runtut, logis.', 'weight_map': {'color_blue': 2, 'structure_need': 2}}
    ]),
    q('R4W_CORE_V1', 16, 'Kamu paling stres jika…', [
        {'label': 'A', 'text': 'Tidak punya kontrol atas keadaan.', 'weight_map': {'color_red': 2, 'need_control': 3, 'emotion_sensitivity': 1}},
        {'label': 'B', 'text': 'Diabaikan atau tidak dianggap.', 'weight_map': {'color_yellow': 2, 'need_validation': 3, 'emotion_sensitivity': 2}},
        {'label': 'C', 'text': 'Ada ketegangan/konflik berkepanjangan.', 'weight_map': {'color_green': 2, 'need_harmony': 3, 'conflict_avoid': 1}},
        {'label': 'D', 'text': 'Hal tidak jelas dan tidak rapi.', 'weight_map': {'color_blue': 2, 'structure_need': 3, 'emotion_sensitivity': 1}}
    ]),
    q('R4W_CORE_V1', 17, 'Kalau ada aturan, kamu…', [
        {'label': 'A', 'text': 'Ikuti kalau efektif, kalau tidak saya ubah.', 'weight_map': {'color_red': 2, 'need_control': 2, 'need_autonomy': 1}},
        {'label': 'B', 'text': 'Fleksibel, jangan terlalu kaku.', 'weight_map': {'color_yellow': 2, 'need_autonomy': 2}},
        {'label': 'C', 'text': 'Ikut saja agar tidak ribut.', 'weight_map': {'color_green': 2, 'need_harmony': 2, 'conflict_appease': 1}},
        {'label': 'D', 'text': 'Suka aturan yang jelas dan konsisten.', 'weight_map': {'color_blue': 2, 'structure_need': 3}}
    ]),
    q('R4W_CORE_V1', 18, 'Saat kecewa, kamu…', [
        {'label': 'A', 'text': 'Konfrontasi, saya jelaskan sekarang.', 'weight_map': {'color_red': 2, 'conflict_attack': 2, 'emotion_expression': 1}},
        {'label': 'B', 'text': 'Curhat ke orang, cari dukungan.', 'weight_map': {'color_yellow': 2, 'need_validation': 2, 'emotion_expression': 2}},
        {'label': 'C', 'text': 'Diam, supaya tidak memperburuk keadaan.', 'weight_map': {'color_green': 2, 'conflict_avoid': 2, 'need_harmony': 2}},
        {'label': 'D', 'text': 'Tarik diri, butuh waktu sendiri.', 'weight_map': {'color_blue': 2, 'need_autonomy': 2, 'conflict_freeze': 2}}
    ]),
    q('R4W_CORE_V1', 19, 'Kamu paling nyaman bekerja…', [
        {'label': 'A', 'text': 'Dengan target dan keputusan cepat.', 'weight_map': {'color_red': 2, 'decision_speed': 2, 'need_control': 2}},
        {'label': 'B', 'text': 'Dengan banyak interaksi dan variasi.', 'weight_map': {'color_yellow': 2, 'need_validation': 2, 'need_autonomy': 1}},
        {'label': 'C', 'text': 'Dengan suasana tenang dan stabil.', 'weight_map': {'color_green': 2, 'need_harmony': 2}},
        {'label': 'D', 'text': 'Dengan sistem dan SOP jelas.', 'weight_map': {'color_blue': 2, 'structure_need': 3}}
    ]),
    q('R4W_CORE_V1', 20, 'Kalau harus memilih, kamu lebih pentingkan…', [
        {'label': 'A', 'text': 'Hasil.', 'weight_map': {'color_red': 3, 'need_control': 2}},
        {'label': 'B', 'text': 'Pengalaman & relasi.', 'weight_map': {'color_yellow': 3, 'need_validation': 2}},
        {'label': 'C', 'text': 'Ketenangan.', 'weight_map': {'color_green': 3, 'need_harmony': 2}},
        {'label': 'D', 'text': 'Kebenaran & kualitas.', 'weight_map': {'color_blue': 3, 'structure_need': 2}}
    ])
]

# ---------- Deep Questions (20) ----------
DEEP_QUESTIONS = [
    q('R4T_DEEP_V1', 1, 'Saat konflik memanas, yang paling sering terjadi padamu adalah…', [
        {'label': 'A', 'text': 'Nada naik, ingin menuntaskan sekarang.', 'weight_map': {'conflict_attack': 3, 'need_control': 2, 'emotion_expression': 2, 'emotion_sensitivity': 1}},
        {'label': 'B', 'text': 'Aku menghindar dulu, nanti kalau sudah aman baru bicara.', 'weight_map': {'conflict_avoid': 3, 'need_harmony': 2, 'need_autonomy': 1}},
        {'label': 'C', 'text': 'Aku diam, kepala penuh, sulit bicara.', 'weight_map': {'conflict_freeze': 3, 'need_autonomy': 2, 'emotion_sensitivity': 2}},
        {'label': 'D', 'text': 'Aku menenangkan semua orang, walau dalam hati kesal.', 'weight_map': {'conflict_appease': 3, 'need_harmony': 2, 'need_validation': 1}}
    ]),
    q('R4T_DEEP_V1', 2, 'Kalau kamu merasa tidak dihargai, kamu cenderung…', [
        {'label': 'A', 'text': 'Menuntut perubahan dengan tegas.', 'weight_map': {'need_control': 2, 'conflict_attack': 2, 'need_validation': 1}},
        {'label': 'B', 'text': 'Mencari perhatian lewat interaksi/cerita.', 'weight_map': {'need_validation': 3, 'emotion_expression': 2}},
        {'label': 'C', 'text': 'Menarik diri, menahan, tapi berharap orang peka.', 'weight_map': {'need_harmony': 2, 'conflict_avoid': 2, 'need_validation': 2}},
        {'label': 'D', 'text': 'Membuktikan diri lewat kinerja/hasil.', 'weight_map': {'structure_need': 2, 'need_validation': 2, 'conflict_freeze': 1}}
    ]),
    q('R4T_DEEP_V1', 3, 'Pola terburuk saat kamu lelah adalah…', [
        {'label': 'A', 'text': 'Jadi mudah marah dan mengontrol.', 'weight_map': {'need_control': 3, 'conflict_attack': 2, 'emotion_sensitivity': 2}},
        {'label': 'B', 'text': 'Jadi impulsif, ngomong dulu baru mikir.', 'weight_map': {'emotion_expression': 3, 'decision_speed': 2, 'emotion_sensitivity': 2}},
        {'label': 'C', 'text': 'Jadi memendam, tersenyum tapi pahit.', 'weight_map': {'conflict_appease': 2, 'conflict_avoid': 2, 'need_harmony': 2}},
        {'label': 'D', 'text': 'Jadi dingin, menjauh, tidak responsif.', 'weight_map': {'conflict_freeze': 2, 'need_autonomy': 2, 'emotion_expression': 0}}
    ]),
    q('R4T_DEEP_V1', 4, 'Saat orang terdekat melakukan kesalahan, kamu…', [
        {'label': 'A', 'text': 'Langsung tegur supaya tidak terulang.', 'weight_map': {'conflict_attack': 2, 'need_control': 2, 'decision_speed': 2}},
        {'label': 'B', 'text': 'Kupakai humor, tapi tetap kusampaikan.', 'weight_map': {'conflict_appease': 1, 'emotion_expression': 2, 'need_validation': 1}},
        {'label': 'C', 'text': 'Kupendam dulu supaya tidak menyakiti.', 'weight_map': {'conflict_avoid': 2, 'need_harmony': 2}},
        {'label': 'D', 'text': 'Kuberikan catatan jelas & runtut.', 'weight_map': {'structure_need': 2, 'conflict_freeze': 1, 'decision_speed': 0}}
    ]),
    q('R4T_DEEP_V1', 5, 'Yang paling kamu butuhkan saat emosi tinggi adalah…', [
        {'label': 'A', 'text': 'Keputusan & langkah jelas.', 'weight_map': {'need_control': 3, 'structure_need': 1}},
        {'label': 'B', 'text': 'Didengarkan dan divalidasi dulu.', 'weight_map': {'need_validation': 3, 'emotion_expression': 1}},
        {'label': 'C', 'text': 'Rasa aman dan nada lembut.', 'weight_map': {'need_harmony': 3, 'emotion_sensitivity': 1}},
        {'label': 'D', 'text': 'Waktu sendiri untuk menenangkan diri.', 'weight_map': {'need_autonomy': 3, 'conflict_freeze': 1}}
    ]),
    q('R4T_DEEP_V1', 6, 'Saat pasangan/teman menekan kamu untuk cepat menjawab, kamu…', [
        {'label': 'A', 'text': "Makin keras: 'ya sudah begini!'", 'weight_map': {'conflict_attack': 2, 'need_control': 2, 'emotion_expression': 1}},
        {'label': 'B', 'text': 'Ngeles/ubah topik supaya tidak tegang.', 'weight_map': {'conflict_avoid': 2, 'emotion_expression': 1}},
        {'label': 'C', 'text': 'Diam, merasa tidak aman.', 'weight_map': {'conflict_freeze': 2, 'need_harmony': 1, 'emotion_sensitivity': 2}},
        {'label': 'D', 'text': "Mengalah dulu, tapi dalam hati 'capek'.", 'weight_map': {'conflict_appease': 2, 'need_harmony': 2}}
    ]),
    q('R4T_DEEP_V1', 7, 'Kamu paling tersulut oleh…', [
        {'label': 'A', 'text': 'Diremehkan / dianggap tidak mampu.', 'weight_map': {'need_validation': 1, 'need_control': 2, 'conflict_attack': 1, 'emotion_sensitivity': 2}},
        {'label': 'B', 'text': 'Diabaikan / tidak dianggap hadir.', 'weight_map': {'need_validation': 3, 'emotion_sensitivity': 2}},
        {'label': 'C', 'text': 'Nada tinggi / konflik di depan orang.', 'weight_map': {'need_harmony': 2, 'conflict_avoid': 2, 'emotion_sensitivity': 2}},
        {'label': 'D', 'text': 'Tidak konsisten / janji tidak ditepati.', 'weight_map': {'structure_need': 3, 'emotion_sensitivity': 2}}
    ]),
    q('R4T_DEEP_V1', 8, "Kalau kamu merasa 'tidak aman', kamu biasanya…", [
        {'label': 'A', 'text': 'Kontrol meningkat: atur semuanya.', 'weight_map': {'need_control': 3, 'conflict_attack': 1}},
        {'label': 'B', 'text': 'Cari dukungan sosial/validasi.', 'weight_map': {'need_validation': 3, 'emotion_expression': 2}},
        {'label': 'C', 'text': 'Menjaga damai: jangan bikin ribut.', 'weight_map': {'need_harmony': 3, 'conflict_appease': 2}},
        {'label': 'D', 'text': 'Mundur: butuh ruang sendiri.', 'weight_map': {'need_autonomy': 3, 'conflict_freeze': 2}}
    ]),
    q('R4T_DEEP_V1', 9, 'Kamu paling sering menyesal karena…', [
        {'label': 'A', 'text': 'Terlalu cepat memutuskan dengan emosi.', 'weight_map': {'decision_speed': 2, 'conflict_attack': 1, 'emotion_sensitivity': 1}},
        {'label': 'B', 'text': 'Terlalu banyak bicara/berjanji spontan.', 'weight_map': {'emotion_expression': 2, 'structure_need': 1}},
        {'label': 'C', 'text': 'Terlalu mengalah sampai kehilangan diri.', 'weight_map': {'conflict_appease': 2, 'need_harmony': 2, 'need_autonomy': 1}},
        {'label': 'D', 'text': 'Terlalu lama diam sampai terlambat.', 'weight_map': {'conflict_freeze': 2, 'conflict_avoid': 1, 'decision_speed': 0}}
    ]),
    q('R4T_DEEP_V1', 10, 'Jika orang terdekat marah, kamu…', [
        {'label': 'A', 'text': 'Hadapi balik, selesaikan sekarang.', 'weight_map': {'conflict_attack': 2, 'need_control': 2}},
        {'label': 'B', 'text': 'Redakan dengan interaksi/humor.', 'weight_map': {'conflict_appease': 2, 'emotion_expression': 2}},
        {'label': 'C', 'text': 'Takut suasana pecah, jadi menenangkan.', 'weight_map': {'need_harmony': 2, 'conflict_appease': 2}},
        {'label': 'D', 'text': 'Diam, menunggu aman baru bicara.', 'weight_map': {'conflict_freeze': 2, 'conflict_avoid': 1, 'need_autonomy': 1}}
    ]),
    q('R4T_DEEP_V1', 11, 'Kalau kamu harus meminta sesuatu, kamu biasanya…', [
        {'label': 'A', 'text': 'Minta langsung dan jelas.', 'weight_map': {'need_control': 2, 'emotion_expression': 1}},
        {'label': 'B', 'text': 'Minta dengan gaya santai sambil bercanda.', 'weight_map': {'need_validation': 2, 'emotion_expression': 2}},
        {'label': 'C', 'text': 'Tidak enak minta, jadi berharap dimengerti.', 'weight_map': {'need_harmony': 2, 'conflict_avoid': 2, 'need_validation': 1}},
        {'label': 'D', 'text': 'Minta lewat pesan/teks agar rapi dan aman.', 'weight_map': {'structure_need': 2, 'conflict_freeze': 1, 'need_autonomy': 1}}
    ]),
    q('R4T_DEEP_V1', 12, 'Dalam hubungan, kamu paling takut…', [
        {'label': 'A', 'text': 'Tidak dihormati / tidak dianggap.', 'weight_map': {'need_validation': 2, 'need_control': 1, 'emotion_sensitivity': 1}},
        {'label': 'B', 'text': 'Diabaikan / ditinggal.', 'weight_map': {'need_validation': 3, 'emotion_sensitivity': 2}},
        {'label': 'C', 'text': 'Pertengkaran terus-menerus.', 'weight_map': {'need_harmony': 3, 'conflict_avoid': 1}},
        {'label': 'D', 'text': 'Kehilangan kebebasan/ruang.', 'weight_map': {'need_autonomy': 3, 'conflict_freeze': 1}}
    ]),
    q('R4T_DEEP_V1', 13, 'Kamu lebih merasa aman ketika…', [
        {'label': 'A', 'text': 'Ada peran jelas dan komitmen tegas.', 'weight_map': {'need_control': 2, 'structure_need': 2}},
        {'label': 'B', 'text': 'Ada kehangatan dan perhatian rutin.', 'weight_map': {'need_validation': 2, 'emotion_expression': 2}},
        {'label': 'C', 'text': 'Ada nada lembut dan penerimaan.', 'weight_map': {'need_harmony': 2, 'emotion_sensitivity': 1}},
        {'label': 'D', 'text': 'Ada ruang pribadi dan tidak ditekan.', 'weight_map': {'need_autonomy': 2, 'conflict_freeze': 1}}
    ]),
    q('R4T_DEEP_V1', 14, 'Kalau kamu merasa bersalah, kamu…', [
        {'label': 'A', 'text': 'Langsung perbaiki, tidak mau berlarut.', 'weight_map': {'decision_speed': 2, 'need_control': 1}},
        {'label': 'B', 'text': 'Minta maaf cepat supaya hubungan aman.', 'weight_map': {'need_harmony': 1, 'conflict_appease': 2}},
        {'label': 'C', 'text': 'Memikirkan semua orang, jadi terbeban.', 'weight_map': {'need_harmony': 2, 'emotion_sensitivity': 2, 'conflict_appease': 1}},
        {'label': 'D', 'text': 'Overthinking, jadi sulit ngomong.', 'weight_map': {'conflict_freeze': 2, 'structure_need': 1, 'emotion_sensitivity': 2}}
    ]),
    q('R4T_DEEP_V1', 15, "Kalau pasangan/teman bilang 'kamu dingin', kamu…", [
        {'label': 'A', 'text': "Balas: 'aku realistis aja.'", 'weight_map': {'need_control': 1, 'emotion_expression': 0, 'conflict_attack': 1}},
        {'label': 'B', 'text': 'Bercanda, tapi sebenarnya tersinggung.', 'weight_map': {'need_validation': 2, 'emotion_sensitivity': 2}},
        {'label': 'C', 'text': 'Merasa bersalah, jadi makin mengalah.', 'weight_map': {'conflict_appease': 2, 'need_harmony': 2}},
        {'label': 'D', 'text': 'Aku memang butuh waktu, bukan tidak peduli.', 'weight_map': {'need_autonomy': 2, 'conflict_freeze': 1}}
    ]),
    q('R4T_DEEP_V1', 16, 'Saat diskusi panjang, kamu cenderung…', [
        {'label': 'A', 'text': "Minta keputusan: 'jadi apa sekarang?'", 'weight_map': {'decision_speed': 2, 'need_control': 2}},
        {'label': 'B', 'text': 'Menjaga suasana, jangan terlalu tegang.', 'weight_map': {'conflict_appease': 1, 'need_validation': 1}},
        {'label': 'C', 'text': 'Takut menyakiti, jadi pilih kata-kata aman.', 'weight_map': {'need_harmony': 2, 'conflict_avoid': 1}},
        {'label': 'D', 'text': "Minta struktur: 'kita bahas poin per poin.'", 'weight_map': {'structure_need': 2, 'conflict_freeze': 1}}
    ]),
    q('R4T_DEEP_V1', 17, 'Sumber konflik terbesarmu biasanya…', [
        {'label': 'A', 'text': 'Orang tidak sejalan, bikin lambat.', 'weight_map': {'need_control': 2, 'conflict_attack': 1}},
        {'label': 'B', 'text': 'Merasa kurang diperhatikan.', 'weight_map': {'need_validation': 2, 'emotion_sensitivity': 2}},
        {'label': 'C', 'text': 'Tidak enak menolak, akhirnya numpuk.', 'weight_map': {'conflict_appease': 2, 'conflict_avoid': 1}},
        {'label': 'D', 'text': 'Standar tidak dipenuhi / tidak rapi.', 'weight_map': {'structure_need': 2, 'emotion_sensitivity': 1}}
    ]),
    q('R4T_DEEP_V1', 18, 'Kalau ada ketidakpastian, kamu…', [
        {'label': 'A', 'text': 'Bikin aturan dan kontrol supaya pasti.', 'weight_map': {'need_control': 2, 'structure_need': 2}},
        {'label': 'B', 'text': 'Cari orang untuk ngobrol/menenangkan.', 'weight_map': {'need_validation': 2, 'emotion_expression': 2}},
        {'label': 'C', 'text': 'Cari suasana aman, hindari konflik.', 'weight_map': {'need_harmony': 2, 'conflict_avoid': 1}},
        {'label': 'D', 'text': 'Butuh ruang sendiri untuk mikir.', 'weight_map': {'need_autonomy': 2, 'conflict_freeze': 1}}
    ]),
    q('R4T_DEEP_V1', 19, "Ketika kamu merasa 'tidak didengar', kamu…", [
        {'label': 'A', 'text': 'Naikkan volume/tegas agar didengar.', 'weight_map': {'conflict_attack': 2, 'need_control': 1, 'emotion_expression': 1}},
        {'label': 'B', 'text': 'Meninggikan drama/emosi agar diperhatikan.', 'weight_map': {'need_validation': 2, 'emotion_expression': 2, 'emotion_sensitivity': 1}},
        {'label': 'C', 'text': 'Diam dan mundur, merasa percuma.', 'weight_map': {'conflict_avoid': 2, 'need_harmony': 1}},
        {'label': 'D', 'text': 'Menutup diri dan jadi dingin.', 'weight_map': {'conflict_freeze': 2, 'need_autonomy': 1}}
    ]),
    q('R4T_DEEP_V1', 20, 'Kalau ingin hubungan membaik, langkah pertama yang paling mungkin kamu lakukan adalah…', [
        {'label': 'A', 'text': 'Buat kesepakatan yang jelas.', 'weight_map': {'structure_need': 2, 'need_control': 2}},
        {'label': 'B', 'text': 'Membangun momen hangat dan koneksi.', 'weight_map': {'need_validation': 2, 'emotion_expression': 2}},
        {'label': 'C', 'text': 'Membuat suasana aman agar bisa bicara.', 'weight_map': {'need_harmony': 2, 'conflict_appease': 1}},
        {'label': 'D', 'text': 'Minta ruang sebentar lalu kembali bicara.', 'weight_map': {'need_autonomy': 2, 'conflict_freeze': 1}}
    ])
]

ALL_QUESTIONS = CORE_QUESTIONS + DEEP_QUESTIONS

# ---------- Lock Payload Builders ----------
def build_question_set_lock_payload(set_doc: Dict) -> Dict:
    return {
        'code': set_doc['code'],
        'title': set_doc['title'],
        'version': set_doc['version'],
        'dimensions_canonical': DIMENSIONS_CANONICAL
    }

def build_question_lock_payload(question: Dict) -> Dict:
    return {
        'set_code': question['set_code'],
        'order_no': question['order_no'],
        'type': question['type'],
        'prompt': question['prompt'],
        'answers': [
            {'label': a['label'], 'text': a['text'], 'weight_map': a['weight_map']}
            for a in question['answers']
        ]
    }

# ---------- Database Operations ----------
async def ensure_collections_and_indexes(db):
    """Create collections and indexes for RELASI4™ (prefixed with r4_)."""
    # Question sets (RELASI4™)
    await db.r4_question_sets.create_index('code', unique=True)
    
    # Questions (RELASI4™) - uses r4_questions to avoid conflict with existing quiz
    await db.r4_questions.create_index([('question_set_id', 1), ('order_no', 1)], unique=True)
    await db.r4_questions.create_index([('set_code', 1), ('order_no', 1)], unique=True)
    await db.r4_questions.create_index('question_set_id')
    
    # Answers (RELASI4™)
    await db.r4_answers.create_index([('question_id', 1), ('label', 1)], unique=True)
    await db.r4_answers.create_index([('set_code', 1), ('order_no', 1), ('label', 1)], unique=True)
    await db.r4_answers.create_index([('set_code', 1), ('order_no', 1)])
    
    # Responses (user quiz responses)
    await db.r4_responses.create_index('user_id')
    await db.r4_responses.create_index('assessment_id')
    await db.r4_responses.create_index([('user_id', 1), ('created_at', -1)])
    
    # Reports (RELASI4™)
    await db.r4_reports.create_index('user_id')
    await db.r4_reports.create_index('assessment_id')
    await db.r4_reports.create_index([('user_id', 1), ('created_at', -1)])
    
    print('[seed] RELASI4™ indexes created (r4_* collections)')

async def upsert_locked_question_set(db, set_doc: Dict) -> str:
    """Upsert a locked question set to r4_question_sets collection."""
    lock_payload = build_question_set_lock_payload(set_doc)
    lock_hash = sha256_hex(stable_stringify(lock_payload))
    
    existing = await db.r4_question_sets.find_one(
        {'code': set_doc['code']},
        {'_id': 1, 'locked': 1, 'lock_hash': 1}
    )
    
    # Check lock violation
    if existing and existing.get('locked') and existing.get('lock_hash'):
        if existing['lock_hash'] != lock_hash:
            raise Exception(
                f"LOCK VIOLATION on r4_question_sets.{set_doc['code']}: "
                f"existing lock_hash differs.\n"
                f"existing={existing['lock_hash']}\n"
                f"new={lock_hash}\n"
                f"Refuse to overwrite locked content. Create a new version instead (e.g., *_V2)."
            )
    
    now = datetime.now(timezone.utc)
    
    result = await db.r4_question_sets.update_one(
        {'code': set_doc['code']},
        {
            '$setOnInsert': {'created_at': now},
            '$set': {
                'title': set_doc['title'],
                'version': set_doc['version'],
                'is_active': set_doc.get('is_active', True),
                'locked': True,
                'lock_hash': lock_hash,
                'lock_payload': lock_payload,
                'updated_at': now
            }
        },
        upsert=True
    )
    
    saved = await db.r4_question_sets.find_one({'code': set_doc['code']}, {'_id': 1, 'code': 1})
    return str(saved['_id'])

async def upsert_locked_question_and_answers(db, question: Dict) -> str:
    """Upsert a locked question with its answers to r4_questions/r4_answers collections."""
    q_lock_payload = build_question_lock_payload(question)
    q_lock_hash = sha256_hex(stable_stringify(q_lock_payload))
    
    # Find question_set_id from r4_question_sets
    qs = await db.r4_question_sets.find_one(
        {'code': question['set_code']},
        {'_id': 1, 'code': 1}
    )
    if not qs:
        raise Exception(f"Missing r4_question_sets: {question['set_code']}")
    
    question_set_id = qs['_id']
    
    # Check existing question lock in r4_questions
    existing_q = await db.r4_questions.find_one(
        {'question_set_id': question_set_id, 'order_no': question['order_no']},
        {'_id': 1, 'locked': 1, 'lock_hash': 1}
    )
    
    if existing_q and existing_q.get('locked') and existing_q.get('lock_hash'):
        if existing_q['lock_hash'] != q_lock_hash:
            raise Exception(
                f"LOCK VIOLATION on r4_questions {question['set_code']}#{question['order_no']}: "
                f"existing lock_hash differs.\n"
                f"existing={existing_q['lock_hash']}\n"
                f"new={q_lock_hash}\n"
                f"Refuse to overwrite locked content. Create new version question set (e.g., *_V2)."
            )
    
    now = datetime.now(timezone.utc)
    
    # Upsert question to r4_questions
    await db.r4_questions.update_one(
        {'question_set_id': question_set_id, 'order_no': question['order_no']},
        {
            '$setOnInsert': {'created_at': now},
            '$set': {
                'question_set_id': question_set_id,
                'set_code': question['set_code'],
                'order_no': question['order_no'],
                'type': question['type'],
                'prompt': question['prompt'],
                'is_active': True,
                'locked': True,
                'lock_hash': q_lock_hash,
                'lock_payload': q_lock_payload,
                'updated_at': now
            }
        },
        upsert=True
    )
    
    saved_q = await db.r4_questions.find_one(
        {'question_set_id': question_set_id, 'order_no': question['order_no']},
        {'_id': 1, 'set_code': 1, 'order_no': 1}
    )
    
    question_id = saved_q['_id']
    
    # Upsert answers to r4_answers
    for ans in question['answers']:
        await db.r4_answers.update_one(
            {'question_id': question_id, 'label': ans['label']},
            {
                '$setOnInsert': {'created_at': now},
                '$set': {
                    'question_id': question_id,
                    'set_code': question['set_code'],
                    'order_no': question['order_no'],
                    'label': ans['label'],
                    'text': ans['text'],
                    'weight_map': ans['weight_map'],
                    'locked': True,
                    'lock_hash': q_lock_hash,
                    'updated_at': now
                }
            },
            upsert=True
        )
    
    return str(question_id)

async def main():
    """Main seed function."""
    print(f'[seed] Connecting to {MONGO_URL} / db={DB_NAME}')
    
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Ensure indexes
    await ensure_collections_and_indexes(db)
    
    # Upsert question sets
    set_ids = {}
    for set_doc in QUESTION_SETS:
        set_id = await upsert_locked_question_set(db, set_doc)
        set_ids[set_doc['code']] = set_id
        print(f"[seed] question_set upserted+locked: {set_doc['code']} (_id={set_id})")
    
    # Upsert questions + answers
    q_count = 0
    a_count = 0
    for qu in ALL_QUESTIONS:
        await upsert_locked_question_and_answers(db, qu)
        q_count += 1
        a_count += len(qu['answers'])
    
    print(f'[seed] Upserted questions={q_count}, answers={a_count}')
    
    # Sanity check - verify r4_* collections
    cs_n = await db.r4_question_sets.count_documents({'code': {'$in': ['R4W_CORE_V1', 'R4T_DEEP_V1']}})
    q_n = await db.r4_questions.count_documents({'set_code': {'$in': ['R4W_CORE_V1', 'R4T_DEEP_V1']}})
    a_n = await db.r4_answers.count_documents({'set_code': {'$in': ['R4W_CORE_V1', 'R4T_DEEP_V1']}})
    
    print(f'[seed] sanity: r4_question_sets={cs_n}, r4_questions={q_n}, r4_answers={a_n}')
    
    if cs_n != 2 or q_n != 40 or a_n != 160:
        print('[seed] WARNING: expected (2,40,160). Please check data completeness.')
    else:
        print('[seed] OK: RELASI4™ v1 seed complete and locked.')
    
    client.close()

if __name__ == '__main__':
    asyncio.run(main())
