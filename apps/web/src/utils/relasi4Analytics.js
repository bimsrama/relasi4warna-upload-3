/**
 * RELASI4™ Advanced Analytics & Growth Layer
 * ==========================================
 * A/B/C Testing + Microcopy + Emotional Intelligence
 * 
 * Variants:
 * - color: CTA based on primary_color (red/yellow/green/blue)
 * - psychological: CTA based on primary_need + conflict_style
 * - hybrid: Headline from need, subline from color, modifier from conflict
 */

// Get API URL from environment
const API_URL = process.env.REACT_APP_BACKEND_URL || '';

// ============================================================
// A/B/C TEST VARIANT MANAGEMENT
// ============================================================

/**
 * Get or assign CTA variant (33/33/34 split)
 * Persists in localStorage, syncs to user profile when logged in
 */
export const getCtaVariant = () => {
  const stored = localStorage.getItem('relasi4_cta_variant');
  if (stored && ['color', 'psychological', 'hybrid'].includes(stored)) {
    return stored;
  }
  
  // Random 33/33/34 assignment
  const rand = Math.random();
  let variant;
  if (rand < 0.33) {
    variant = 'color';
  } else if (rand < 0.66) {
    variant = 'psychological';
  } else {
    variant = 'hybrid';
  }
  
  localStorage.setItem('relasi4_cta_variant', variant);
  return variant;
};

/**
 * Legacy variant getter (for backward compatibility)
 */
export const getRelasi4Variant = () => {
  return getCtaVariant();
};

/**
 * Sync variant to user profile (call after login)
 */
export const syncVariantToProfile = async (token) => {
  const variant = getCtaVariant();
  try {
    await fetch(`${API_URL}/api/relasi4/user/variant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ cta_variant: variant })
    });
  } catch (e) {
    // Silent fail
  }
};

// ============================================================
// ANALYTICS EVENT TRACKING
// ============================================================

/**
 * Track analytics event with full payload
 * Events: relasi4_cta_rendered, relasi4_cta_clicked, 
 *         relasi4_payment_started, relasi4_payment_success
 */
export const trackRelasi4Event = (eventName, data = {}) => {
  try {
    const ctaVariant = data.cta_variant || getCtaVariant();
    const eventData = {
      event: eventName,
      cta_variant: ctaVariant,
      timestamp: new Date().toISOString(),
      ...data
    };
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[RELASI4 Analytics]', eventData);
    }
    
    // Store in localStorage for basic tracking (backup)
    const events = JSON.parse(localStorage.getItem('relasi4_events') || '[]');
    events.push(eventData);
    if (events.length > 100) events.shift();
    localStorage.setItem('relasi4_events', JSON.stringify(events));
    
    // Send to backend analytics (fire-and-forget)
    const token = localStorage.getItem('token');
    fetch(`${API_URL}/api/relasi4/analytics/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        event: eventName,
        cta_variant: ctaVariant,
        variant: ctaVariant, // backward compatibility
        primary_color: data.primary_color || null,
        primary_need: data.primary_need || null,
        primary_conflict_style: data.primary_conflict_style || null,
        entry_point: data.entry_point || null,
        cta_location: data.cta_location || null,
        package_type: data.package || null,
        conversion: data.conversion || false,
        metadata: data
      })
    }).catch(() => {
      // Silent fail - fire-and-forget
    });
    
  } catch (e) {
    // Fire-and-forget, don't break UI
    console.warn('Analytics error:', e);
  }
};

// ============================================================
// CTA COPY SYSTEMS
// ============================================================

/**
 * CTA Copy based on PRIMARY COLOR (Variant A)
 */
