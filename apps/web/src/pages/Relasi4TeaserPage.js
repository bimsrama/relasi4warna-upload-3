import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useLanguage, useAuth, API } from "../App";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { 
  Sparkles, Lock, ArrowRight, CheckCircle, 
  Crown, Star, Heart, Briefcase, Users, 
  TrendingUp, AlertCircle, Loader2, Share2, CreditCard, Shield,
  Link2, Copy, MessageCircle, Home, UserPlus, Clock, Lightbulb
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { 
  getPaymentResistanceMicrocopy, 
  PRICE_ANCHORING, 
  SOCIAL_PROOF_MESSAGES,
  trackRelasi4Event 
} from "../utils/relasi4Analytics";

// Color palette with i18n
const COLOR_PALETTE = {
  color_red: { hex: "#C05640", name: { id: "Merah", en: "Red" }, archetype: "Driver" },
  color_yellow: { hex: "#D99E30", name: { id: "Kuning", en: "Yellow" }, archetype: "Spark" },
  color_green: { hex: "#5D8A66", name: { id: "Hijau", en: "Green" }, archetype: "Anchor" },
  color_blue: { hex: "#5B8FA8", name: { id: "Biru", en: "Blue" }, archetype: "Analyst" }
};

// Free Teaser Page Component
const Relasi4TeaserPage = () => {
  const { t, language } = useLanguage();
  const { token } = useAuth();
  const navigate = useNavigate();
  const { assessmentId } = useParams();

  const [loading, setLoading] = useState(true);
  const [teaser, setTeaser] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [report, setReport] = useState(null);
  const [inviteLink, setInviteLink] = useState(null);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [familyGroupLink, setFamilyGroupLink] = useState(null);
  const [creatingFamily, setCreatingFamily] = useState(false);
  const [familyName, setFamilyName] = useState("");
  
  // Hesitation & Payment Resistance states
  const [showHesitation, setShowHesitation] = useState(false);
  const [hesitationMessage, setHesitationMessage] = useState(null);
  const [hesitationTrigger, setHesitationTrigger] = useState(null);
  const [hoverStartTime, setHoverStartTime] = useState(null);
  const [hasScrolledBack, setHasScrolledBack] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [visitCount, setVisitCount] = useState(1);
  const premiumCtaRef = useRef(null);
  
  // Exit Intent states
  const [showExitIntent, setShowExitIntent] = useState(false);
  const [exitIntentShown, setExitIntentShown] = useState(false);
  
  // Get user psychological profile from teaser data
  const getUserProfile = useCallback(() => {
    if (!teaser) return {};
    return {
      primaryNeed: teaser.primary_need || deriveNeedFromColor(teaser.primary_color),
      conflictStyle: teaser.primary_conflict_style || deriveConflictFromColor(teaser.primary_color)
    };
  }, [teaser]);
  
  // Derive need from color if not available
  const deriveNeedFromColor = (color) => {
    const mapping = {
      color_red: 'need_control',
      color_yellow: 'need_validation',
      color_green: 'need_harmony',
      color_blue: 'need_autonomy'
    };
    return mapping[color] || 'need_control';
  };
  
  // Derive conflict style from color if not available
  const deriveConflictFromColor = (color) => {
    const mapping = {
      color_red: 'conflict_attack',
      color_yellow: 'conflict_avoid',
      color_green: 'conflict_appease',
      color_blue: 'conflict_freeze'
    };
    return mapping[color] || 'conflict_attack';
  };

  useEffect(() => {
    fetchTeaser();
    // Load Midtrans Snap script
    loadMidtransScript();
    // Track visit count
    const storedVisits = parseInt(localStorage.getItem(`relasi4_teaser_visits_${assessmentId}`) || '0');
    const newVisitCount = storedVisits + 1;
    setVisitCount(newVisitCount);
    localStorage.setItem(`relasi4_teaser_visits_${assessmentId}`, newVisitCount.toString());
  }, [assessmentId]);
  
  // Scroll detection for "scroll back" hesitation trigger
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Detect scroll back to pricing area
      if (premiumCtaRef.current && !hasScrolledBack) {
        const ctaRect = premiumCtaRef.current.getBoundingClientRect();
        const isCtaVisible = ctaRect.top < window.innerHeight && ctaRect.bottom > 0;
        
        // User scrolled down past CTA then came back up
        if (isCtaVisible && currentScrollY < lastScrollY && lastScrollY > 500) {
          setHasScrolledBack(true);
          triggerHesitation('scroll_back');
        }
      }
      
      setLastScrollY(currentScrollY);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, hasScrolledBack]);
  
  // Time-based hesitation (show after 15 seconds if no action)
  useEffect(() => {
    if (!teaser || report) return;
    
    const timeoutId = setTimeout(() => {
      if (!showHesitation) {
        triggerHesitation('time_delay');
      }
    }, 15000); // 15 seconds
    
    return () => clearTimeout(timeoutId);
  }, [teaser, report, showHesitation]);
  
  // Second visit trigger
  useEffect(() => {
    if (visitCount >= 2 && teaser && !report && !showHesitation) {
      setTimeout(() => {
        triggerHesitation('second_visit');
      }, 3000); // Show after 3s on second+ visit
    }
  }, [visitCount, teaser, report, showHesitation]);
  
  // Trigger hesitation message
  const triggerHesitation = useCallback((trigger) => {
    if (showHesitation) return; // Don't override existing message
    
    const profile = getUserProfile();
    const messages = getPaymentResistanceMicrocopy(trigger, profile, language);
    
    if (messages.length > 0) {
      setHesitationMessage(messages[0]);
      setHesitationTrigger(trigger);
      setShowHesitation(true);
      
      // Track hesitation event
      trackRelasi4Event('relasi4_hesitation_shown', {
        trigger,
        primary_need: profile.primaryNeed,
        primary_conflict_style: profile.conflictStyle,
        visit_count: visitCount
      });
    }
  }, [showHesitation, getUserProfile, language, visitCount]);
  
  // Handle hover on pricing area (3 second hover = hesitation trigger)
  const handlePricingHover = useCallback(() => {
    if (!hoverStartTime && !showHesitation) {
      setHoverStartTime(Date.now());
      
      // Check hover duration after 3 seconds
      setTimeout(() => {
        if (hoverStartTime && !showHesitation) {
          const hoverDuration = Date.now() - hoverStartTime;
          if (hoverDuration >= 2800) { // ~3 seconds with buffer
            triggerHesitation('hover');
          }
        }
      }, 3000);
    }
  }, [hoverStartTime, showHesitation, triggerHesitation]);
  
  const handlePricingLeave = useCallback(() => {
    setHoverStartTime(null);
  }, []);
  
  // Dismiss hesitation message
  const dismissHesitation = useCallback(() => {
    setShowHesitation(false);
    setHesitationMessage(null);
    
    // Show next message after 30 seconds
    setTimeout(() => {
      if (!report) {
        const profile = getUserProfile();
        const messages = getPaymentResistanceMicrocopy('time_delay', profile, language);
        if (messages.length > 1) {
          setHesitationMessage(messages[1]); // Show different message
          setShowHesitation(true);
        }
      }
    }, 30000);
  }, [report, getUserProfile, language]);
  
  // Exit Intent Detection
  useEffect(() => {
    if (report || exitIntentShown) return; // Don't show if already purchased or shown
    
    const handleMouseLeave = (e) => {
      // Detect mouse leaving viewport from top (exit intent)
      if (e.clientY <= 0 && !exitIntentShown && !report) {
        setShowExitIntent(true);
        setExitIntentShown(true);
        
        // Track event
        trackRelasi4Event('relasi4_exit_intent_shown', {
          primary_need: teaser?.primary_need,
          primary_conflict_style: teaser?.primary_conflict_style,
          visit_count: visitCount
        });
      }
    };
    
    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, [report, exitIntentShown, teaser, visitCount]);
  
  // Get exit intent message based on user profile
  const getExitIntentMessage = useCallback(() => {
    const profile = getUserProfile();
    const primaryNeed = profile.primaryNeed;
    
    const messages = {
      need_control: {
        title: t("Tunggu sebentar!", "Wait a moment!"),
        message: t(
          "Anda terbiasa mengambil keputusan cepat. Tapi apakah Anda sudah memahami pola yang mengendalikan keputusan Anda?",
          "You're used to making quick decisions. But do you understand the patterns controlling your decisions?"
        )
      },
      need_validation: {
        title: t("Sebelum pergi...", "Before you go..."),
        message: t(
          "Anda lelah tidak dimengerti. Laporan ini bisa menjadi bahasa baru untuk menjelaskan siapa Anda.",
          "You're tired of not being understood. This report can be a new language to explain who you are."
        )
      },
      need_harmony: {
        title: t("Sebentar...", "One moment..."),
        message: t(
          "Anda selalu mengutamakan orang lain. Kapan terakhir kali Anda benar-benar memahami kebutuhan Anda sendiri?",
          "You always prioritize others. When was the last time you truly understood your own needs?"
        )
      },
      need_autonomy: {
        title: t("Satu hal lagi...", "One more thing..."),
        message: t(
          "Ruang yang Anda butuhkan bukan masalah. Tantangannya adalah menjelaskannya tanpa menyakiti orang lain.",
          "The space you need isn't a problem. The challenge is explaining it without hurting others."
        )
      }
    };
    
    return messages[primaryNeed] || messages.need_control;
  }, [getUserProfile, t]);
  
  // Dismiss exit intent
  const dismissExitIntent = useCallback(() => {
    setShowExitIntent(false);
  }, []);

  const loadMidtransScript = () => {
    const existingScript = document.getElementById('midtrans-snap');
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'midtrans-snap';
      script.src = 'https://app.sandbox.midtrans.com/snap/snap.js';
      script.setAttribute('data-client-key', 'SB-Mid-client-YOUR_KEY');
      document.body.appendChild(script);
    }
  };

  const fetchTeaser = async () => {
    try {
      const response = await axios.get(`${API}/relasi4/free-teaser/${assessmentId}`);
      setTeaser(response.data);

      // Check if report already exists
      const reportRes = await axios.get(`${API}/relasi4/reports/by-assessment/${assessmentId}`);
      if (reportRes.data.exists) {
        setReport(reportRes.data.report);
      }
    } catch (error) {
      console.error("Error fetching teaser:", error);
      toast.error(t("Gagal memuat data", "Failed to load data"));
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    setProcessing(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.post(
        `${API}/relasi4/payment/create`,
        { 
          assessment_id: assessmentId, 
          product_type: "relasi4_single",
          currency: "IDR"
        },
        { headers }
      );

      const { snap_token, redirect_url } = response.data;

      // Try Snap popup first
      if (window.snap && snap_token) {
        window.snap.pay(snap_token, {
          onSuccess: (result) => {
            toast.success(t("Pembayaran berhasil!", "Payment successful!"));
            navigate(`/relasi4/payment/finish?order_id=${response.data.payment_id}`);
          },
          onPending: (result) => {
            toast.info(t("Menunggu pembayaran...", "Awaiting payment..."));
            navigate(`/relasi4/payment/finish?order_id=${response.data.payment_id}`);
          },
          onError: (result) => {
            toast.error(t("Pembayaran gagal", "Payment failed"));
            setProcessing(false);
          },
          onClose: () => {
            toast.info(t("Pembayaran dibatalkan", "Payment cancelled"));
            setProcessing(false);
          }
        });
      } else if (redirect_url) {
        // Fallback to redirect
        window.location.href = redirect_url;
      }
    } catch (error) {
      console.error("Error creating payment:", error);
      toast.error(t("Gagal membuat pembayaran", "Failed to create payment"));
      setProcessing(false);
    }
  };

  // For demo/testing - direct generation without payment
  const handleGenerateReport = async () => {
    setGenerating(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.post(
        `${API}/relasi4/reports/generate`,
        { assessment_id: assessmentId, report_type: "SINGLE" },
        { headers }
      );

      if (response.data.success) {
        setReport(response.data.report);
        toast.success(t("Laporan berhasil dibuat!", "Report generated!"));
        navigate(`/relasi4/report/${response.data.report.report_id}`);
      }
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error(t("Gagal membuat laporan", "Failed to generate report"));
    } finally {
      setGenerating(false);
    }
  };

  // Create couple invite link
  const handleCreateCoupleInvite = async () => {
    setCreatingInvite(true);
    try {
      const response = await axios.post(
        `${API}/relasi4/couple/invite`,
        { assessment_id: assessmentId }
      );
      
      // Use the current app URL for the invite link
      const appUrl = window.location.origin;
      const inviteUrl = `${appUrl}/relasi4/couple/join/${response.data.invite_code}`;
      setInviteLink(inviteUrl);
      toast.success(t("Link undangan berhasil dibuat!", "Invite link created!"));
    } catch (error) {
      console.error("Error creating invite:", error);
      toast.error(t("Gagal membuat undangan", "Failed to create invite"));
    } finally {
      setCreatingInvite(false);
    }
  };

  const handleCopyInviteLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      toast.success(t("Link disalin!", "Link copied!"));
    }
  };

  const handleShareWhatsApp = () => {
    if (inviteLink) {
      const text = t(
        `Hai! Aku baru ambil quiz kepribadian RELASI4™. Yuk ikut juga biar kita bisa lihat seberapa cocok kita! 💕\n\n${inviteLink}`,
        `Hi! I just took the RELASI4™ personality quiz. Join me so we can see how compatible we are! 💕\n\n${inviteLink}`
      );
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  // Create family group
  const handleCreateFamilyGroup = async () => {
    setCreatingFamily(true);
    try {
      const response = await axios.post(
        `${API}/relasi4/family/create`,
        { 
          creator_assessment_id: assessmentId,
          family_name: familyName || "Keluarga Kita",
          max_members: 6
        }
      );
      
      const appUrl = window.location.origin;
      const groupUrl = `${appUrl}/relasi4/family/join/${response.data.invite_code}`;
      setFamilyGroupLink(groupUrl);
      toast.success(t("Grup keluarga berhasil dibuat!", "Family group created!"));
    } catch (error) {
      console.error("Error creating family group:", error);
      toast.error(t("Gagal membuat grup keluarga", "Failed to create family group"));
    } finally {
      setCreatingFamily(false);
    }
  };

  const handleCopyFamilyLink = () => {
    if (familyGroupLink) {
      navigator.clipboard.writeText(familyGroupLink);
      toast.success(t("Link disalin!", "Link copied!"));
    }
  };

  const handleShareFamilyWhatsApp = () => {
    if (familyGroupLink) {
      const text = t(
        `Hai keluarga! Aku baru ambil quiz kepribadian RELASI4™. Yuk ikut semua supaya kita bisa lihat dinamika keluarga kita! 🏠\n\n${familyGroupLink}`,
        `Hey family! I just took the RELASI4™ personality quiz. Join us all so we can see our family dynamics! 🏠\n\n${familyGroupLink}`
      );
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!teaser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-bold mb-2">Data Tidak Ditemukan</h2>
            <p className="text-muted-foreground mb-4">
              Assessment tidak ditemukan. Silakan ambil quiz terlebih dahulu.
            </p>
            <Button onClick={() => navigate("/relasi4")}>
              Mulai Quiz RELASI4™
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const primaryColor = COLOR_PALETTE[teaser.primary_color];
  const secondaryColor = COLOR_PALETTE[teaser.secondary_color];

  return (
    <div className="min-h-screen bg-background">
      {/* Gradient Header */}
      <div 
        className="h-48 md:h-64 relative"
        style={{
          background: `linear-gradient(135deg, ${primaryColor?.hex} 0%, ${secondaryColor?.hex} 100%)`
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white">
            <h1 className="text-3xl md:text-4xl font-bold mb-2" style={{ fontFamily: 'Merriweather, serif' }}>
              {teaser.teaser_title}
            </h1>
            <p className="text-white/80 text-lg">
              {teaser.primary_archetype_name} + {secondaryColor?.archetype}
            </p>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 md:px-8 -mt-16 relative z-10 pb-24">
        {/* Main Result Card */}
        <Card className="shadow-xl mb-8" data-testid="teaser-card">
          <CardContent className="p-6 md:p-8">
            {/* Color circles */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div 
                  className="w-20 h-20 rounded-full border-4 border-background shadow-lg"
                  style={{ backgroundColor: primaryColor?.hex }}
                />
                <div 
                  className="absolute -right-4 -bottom-1 w-14 h-14 rounded-full border-4 border-background shadow-lg"
                  style={{ backgroundColor: secondaryColor?.hex }}
                />
              </div>
            </div>

            {/* Description */}
            <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
              {teaser.teaser_description}
            </p>

            {/* Color Scores */}
            <div className="space-y-3 mb-8">
              {teaser.color_scores?.map((score) => (
                <div key={score.dimension} className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: score.color_hex }}
                  />
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span>{language === 'id' ? score.label_id : score.label_en}</span>
                      <span className="font-medium">{score.score}</span>
                    </div>
                    <div className="h-2 bg-secondary/50 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-1000"
                        style={{ 
                          width: `${Math.min(score.score * 2, 100)}%`,
                          backgroundColor: score.color_hex 
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Free Strengths Preview */}
            <div className="bg-secondary/30 rounded-xl p-6 mb-8">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                {t("Kekuatan Utamamu", "Your Main Strengths")}
              </h3>
              <ul className="space-y-2">
                {teaser.strengths_preview?.map((strength, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
              
              {/* Locked content teaser */}
              <div className="mt-4 pt-4 border-t border-secondary">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Lock className="w-4 h-4" />
                  <span className="text-sm">+2 kekuatan lainnya di laporan premium...</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Premium Upgrade CTA */}
        <Card 
          ref={premiumCtaRef}
          className="border-2 border-amber-500/30 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 shadow-xl" 
          data-testid="premium-cta"
          onMouseEnter={handlePricingHover}
          onMouseLeave={handlePricingLeave}
        >
          <CardContent className="p-6 md:p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-amber-500/20 rounded-full">
                <Crown className="w-8 h-8 text-amber-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1" style={{ fontFamily: 'Merriweather, serif' }}>
                  Laporan Premium RELASI4™
                </h3>
                <p className="text-muted-foreground">
                  {teaser.upgrade_cta}
                </p>
              </div>
            </div>
            
            {/* Hesitation/Payment Resistance Microcopy */}
            {showHesitation && hesitationMessage && !report && (
              <div 
                className="mb-6 p-4 bg-amber-100/50 dark:bg-amber-900/20 rounded-xl border-l-4 border-amber-500 animate-fade-in relative"
                data-testid="hesitation-microcopy"
              >
                <button 
                  onClick={dismissHesitation}
                  className="absolute top-2 right-2 text-amber-600/60 hover:text-amber-600 text-xs"
                >
                  ✕
                </button>
                <div className="flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                      {hesitationMessage}
                    </p>
                    {hesitationTrigger === 'second_visit' && (
                      <p className="text-xs text-amber-600/70 mt-1">
                        {t("Selamat datang kembali! Ada yang bisa kami bantu?", "Welcome back! Can we help you?")}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Price Anchoring (shown on hover/hesitation) */}
            {showHesitation && !report && (
              <div className="mb-6 grid md:grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-secondary/30 rounded-lg">
                  <p className="text-muted-foreground text-xs mb-1">{t("Perbandingan", "Comparison")}</p>
                  <p className="font-medium">{PRICE_ANCHORING[language]?.comparison}</p>
                </div>
                <div className="p-3 bg-amber-100/50 dark:bg-amber-900/20 rounded-lg border border-amber-300/50">
                  <p className="text-amber-600 text-xs mb-1">{t("Laporan Ini", "This Report")}</p>
                  <p className="font-medium text-amber-700">{PRICE_ANCHORING[language]?.this_report}</p>
                </div>
              </div>
            )}

            {/* Premium Features */}
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="flex items-start gap-3 p-4 bg-background/80 rounded-xl">
                <Heart className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Dinamika Hubungan</p>
                  <p className="text-sm text-muted-foreground">Analisis mendalam romantis, keluarga, & kerja</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-background/80 rounded-xl">
                <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Pola Konflik</p>
                  <p className="text-sm text-muted-foreground">Trigger & cara sehat meresponnya</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-background/80 rounded-xl">
                <Users className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Kebutuhan Emosional</p>
                  <p className="text-sm text-muted-foreground">Apa yang kamu butuhkan dari orang terdekat</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-background/80 rounded-xl">
                <TrendingUp className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Rekomendasi Pertumbuhan</p>
                  <p className="text-sm text-muted-foreground">3 langkah konkret untuk berkembang</p>
                </div>
              </div>
            </div>

            {/* Price & CTA */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t">
              <div>
                <p className="text-sm text-muted-foreground">Harga Spesial</p>
                <p className="text-2xl font-bold text-amber-600">
                  {teaser.report_price_formatted}
                </p>
              </div>
              
              {report ? (
                <Button 
                  size="lg"
                  onClick={() => navigate(`/relasi4/report/${report.report_id}`)}
                  className="bg-amber-500 hover:bg-amber-600 text-white"
                  data-testid="view-report-btn"
                >
                  Lihat Laporan Premium
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              ) : (
                <div className="flex flex-col gap-2 w-full md:w-auto">
                  {/* Payment button */}
                  <Button 
                    size="lg"
                    onClick={handlePurchase}
                    disabled={processing || generating}
                    className="bg-amber-500 hover:bg-amber-600 text-white w-full"
                    data-testid="purchase-report-btn"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Memproses...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-5 h-5 mr-2" />
                        Beli Laporan Premium
                      </>
                    )}
                  </Button>
                  
                  {/* Demo/test generate button (smaller) */}
                  <Button 
                    size="sm"
                    variant="ghost"
                    onClick={handleGenerateReport}
                    disabled={generating || processing}
                    className="text-xs text-muted-foreground"
                    data-testid="generate-report-btn"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        Membuat...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3 mr-1" />
                        Demo: Generate tanpa bayar
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* Trust badges */}
            <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Shield className="w-4 h-4 text-green-500" />
                <span>Pembayaran Aman</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-blue-500" />
                <span>Akses Instan</span>
              </div>
            </div>
            
            {/* Social Proof (enhanced on hesitation) */}
            {!report && (
              <div className="mt-4 pt-4 border-t border-amber-200/50">
                <div className="flex flex-wrap justify-center gap-3 text-xs text-amber-700/70">
                  {(showHesitation ? SOCIAL_PROOF_MESSAGES[language] : SOCIAL_PROOF_MESSAGES[language]?.slice(0, 2))?.map((msg, idx) => (
                    <span key={idx} className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      {msg}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Couple Compatibility Section */}
        <Card className="mt-8 border-2 border-pink-500/30 bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-950/20 dark:to-rose-950/20 shadow-xl" data-testid="couple-invite-card">
          <CardContent className="p-6 md:p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-pink-500/20 rounded-full">
                <Heart className="w-8 h-8 text-pink-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1" style={{ fontFamily: 'Merriweather, serif' }}>
                  {t("Cek Kompatibilitas Pasangan", "Check Couple Compatibility")}
                </h3>
                <p className="text-muted-foreground">
                  {t(
                    "Undang pasanganmu untuk mengikuti quiz dan lihat seberapa cocok kalian!",
                    "Invite your partner to take the quiz and see how compatible you are!"
                  )}
                </p>
              </div>
            </div>

            {inviteLink ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-background/80 rounded-xl">
                  <Link2 className="w-5 h-5 text-pink-500 flex-shrink-0" />
                  <input 
                    type="text"
                    value={inviteLink}
                    readOnly
                    className="flex-1 bg-transparent text-sm truncate outline-none"
                  />
                  <Button size="sm" variant="ghost" onClick={handleCopyInviteLink}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex gap-3">
                  <Button 
                    onClick={handleShareWhatsApp}
                    className="flex-1 bg-[#25D366] hover:bg-[#20BA59]"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    {t("Bagikan via WhatsApp", "Share via WhatsApp")}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={handleCopyInviteLink}
                    className="flex-1"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    {t("Salin Link", "Copy Link")}
                  </Button>
                </div>
              </div>
            ) : (
              <Button 
                onClick={handleCreateCoupleInvite}
                disabled={creatingInvite}
                className="w-full bg-pink-500 hover:bg-pink-600 text-white h-12"
                data-testid="create-couple-invite-btn"
              >
                {creatingInvite ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    {t("Membuat undangan...", "Creating invite...")}
                  </>
                ) : (
                  <>
                    <Heart className="w-5 h-5 mr-2" />
                    {t("Undang Pasangan", "Invite Partner")}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            )}

            <p className="text-center text-xs text-muted-foreground mt-4">
              {t(
                "Laporan pasangan gratis setelah partner mengisi quiz!",
                "Couple report is free after your partner completes the quiz!"
              )}
            </p>
          </CardContent>
        </Card>

        {/* Family Group Section */}
        <Card className="mt-6 border-2 border-green-500/30 bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 shadow-xl" data-testid="family-invite-card">
          <CardContent className="p-6 md:p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-green-500/20 rounded-full">
                <Home className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1" style={{ fontFamily: 'Merriweather, serif' }}>
                  {t("Dinamika Keluarga", "Family Dynamics")}
                </h3>
                <p className="text-muted-foreground">
                  {t(
                    "Buat grup keluarga dan lihat bagaimana kepribadian kalian berinteraksi!",
                    "Create a family group and see how your personalities interact!"
                  )}
                </p>
              </div>
            </div>

            {familyGroupLink ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-background/80 rounded-xl">
                  <Link2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <input 
                    type="text"
                    value={familyGroupLink}
                    readOnly
                    className="flex-1 bg-transparent text-sm truncate outline-none"
                  />
                  <Button size="sm" variant="ghost" onClick={handleCopyFamilyLink}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex gap-3">
                  <Button 
                    onClick={handleShareFamilyWhatsApp}
                    className="flex-1 bg-[#25D366] hover:bg-[#20BA59]"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    {t("Bagikan via WhatsApp", "Share via WhatsApp")}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={handleCopyFamilyLink}
                    className="flex-1"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    {t("Salin Link", "Copy Link")}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t("Nama Keluarga (opsional)", "Family Name (optional)")}
                  </label>
                  <input
                    type="text"
                    value={familyName}
                    onChange={(e) => setFamilyName(e.target.value)}
                    placeholder="Keluarga Kita"
                    className="w-full px-4 py-3 rounded-xl border bg-background focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>
                
                <Button 
                  onClick={handleCreateFamilyGroup}
                  disabled={creatingFamily}
                  className="w-full bg-green-500 hover:bg-green-600 text-white h-12"
                  data-testid="create-family-group-btn"
                >
                  {creatingFamily ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      {t("Membuat grup...", "Creating group...")}
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5 mr-2" />
                      {t("Buat Grup Keluarga (3-6 anggota)", "Create Family Group (3-6 members)")}
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            )}

            <p className="text-center text-xs text-muted-foreground mt-4">
              {t(
                "Minimal 3 anggota untuk menghasilkan laporan dinamika keluarga!",
                "Minimum 3 members to generate family dynamics report!"
              )}
            </p>
          </CardContent>
        </Card>

        {/* Share & Retake */}
        <div className="flex flex-wrap justify-center gap-4 mt-8">
          <Button variant="outline" className="rounded-full" data-testid="share-btn">
            <Share2 className="w-4 h-4 mr-2" />
            {t("Bagikan Hasil", "Share Result")}
          </Button>
          <Button 
            variant="outline" 
            className="rounded-full"
            onClick={() => navigate('/relasi4/leaderboard')}
            data-testid="leaderboard-btn"
          >
            🏆 {t("Lihat Leaderboard", "View Leaderboard")}
          </Button>
          <Button 
            variant="outline" 
            className="rounded-full"
            onClick={() => navigate('/relasi4')}
            data-testid="retake-btn"
          >
            {t("Ambil Quiz Lagi", "Retake Quiz")}
          </Button>
        </div>
      </main>
      
      {/* Exit Intent Modal */}
      {showExitIntent && !report && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
          data-testid="exit-intent-modal"
        >
          <div className="relative w-full max-w-lg bg-background rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Gradient Header */}
            <div 
              className="h-24 relative"
              style={{
                background: `linear-gradient(135deg, ${primaryColor?.hex} 0%, ${secondaryColor?.hex} 100%)`
              }}
            >
              <button 
                onClick={dismissExitIntent}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                data-testid="exit-intent-close"
              >
                ✕
              </button>
            </div>
            
            {/* Content */}
            <div className="p-6 text-center">
              <div 
                className="w-16 h-16 rounded-2xl mx-auto -mt-14 mb-4 flex items-center justify-center text-white text-2xl font-bold shadow-lg"
                style={{ backgroundColor: primaryColor?.hex }}
              >
                {primaryColor?.archetype?.charAt(0)}
              </div>
              
              <h3 className="text-xl font-bold mb-2" style={{ fontFamily: 'Merriweather, serif' }}>
                {getExitIntentMessage().title}
              </h3>
              
              <p className="text-muted-foreground mb-6 leading-relaxed">
                {getExitIntentMessage().message}
              </p>
              
              {/* Value Reminder */}
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-xl mb-6 text-left">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
                  {t("Yang akan Anda dapatkan:", "What you'll get:")}
                </p>
                <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-amber-500" />
                    {t("Peta konflik & cara mengatasinya", "Conflict map & how to handle it")}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-amber-500" />
                    {t("Kebutuhan emosional tersembunyi", "Hidden emotional needs")}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-amber-500" />
                    {t("Tips komunikasi spesifik untuk tipe Anda", "Communication tips for your type")}
                  </li>
                </ul>
              </div>
              
              {/* CTA Buttons */}
              <div className="flex flex-col gap-3">
                <Button 
                  onClick={() => {
                    dismissExitIntent();
                    // Scroll to premium CTA
                    premiumCtaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                  data-testid="exit-intent-cta"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  {t("Lihat Laporan Premium", "View Premium Report")} - {teaser.report_price_formatted}
                </Button>
                <Button 
                  variant="ghost"
                  onClick={dismissExitIntent}
                  className="w-full text-muted-foreground"
                  data-testid="exit-intent-dismiss"
                >
                  {t("Nanti saja, terima kasih", "Maybe later, thanks")}
                </Button>
              </div>
              
              {/* Urgency Note */}
              <p className="text-xs text-muted-foreground mt-4">
                {t(
                  "💡 Pola yang tidak dipahami akan terus terulang dalam relasi berikutnya.",
                  "💡 Patterns that aren't understood will keep repeating in future relationships."
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Relasi4TeaserPage;
