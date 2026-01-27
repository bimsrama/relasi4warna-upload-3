import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage, API } from "../App";
import { Button } from "./ui/button";
import { Sparkles, ArrowRight, Zap } from "lucide-react";
import axios from "axios";
import { trackRelasi4Event, getRelasi4Variant } from "../utils/relasi4Analytics";

/**
 * RELASI4™ Landing Page CTA Component
 * 
 * A secondary, less prominent CTA on the landing page to offer
 * an alternative entry point into the RELASI4™ flow.
 * 
 * Features:
 * - Feature guard: Only renders if R4T_DEEP_V1 question set exists
 * - Analytics tracking for views and clicks
 */
const Relasi4LandingCTA = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  
  const [isReady, setIsReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasTrackedView, setHasTrackedView] = useState(false);

  // Feature guard - Check if RELASI4™ backend is ready
  useEffect(() => {
    const checkRelasi4Ready = async () => {
      try {
        const response = await axios.get(`${API}/relasi4/question-sets`);
        // API returns array directly, not { question_sets: [...] }
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

  // Track view (once)
  useEffect(() => {
    if (isReady && !hasTrackedView) {
      const variant = getRelasi4Variant();
      trackRelasi4Event("relasi4_teaser_viewed", {
        entry_point: "landing_page",
        variant
      });
      setHasTrackedView(true);
    }
  }, [isReady, hasTrackedView]);

  // Handle CTA click
  const handleClick = () => {
    const variant = getRelasi4Variant();
    trackRelasi4Event("relasi4_cta_clicked", {
      entry_point: "landing_page",
      cta_location: "landing_secondary",
      variant
    });
    navigate("/relasi4");
  };

  // Don't render while loading or if not ready
  if (loading || !isReady) {
    return null;
  }

  return (
    <section className="py-12 md:py-16 px-4 md:px-8 bg-gradient-to-r from-primary/5 via-spark/5 to-anchor/5" data-testid="relasi4-landing-cta">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 md:p-8 rounded-2xl bg-background/80 backdrop-blur border border-primary/20 shadow-lg">
          {/* Icon & Badge */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-spark/20 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  RELASI4™
                </span>
                <span className="text-xs text-muted-foreground">Premium</span>
              </div>
              <h3 className="text-lg md:text-xl font-bold text-foreground" style={{ fontFamily: 'Merriweather, serif' }}>
                {t(
                  "Kenali Pola Relasi Anda Lebih Dalam",
                  "Understand Your Relationship Patterns Deeper"
                )}
              </h3>
              <p className="text-sm text-muted-foreground mt-1 hidden md:block">
                {t(
                  "Analisis AI untuk trigger, kebutuhan emosional & pola konflik",
                  "AI analysis for triggers, emotional needs & conflict patterns"
                )}
              </p>
            </div>
          </div>

          {/* CTA Button */}
          <Button 
            onClick={handleClick}
            className="btn-primary whitespace-nowrap"
            data-testid="relasi4-landing-cta-btn"
          >
            <Zap className="w-4 h-4 mr-2" />
            {t("Coba RELASI4™", "Try RELASI4™")}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Relasi4LandingCTA;