export const CTA_COPY_BY_COLOR = {
  driver: {
    title_id: "RELASI4™ — Kendalikan Pola Konflik Anda",
    title_en: "RELASI4™ — Control Your Conflict Patterns",
    sub_id: "Anda cepat bertindak. Tapi apakah cara ini benar-benar menyelesaikan akar masalah?",
    sub_en: "You act fast. But does this approach truly solve the root cause?",
    cta_id: "Buka Analisis RELASI4™",
    cta_en: "Open RELASI4™ Analysis",
    color: "#C05640"
  },
  spark: {
    title_id: "RELASI4™ — Dipahami Tanpa Harus Terluka",
    title_en: "RELASI4™ — Be Understood Without Getting Hurt",
    sub_id: "Anda memberi banyak energi. Tapi apakah kebutuhan Anda benar-benar terpenuhi?",
    sub_en: "You give so much energy. But are your needs truly being met?",
    cta_id: "Lihat RELASI4™ Saya",
    cta_en: "See My RELASI4™",
    color: "#D99E30"
  },
  anchor: {
    title_id: "RELASI4™ — Tetap Damai Tanpa Kehilangan Diri",
    title_en: "RELASI4™ — Stay Peaceful Without Losing Yourself",
    sub_id: "Anda menjaga semua orang. RELASI4™ bantu menjaga Anda juga.",
    sub_en: "You take care of everyone. RELASI4™ helps take care of you too.",
    cta_id: "Pelajari Pola RELASI4™",
    cta_en: "Learn RELASI4™ Patterns",
    color: "#5D8A66"
  },
  analyst: {
    title_id: "RELASI4™ — Memahami Relasi Secara Objektif",
    title_en: "RELASI4™ — Understand Relationships Objectively",
    sub_id: "Data membantu melihat apa yang emosi sering sembunyikan.",
    sub_en: "Data helps see what emotions often hide.",
    cta_id: "Buka Laporan RELASI4™",
    cta_en: "Open RELASI4™ Report",
    color: "#5B8FA8"
  }
};

/**
 * CTA Copy based on PRIMARY NEED (Variant B - Psychological)
 */
export const CTA_BY_NEED = {
  need_control: {
    headline_id: "RELASI4™ — Kendalikan Pola yang Selama Ini Mengendalikan Anda",
    headline_en: "RELASI4™ — Control the Patterns That Have Been Controlling You",
    sub_id: "Bukan soal siapa yang benar, tapi bagaimana konflik bisa selesai tanpa menghancurkan relasi.",
    sub_en: "It's not about who's right, but how conflict can be resolved without destroying the relationship.",
    cta_id: "Ambil Kendali Sekarang",
    cta_en: "Take Control Now",
    color: "#C05640",
    icon: "shield"
  },
  need_validation: {
    headline_id: "RELASI4™ — Dipahami Tanpa Harus Meminta",
    headline_en: "RELASI4™ — Be Understood Without Having to Ask",
    sub_id: "RELASI4™ membantu menjelaskan kebutuhan Anda dengan bahasa yang bisa diterima pasangan/keluarga.",
    sub_en: "RELASI4™ helps explain your needs in a language your partner/family can understand.",
    cta_id: "Saya Ingin Dipahami",
    cta_en: "I Want to Be Understood",
    color: "#D99E30",
    icon: "heart"
  },
  need_harmony: {
    headline_id: "RELASI4™ — Damai Tanpa Terus Mengorbankan Diri",
    headline_en: "RELASI4™ — Peace Without Constantly Sacrificing Yourself",
    sub_id: "Harmoni yang sehat dimulai dari batas yang jelas.",
    sub_en: "Healthy harmony starts with clear boundaries.",
    cta_id: "Jaga Damai dengan Sehat",
    cta_en: "Keep Peace Healthily",
    color: "#5D8A66",
    icon: "leaf"
  },
  need_autonomy: {
    headline_id: "RELASI4™ — Punya Ruang Tanpa Kehilangan Relasi",
    headline_en: "RELASI4™ — Have Space Without Losing the Relationship",
    sub_id: "Anda boleh punya jarak tanpa harus menjauh.",
    sub_en: "You can have distance without having to drift apart.",
    cta_id: "Pahami Pola Saya",
    cta_en: "Understand My Patterns",
    color: "#5B8FA8",
    icon: "compass"
  }
};

/**
 * Conflict Style Modifiers
 */
export const CONFLICT_MODIFIER = {
  conflict_attack: {
    text_id: "Bantu hentikan konflik sebelum berubah jadi ledakan.",
    text_en: "Help stop conflict before it turns into an explosion.",
    urgency: "high"
  },
  conflict_avoid: {
    text_id: "Belajar bicara tanpa harus memicu pertengkaran.",
    text_en: "Learn to speak up without triggering a fight.",
    urgency: "medium"
  },
  conflict_freeze: {
    text_id: "Temukan kata yang tepat saat Anda biasanya memilih diam.",
    text_en: "Find the right words when you usually choose silence.",
    urgency: "medium"
  },
  conflict_appease: {
    text_id: "Berani jujur tanpa harus melukai siapa pun.",
    text_en: "Be brave enough to be honest without hurting anyone.",
    urgency: "low"
  }
};

