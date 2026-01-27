/**
 * RELASI4™ Premium Teaser Component
 * Upsell component for Relasi4Warna result page
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage, API } from "../App";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Crown, Sparkles, ArrowRight, CheckCircle, Zap, Heart, Users, AlertTriangle } from "lucide-react";
import axios from "axios";
import {
  getRelasi4Variant,
  trackRelasi4Event,
  CTA_COPY_BY_COLOR,
  AB_VARIANTS,
  TEASER_BULLETS,
  mapArchetypeToColor
} from "../utils/relasi4Analytics";

const Relasi4Teaser = ({ primaryArchetype, entryPoint = "result_page" }) => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  
  const [isAvailable, setIsAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [variant, setVariant] = useState('soft');

  // Check if RELASI4™ is available
  useEffect(() => {
    const checkAvailability = async () => {
      try {
        const response = await axios.get(`${API}/relasi4/question-sets`);
        const hasDeepV1 = response.data?.some(set => set.code === 'R4T_DEEP_V1');
        setIsAvailable(hasDeepV1);
        
        if (hasDeepV1) {
          const v = getRelasi4Variant();
          setVariant(v);
          
          // Track teaser viewed
          trackRelasi4Event('relasi4_teaser_viewed', {
            variant: v,
            primary_color: mapArchetypeToColor(primaryArchetype),
            entry_point: entryPoint
          });
        }
      } catch (error) {
        console.warn('RELASI4 not available:', error);
        setIsAvailable(false);
      } finally {
        setLoading(false);
      }
    };

    checkAvailability();
  }, [primaryArchetype, entryPoint]);

  const handleCtaClick = () => {
    const colorKey = mapArchetypeToColor(primaryArchetype);
    
    // Track CTA click
    trackRelasi4Event('relasi4_cta_clicked', {
      variant,
      primary_color: colorKey,
      entry_point: entryPoint
    });

    // Navigate to RELASI4™
    navigate('/relasi4/R4T_DEEP_V1');
  };

  // Don't render if not available or still loading
  if (loading || !isAvailable) {
    return null;
  }

  const colorKey = mapArchetypeToColor(primaryArchetype);
  const colorCopy = CTA_COPY_BY_COLOR[colorKey] || CTA_COPY_BY_COLOR.driver;
  const variantCopy = AB_VARIANTS[variant];
  const bullets = TEASER_BULLETS[language] || TEASER_BULLETS.id;

  return (
    <Card 
      className="mt-8 overflow-hidden border-2 animate-slide-up"
      style={{ borderColor: `${colorCopy.color}40` }}
      data-testid="relasi4-teaser"
    >
      {/* Premium Badge Header */}
      <div 
        className="px-6 py-3 flex items-center justify-between"
        style={{ backgroundColor: `${colorCopy.color}15` }}
      >
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5" style={{ color: colorCopy.color }} />
          <span 
            className="text-sm font-bold uppercase tracking-wider"
            style={{ color: colorCopy.color }}
          >
            Premium
          </span>
        </div>
        <Sparkles className="w-5 h-5 text-amber-500" />
      </div>

      <CardContent className="p-6 md:p-8">
        {/* Personalized Title */}
        <h3 
          className="text-xl md:text-2xl font-bold mb-3"
          style={{ fontFamily: 'Merriweather, serif', color: colorCopy.color }}
        >
          🔍 {language === 'id' ? colorCopy.title_id : colorCopy.title_en}
        </h3>

        {/* Personalized Subtitle */}
        <p className="text-muted-foreground mb-6">
          {language === 'id' ? colorCopy.sub_id : colorCopy.sub_en}
        </p>

        {/* A/B Variant Message */}
        <div 
          className="p-4 rounded-xl mb-6"
          style={{ backgroundColor: `${colorCopy.color}08` }}
        >
          <p className="font-medium text-foreground mb-1">
            {language === 'id' ? variantCopy.headline_id : variantCopy.headline_en}
          </p>
          <p className="text-sm text-muted-foreground">
            {language === 'id' ? variantCopy.sub_id : variantCopy.sub_en}
          </p>
        </div>

        {/* Teaser Bullets */}
        <div className="space-y-3 mb-6">
          {bullets.map((bullet, index) => (
            <div key={index} className="flex items-start gap-3">
              <div 
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ backgroundColor: `${colorCopy.color}20` }}
              >
                {index === 0 && <Zap className="w-3 h-3" style={{ color: colorCopy.color }} />}
                {index === 1 && <Heart className="w-3 h-3" style={{ color: colorCopy.color }} />}
                {index === 2 && <AlertTriangle className="w-3 h-3" style={{ color: colorCopy.color }} />}
                {index === 3 && <Users className="w-3 h-3" style={{ color: colorCopy.color }} />}
              </div>
              <span className="text-sm text-foreground">{bullet}</span>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <Button 
          onClick={handleCtaClick}
          className="w-full h-12 text-white font-bold rounded-xl group"
          style={{ backgroundColor: colorCopy.color }}
          data-testid="relasi4-cta-btn"
        >
          {language === 'id' ? colorCopy.cta_id : colorCopy.cta_en}
          <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
        </Button>

        {/* Trust Badge */}
        <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span>{t("Hasil Relasi4Warna Anda tetap tersimpan", "Your Relasi4Warna result is safely saved")}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default Relasi4Teaser;
