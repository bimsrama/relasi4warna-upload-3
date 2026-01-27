import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage, API } from "../App";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Sparkles, ArrowRight, CheckCircle, TrendingUp, Zap, ChevronRight, Shield, Heart, Leaf, Compass, Lock } from "lucide-react";
import axios from "axios";
import { 
  getCtaVariant, 
  trackRelasi4Event, 
  getCtaContent,
  getHesitationMicrocopy,
  TRUST_MESSAGES,
  TEASER_BULLETS,
  mapArchetypeToColor 
} from "../utils/relasi4Analytics";

/**
 * RELASI4™ Premium Teaser Component
 * 
 * A/B/C Test Implementation:
 * - Variant A (color): CTA based on primary_color
 * - Variant B (psychological): CTA based on primary_need + conflict_style
 * - Variant C (hybrid): Headline from need, subline from color, modifier from conflict
 */
const Relasi4PremiumTeaser = ({ 
  primaryArchetype, 
  primaryNeed,
  primaryConflictStyle,
  entryPoint = "result_page" 
}) => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  
  const [isReady, setIsReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ctaVariant, setCtaVariant] = useState(null);
  const [hasTrackedView, setHasTrackedView] = useState(false);
  const [showHesitation, setShowHesitation] = useState(false);
  const [hesitationTimeout, setHesitationTimeout] = useState(null);

  // Get CTA content based on variant
  const userData = {
    primaryColor: primaryArchetype,
    primaryNeed: primaryNeed,
    conflictStyle: primaryConflictStyle
  };
  
  const ctaContent = ctaVariant ? getCtaContent(ctaVariant, userData, language) : null;
  const hesitationMessages = getHesitationMicrocopy(userData, language);
  const trustMessages = TRUST_MESSAGES[language] || TRUST_MESSAGES.id;

  // Get icon based on need
  const getIcon = () => {
    if (ctaVariant === 'psychological' || ctaVariant === 'hybrid') {
      switch (primaryNeed) {
        case 'need_control': return <Shield className="w-4 h-4 mr-2" />;
        case 'need_validation': return <Heart className="w-4 h-4 mr-2" />;
        case 'need_harmony': return <Leaf className="w-4 h-4 mr-2" />;
        case 'need_autonomy': return <Compass className="w-4 h-4 mr-2" />;
        default: return <Zap className="w-4 h-4 mr-2" />;
      }
    }
    return <Zap className="w-4 h-4 mr-2" />;
  };

  // Feature guard - Check if RELASI4™ backend is ready
  useEffect(() => {
    const checkRelasi4Ready = async () => {
      try {
        const response = await axios.get(`${API}/relasi4/question-sets`);
        const sets = Array.isArray(response.data) ? response.data : (response.data?.question_sets || []);
        const hasDeepSet = sets.some(s => s.code === "R4T_DEEP_V1");
        setIsReady(hasDeepSet);
      } catch (error) {
        console.warn("RELASI4™ not available:", error.message);
        setIsReady(false);
      } finally {
        setLoading(false);
      }
    };

    checkRelasi4Ready();
  }, []);

  // Get CTA variant on mount
  useEffect(() => {
    const variant = getCtaVariant();
    setCtaVariant(variant);
  }, []);

  // Track teaser view (once)
  useEffect(() => {
    if (isReady && ctaVariant && !hasTrackedView) {
      trackRelasi4Event("relasi4_cta_rendered", {
        cta_variant: ctaVariant,
        primary_color: mapArchetypeToColor(primaryArchetype),
        primary_need: primaryNeed || null,
        primary_conflict_style: primaryConflictStyle || null,
        entry_point: entryPoint
      });
      setHasTrackedView(true);
    }
  }, [isReady, ctaVariant, hasTrackedView, primaryArchetype, primaryNeed, primaryConflictStyle, entryPoint]);

  // Show hesitation microcopy after 5-7 seconds
  useEffect(() => {
    if (isReady && !showHesitation) {
      const delay = 5000 + Math.random() * 2000; // 5-7 seconds
      const timeout = setTimeout(() => {
        setShowHesitation(true);
      }, delay);
      setHesitationTimeout(timeout);
      
      return () => clearTimeout(timeout);
    }
  }, [isReady, showHesitation]);

  // Handle CTA click
  const handleCtaClick = () => {
    trackRelasi4Event("relasi4_cta_clicked", {
      cta_variant: ctaVariant,
      primary_color: mapArchetypeToColor(primaryArchetype),
      primary_need: primaryNeed || null,
      primary_conflict_style: primaryConflictStyle || null,
      entry_point: entryPoint,
      cta_location: "result_page_teaser"
    });
    navigate("/relasi4");
  };

  // Don't render while loading or if RELASI4™ not ready
  if (loading || !isReady || !ctaContent) {
    return null;
  }

  const displayColor = ctaContent.color;
  const bullets = TEASER_BULLETS[language] || TEASER_BULLETS.id;

  return (
    <Card 
      className="mb-8 overflow-hidden animate-slide-up border-2 transition-all hover:shadow-lg"
      style={{ 
        borderColor: displayColor + "30",
        background: `linear-gradient(135deg, ${displayColor}05 0%, ${displayColor}15 100%)`
      }}
      data-testid="relasi4-premium-teaser"
    >
      <CardContent className="p-6 md:p-8">
        {/* Badge with Variant Indicator */}
        <div className="flex items-center gap-2 mb-4">
          <span 
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold text-white"
            style={{ backgroundColor: displayColor }}
          >
            <Sparkles className="w-3 h-3" />
            RELASI4™
          </span>
          <span className="text-xs text-muted-foreground font-medium px-2 py-1 bg-secondary rounded-full">
            {ctaVariant === 'psychological' ? t("Untuk Anda", "For You") :
             ctaVariant === 'hybrid' ? t("Personal", "Personal") :
             t("Premium", "Premium")}
          </span>
        </div>

        {/* Headline */}
        <h3 
          className="text-xl md:text-2xl font-bold text-foreground mb-3"
          style={{ fontFamily: 'Merriweather, serif' }}
        >
          {ctaContent.headline}
        </h3>

        {/* Subheadline */}
        <p className="text-muted-foreground mb-4">
          {ctaContent.sub}
        </p>

        {/* Conflict Style Modifier */}
        {ctaContent.modifier && (
          <div 
            className="flex items-center gap-2 p-3 rounded-lg mb-6"
            style={{ backgroundColor: displayColor + '10' }}
          >
            <div 
              className="w-1 h-full min-h-[24px] rounded-full"
              style={{ backgroundColor: displayColor }}
            />
            <p className="text-sm font-medium" style={{ color: displayColor }}>
              {ctaContent.modifier}
            </p>
          </div>
        )}

        {/* Hesitation Microcopy (appears after delay) */}
        {showHesitation && hesitationMessages.length > 0 && (
          <div className="mb-6 p-4 bg-secondary/30 rounded-lg border-l-4 border-primary/30 animate-fade-in">
            <p className="text-sm text-muted-foreground italic">
              💭 {hesitationMessages[0]}
            </p>
          </div>
        )}

        {/* Features List */}
        <div className="grid md:grid-cols-2 gap-3 mb-6">
          {bullets.map((bullet, idx) => (
            <div 
              key={idx}
              className="flex items-start gap-2 text-sm"
            >
              <CheckCircle 
                className="w-4 h-4 flex-shrink-0 mt-0.5" 
                style={{ color: displayColor }}
              />
              <span className="text-muted-foreground">{bullet}</span>
            </div>
          ))}
        </div>

        {/* Visual Element - Color Bar */}
        <div className="flex gap-1 mb-6">
          {['#C05640', '#D99E30', '#5D8A66', '#5B8FA8'].map((color, idx) => (
            <div 
              key={idx}
              className={`h-1 flex-1 rounded-full transition-all ${
                color === displayColor ? 'opacity-100 h-2' : 'opacity-40'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>

        {/* CTA Section */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Button 
            size="lg"
            onClick={handleCtaClick}
            className="w-full sm:w-auto text-white shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]"
            style={{ 
              backgroundColor: displayColor,
              '--tw-shadow-color': displayColor + '40'
            }}
            data-testid="relasi4-teaser-cta-btn"
          >
            {getIcon()}
            {ctaContent.cta}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          
          <button
            onClick={handleCtaClick}
            className="flex items-center gap-1 text-sm font-medium hover:underline"
            style={{ color: displayColor }}
            data-testid="relasi4-teaser-learn-more"
          >
            {t("Pelajari selengkapnya", "Learn more")}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Trust & Safety Messages */}
        <div className="mt-6 pt-4 border-t border-secondary/50">
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            {trustMessages.map((msg, idx) => (
              <div key={idx} className="flex items-center gap-1">
                <Lock className="w-3 h-3" />
                <span>{msg}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Trust indicator */}
        <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
          <TrendingUp className="w-3 h-3" />
          <span>
            {t(
              "Dipercaya oleh 1000+ pengguna untuk memahami dinamika relasi",
              "Trusted by 1000+ users to understand relationship dynamics"
            )}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default Relasi4PremiumTeaser;