// ============================================================
// MICROCOPY SYSTEM (Hesitation & Payment Resistance)
// ============================================================

/**
 * Global hesitation microcopy
 */
export const HESITATION_GLOBAL = {
  id: [
    "Banyak orang baru sadar polanya setelah melihat laporan ini.",
    "Ini bukan tes kepribadian—ini peta pola relasi Anda.",
    "Laporan ini membantu percakapan yang selama ini sulit dimulai."
  ],
  en: [
    "Many people only realize their patterns after seeing this report.",
    "This isn't a personality test—it's a map of your relationship patterns.",
    "This report helps start conversations that have been difficult to begin."
  ]
};

/**
 * Need-based hesitation microcopy
 */
export const HESITATION_BY_NEED = {
  need_control: {
    text_id: "Memahami pola memberi Anda kendali, bukan kehilangan kendali.",
    text_en: "Understanding patterns gives you control, not loss of control."
  },
  need_validation: {
    text_id: "Anda tidak berlebihan—kebutuhan Anda hanya belum diterjemahkan dengan benar.",
    text_en: "You're not being excessive—your needs just haven't been translated properly."
  },
  need_harmony: {
    text_id: "Damai tidak selalu berarti diam.",
    text_en: "Peace doesn't always mean silence."
  },
  need_autonomy: {
    text_id: "Ruang pribadi tidak sama dengan menjauh.",
    text_en: "Personal space isn't the same as drifting apart."
  }
};

/**
 * Conflict style hesitation microcopy
 */
export const HESITATION_BY_CONFLICT = {
  conflict_attack: {
    text_id: "Kecepatan tanpa arah sering berakhir di konflik yang sama.",
    text_en: "Speed without direction often ends in the same conflict."
  },
  conflict_avoid: {
    text_id: "Diam memang aman, tapi sering meninggalkan jarak.",
    text_en: "Silence may be safe, but it often leaves distance."
  },
  conflict_freeze: {
    text_id: "Tidak semua percakapan harus sempurna untuk dimulai.",
    text_en: "Not every conversation has to be perfect to begin."
  },
  conflict_appease: {
    text_id: "Kejujuran bisa lembut.",
    text_en: "Honesty can be gentle."
  }
};

// ============================================================
// PAYMENT RESISTANCE MICROCOPY (P1 Feature)
// ============================================================

/**
 * Payment resistance microcopy - shown when user hesitates on pricing
 * Triggers: hover delay (3s), scroll back to pricing, second visit
 */
export const PAYMENT_RESISTANCE_MICROCOPY = {
  // Price objection handling
  price_objection: {
    id: [
      "Rp 49.000 = harga 1x ngopi. Tapi insight-nya bisa mengubah cara Anda berkomunikasi selamanya.",
      "Investasi hubungan > investasi gadget. Berapa banyak yang sudah dihabiskan untuk hal yang tidak bertahan?",
      "Lebih murah dari 1 sesi konseling. Dan bisa dibaca berkali-kali.",
      "Tidak perlu bayar sekarang kalau belum yakin. Tapi pola yang sama akan terus berulang."
    ],
    en: [
      "$3.49 = price of one coffee. But the insights can change how you communicate forever.",
      "Investing in relationships > investing in gadgets. How much has been spent on things that don't last?",
      "Cheaper than 1 counseling session. And can be read over and over.",
      "No need to pay now if you're not sure. But the same patterns will keep repeating."
    ]
  },
  // Value reinforcement
  value_reinforcement: {
    id: [
      "1000+ pengguna sudah menemukan pola mereka. Sekarang giliran Anda.",
      "Laporan ini bukan sekadar label—ini panduan praktis yang bisa langsung dipraktekkan.",
      "Apa yang Anda dapatkan: peta konflik, kebutuhan tersembunyi, tips spesifik untuk tipe Anda.",
      "Bayangkan bisa menjelaskan kebutuhan Anda dengan bahasa yang pasangan Anda pahami."
    ],
    en: [
      "1000+ users have found their patterns. Now it's your turn.",
      "This report isn't just labels—it's a practical guide you can use immediately.",
      "What you get: conflict map, hidden needs, specific tips for your type.",
      "Imagine being able to explain your needs in a language your partner understands."
    ]
  },
  // Urgency (subtle, not salesy)
  subtle_urgency: {
    id: [
      "Pola yang tidak dipahami akan terus terulang dalam relasi berikutnya.",
      "Konflik yang sama 3x = saatnya melihat dari sudut berbeda.",
      "Menunda memahami diri = menunda perbaikan hubungan.",
      "Semakin cepat Anda memahami pola, semakin sedikit konflik yang tidak perlu."
    ],
    en: [
      "Patterns that aren't understood will keep repeating in future relationships.",
      "The same conflict 3x = time to look from a different angle.",
      "Delaying self-understanding = delaying relationship improvement.",
      "The sooner you understand patterns, the fewer unnecessary conflicts."
    ]
  },
  // By primary need (personalized)
  by_need: {
    need_control: {
      id: "Anda terbiasa mengontrol situasi. Tapi sudahkah Anda mengontrol pola yang mengendalikan Anda?",
      en: "You're used to controlling situations. But have you controlled the patterns controlling you?"
    },
    need_validation: {
      id: "Anda lelah tidak dimengerti. Laporan ini membantu orang lain akhirnya memahami Anda.",
      en: "You're tired of not being understood. This report helps others finally understand you."
    },
    need_harmony: {
      id: "Anda selalu menjaga damai. Saatnya ada yang menjaga kebutuhan Anda juga.",
      en: "You always keep the peace. It's time someone looks after your needs too."
    },
    need_autonomy: {
      id: "Ruang yang Anda butuhkan bukan masalah. Yang perlu adalah bahasa untuk menjelaskannya.",
      en: "The space you need isn't a problem. What's needed is the language to explain it."
    }
  },
  // By conflict style (personalized)
  by_conflict: {
    conflict_attack: {
      id: "Reaksi cepat Anda sering disalahpahami. Laporan ini menjelaskan kenapa—dan cara lebih efektif.",
      en: "Your quick reactions are often misunderstood. This report explains why—and a more effective way."
    },
    conflict_avoid: {
      id: "Menghindari konflik tidak menyelesaikannya. Laporan ini memberi alternatif selain diam atau lari.",
      en: "Avoiding conflict doesn't solve it. This report gives alternatives besides silence or escape."
    },
    conflict_freeze: {
      id: "Saat Anda membeku, banyak hal tidak tersampaikan. Laporan ini membantu menemukan kata yang tepat.",
      en: "When you freeze, much goes unsaid. This report helps find the right words."
    },
    conflict_appease: {
      id: "Selalu mengalah bukan solusi jangka panjang. Laporan ini menunjukkan cara jujur tanpa melukai.",
      en: "Always giving in isn't a long-term solution. This report shows how to be honest without hurting."
    }
  }
};

/**
 * Get payment resistance microcopy based on user profile and trigger type
 * @param {string} triggerType - 'hover' | 'scroll_back' | 'time_delay' | 'second_visit'
 * @param {object} userData - { primaryNeed, conflictStyle }
 * @param {string} language - 'id' | 'en'
 */
export const getPaymentResistanceMicrocopy = (triggerType, userData, language = 'id') => {
  const { primaryNeed, conflictStyle } = userData;
  const result = [];
  
  // Add generic message based on trigger type
  const genericPool = [
    ...PAYMENT_RESISTANCE_MICROCOPY.price_objection[language],
    ...PAYMENT_RESISTANCE_MICROCOPY.value_reinforcement[language]
  ];
  result.push(genericPool[Math.floor(Math.random() * genericPool.length)]);
  
  // Add personalized message based on need
  if (primaryNeed && PAYMENT_RESISTANCE_MICROCOPY.by_need[primaryNeed]) {
    const needMsg = PAYMENT_RESISTANCE_MICROCOPY.by_need[primaryNeed];
    result.push(language === 'id' ? needMsg.id : needMsg.en);
  }
  
  // Add subtle urgency for time-based triggers
  if (triggerType === 'time_delay' || triggerType === 'second_visit') {
    const urgencyMsgs = PAYMENT_RESISTANCE_MICROCOPY.subtle_urgency[language];
    result.push(urgencyMsgs[Math.floor(Math.random() * urgencyMsgs.length)]);
  }
  
  // Add conflict-based message for scroll_back (shows deeper engagement)
  if (triggerType === 'scroll_back' && conflictStyle && PAYMENT_RESISTANCE_MICROCOPY.by_conflict[conflictStyle]) {
    const conflictMsg = PAYMENT_RESISTANCE_MICROCOPY.by_conflict[conflictStyle];
    result.push(language === 'id' ? conflictMsg.id : conflictMsg.en);
  }
  
  return result;
};

/**
 * Price anchoring messages
 */
export const PRICE_ANCHORING = {
  id: {
    comparison: "Harga 1 sesi konseling: Rp 300.000-500.000",
    this_report: "Laporan RELASI4™: Rp 49.000 (sekali bayar, akses selamanya)",
    savings: "Hemat 85%+ dibanding konseling"
  },
  en: {
    comparison: "1 counseling session: $30-50",
    this_report: "RELASI4™ Report: $3.49 (one-time, lifetime access)",
    savings: "Save 85%+ compared to counseling"
  }
};

/**
 * Social proof messages
 */
export const SOCIAL_PROOF_MESSAGES = {
  id: [
    "1,247 laporan dibuat bulan ini",
    "Rating 4.8/5 dari pengguna",
    "92% pengguna merekomendasikan ke pasangan",
    "Digunakan di 15 kota di Indonesia"
  ],
  en: [
    "1,247 reports created this month",
    "4.8/5 rating from users",
    "92% of users recommend to their partner",
    "Used in 15 cities in Indonesia"
  ]
};

/**
 * Trust & Safety messages (REQUIRED below pricing)
 */
export const TRUST_MESSAGES = {
  id: [
    "Jawaban Anda bersifat pribadi",
    "Laporan tidak dibagikan ke siapa pun",
    "Bukan terapi, bukan diagnosis"
  ],
  en: [
    "Your answers are private",
    "Reports are not shared with anyone",
    "Not therapy, not a diagnosis"
  ]
};

// ============================================================
// CTA GENERATOR FUNCTIONS
// ============================================================

/**
 * Get CTA content based on variant type
 * @param {string} variant - 'color' | 'psychological' | 'hybrid'
 * @param {object} userData - { primaryColor, primaryNeed, conflictStyle }
 * @param {string} language - 'id' | 'en'
 */
export const getCtaContent = (variant, userData, language = 'id') => {
  const { primaryColor, primaryNeed, conflictStyle } = userData;
  
  // Map color to key
  const colorKey = mapArchetypeToColor(primaryColor);
  const colorCopy = CTA_COPY_BY_COLOR[colorKey] || CTA_COPY_BY_COLOR.driver;
  const needCopy = CTA_BY_NEED[primaryNeed] || CTA_BY_NEED.need_control;
  const conflictMod = CONFLICT_MODIFIER[conflictStyle];
  
  switch (variant) {
    case 'color':
      return {
        headline: language === 'id' ? colorCopy.title_id : colorCopy.title_en,
        sub: language === 'id' ? colorCopy.sub_id : colorCopy.sub_en,
        cta: language === 'id' ? colorCopy.cta_id : colorCopy.cta_en,
        modifier: null,
        color: colorCopy.color,
        variant: 'color'
      };
      
    case 'psychological':
      return {
        headline: language === 'id' ? needCopy.headline_id : needCopy.headline_en,
        sub: language === 'id' ? needCopy.sub_id : needCopy.sub_en,
        cta: language === 'id' ? needCopy.cta_id : needCopy.cta_en,
        modifier: conflictMod ? (language === 'id' ? conflictMod.text_id : conflictMod.text_en) : null,
        color: needCopy.color,
        icon: needCopy.icon,
        variant: 'psychological'
      };
      
    case 'hybrid':
    default:
      // Headline from need, subline from color, modifier from conflict
      return {
        headline: language === 'id' ? needCopy.headline_id : needCopy.headline_en,
        sub: language === 'id' ? colorCopy.sub_id : colorCopy.sub_en,
        cta: language === 'id' ? needCopy.cta_id : needCopy.cta_en,
        modifier: conflictMod ? (language === 'id' ? conflictMod.text_id : conflictMod.text_en) : null,
        color: needCopy.color,
        icon: needCopy.icon,
        variant: 'hybrid'
      };
  }
};

/**
 * Get contextual hesitation microcopy
 */
export const getHesitationMicrocopy = (userData, language = 'id') => {
  const { primaryNeed, conflictStyle } = userData;
  const messages = [];
  
  // Add global message
  const globalMsgs = HESITATION_GLOBAL[language] || HESITATION_GLOBAL.id;
  messages.push(globalMsgs[Math.floor(Math.random() * globalMsgs.length)]);
  
  // Add need-based message
  if (primaryNeed && HESITATION_BY_NEED[primaryNeed]) {
    const needMsg = HESITATION_BY_NEED[primaryNeed];
    messages.push(language === 'id' ? needMsg.text_id : needMsg.text_en);
  }
  
  // Add conflict-based message
  if (conflictStyle && HESITATION_BY_CONFLICT[conflictStyle]) {
    const conflictMsg = HESITATION_BY_CONFLICT[conflictStyle];
    messages.push(language === 'id' ? conflictMsg.text_id : conflictMsg.text_en);
  }
  
  return messages;
};

/**
 * Get psychological CTA (backward compatibility)
 */
export const getPsychologicalCTA = (primaryNeed, conflictStyle, language = 'id') => {
  const needCTA = CTA_BY_NEED[primaryNeed];
  const conflictMod = CONFLICT_MODIFIER[conflictStyle];
  
  if (!needCTA) {
    return null;
  }
  
  return {
    headline: language === 'id' ? needCTA.headline_id : needCTA.headline_en,
    sub: language === 'id' ? needCTA.sub_id : needCTA.sub_en,
    cta: language === 'id' ? needCTA.cta_id : needCTA.cta_en,
    modifier: conflictMod ? (language === 'id' ? conflictMod.text_id : conflictMod.text_en) : null,
    color: needCTA.color,
    icon: needCTA.icon,
    urgency: conflictMod?.urgency || 'medium',
    variant: 'psychological',
    primaryNeed,
    conflictStyle
  };
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Teaser bullet points
 */
export const TEASER_BULLETS = {
  id: [
    "Trigger Map — apa yang bikin Anda/partner 'meledak'",
    "Needs Map — kebutuhan emosional tersembunyi",
    "Conflict Loop — pola konflik yang berulang",
    "Mode Couple & Family (Premium)"
  ],
  en: [
    "Trigger Map — what makes you/your partner 'explode'",
    "Needs Map — hidden emotional needs",
    "Conflict Loop — recurring conflict patterns",
    "Couple & Family Mode (Premium)"
  ]
};

/**
 * Map archetype names to color keys
 */
export const mapArchetypeToColor = (archetype) => {
  const mapping = {
    driver: 'driver',
    spark: 'spark',
    anchor: 'anchor',
    analyst: 'analyst',
    red: 'driver',
    yellow: 'spark',
    green: 'anchor',
    blue: 'analyst',
    color_red: 'driver',
    color_yellow: 'spark',
    color_green: 'anchor',
    color_blue: 'analyst'
  };
  return mapping[archetype?.toLowerCase()] || 'driver';
};

/**
 * A/B Test Copy Variants (legacy, for landing page)
 */
export const AB_VARIANTS = {
  soft: {
    headline_id: "Ingin memahami relasi Anda lebih dalam?",
    headline_en: "Want to understand your relationships deeper?",
    sub_id: "RELASI4™ membantu melihat pola tanpa menghakimi.",
    sub_en: "RELASI4™ helps see patterns without judgment.",
    cta_id: "Lihat RELASI4™",
    cta_en: "See RELASI4™"
  },
  aggressive: {
    headline_id: "Pola yang sama akan terulang — kecuali Anda memahaminya",
    headline_en: "The same patterns will repeat — unless you understand them",
    sub_id: "RELASI4™ menunjukkan apa yang sering luput tapi menentukan arah relasi Anda.",
    sub_en: "RELASI4™ shows what often goes unnoticed but determines your relationship direction.",
    cta_id: "Bongkar Pola Saya",
    cta_en: "Uncover My Patterns"
  }
};
