import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage, useAuth, API } from "../App";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { 
  ArrowLeft, TrendingUp, TrendingDown, Minus, History,
  Loader2, BarChart3, ArrowRight, Lock, Calendar, 
  ChevronDown, ChevronUp, Eye, Sparkles, RefreshCw
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

// Color palette with full metadata
const COLOR_PALETTE = {
  color_red: { 
    hex: "#C05640", 
    light: "#FEE2E2",
    name: "Merah", 
    name_en: "Red",
    archetype: "Driver",
    trait: "Tegas & Berorientasi Hasil",
    trait_en: "Assertive & Result-Oriented"
  },
  color_yellow: { 
    hex: "#D99E30", 
    light: "#FEF3C7",
    name: "Kuning", 
    name_en: "Yellow",
    archetype: "Spark",
    trait: "Ekspresif & Antusias",
    trait_en: "Expressive & Enthusiastic"
  },
  color_green: { 
    hex: "#5D8A66", 
    light: "#D1FAE5",
    name: "Hijau", 
    name_en: "Green",
    archetype: "Anchor",
    trait: "Stabil & Harmonis",
    trait_en: "Stable & Harmonious"
  },
  color_blue: { 
    hex: "#5B8FA8", 
    light: "#DBEAFE",
    name: "Biru", 
    name_en: "Blue",
    archetype: "Analyst",
    trait: "Analitis & Sistematis",
    trait_en: "Analytical & Systematic"
  }
};

// Score bar component
const ScoreBar = ({ color, score, maxScore = 100, showLabel = true }) => {
  const colorData = COLOR_PALETTE[color];
  const percentage = Math.min((score / maxScore) * 100, 100);
  
  return (
    <div className="flex items-center gap-2">
      {showLabel && (
        <div 
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: colorData?.hex }}
        />
      )}
      <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-500"
          style={{ 
            width: `${percentage}%`,
            backgroundColor: colorData?.hex 
          }}
        />
      </div>
      <span className="text-xs font-medium w-8 text-right">{score}</span>
    </div>
  );
};

// Timeline dot component
const TimelineDot = ({ color, isFirst, isLast, isSelected }) => {
  const colorData = COLOR_PALETTE[color];
  
  return (
    <div className="flex flex-col items-center">
      {!isFirst && <div className="w-0.5 h-4 bg-border" />}
      <div 
        className={`w-4 h-4 rounded-full border-2 transition-all ${
          isSelected ? 'ring-2 ring-offset-2 ring-purple-500' : ''
        }`}
        style={{ 
          backgroundColor: colorData?.hex,
          borderColor: colorData?.hex
        }}
      />
      {!isLast && <div className="w-0.5 h-4 bg-border" />}
    </div>
  );
};

// Trend indicator
const TrendIndicator = ({ before, after }) => {
  const change = after - before;
  const isPositive = change > 0;
  const isNeutral = change === 0;
  
  if (isNeutral) {
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  }
  
  return (
    <div className={`flex items-center gap-0.5 text-xs font-bold ${
      isPositive ? 'text-green-600' : 'text-red-500'
    }`}>
      {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {isPositive ? '+' : ''}{change}
    </div>
  );
};

const Relasi4ProgressPage = () => {
  const { t, language } = useLanguage();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    fetchHistory();
  }, [token]);

  const fetchHistory = async () => {
    try {
      const response = await axios.get(`${API}/relasi4/assessments/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistory(response.data.assessments || []);
      
      // Auto-select first two if available
      if (response.data.assessments?.length >= 2) {
        setSelectedIds([
          response.data.assessments[1].assessment_id,
          response.data.assessments[0].assessment_id
        ]);
      }
    } catch (error) {
      console.error("Error fetching history:", error);
      toast.error(t("Gagal memuat riwayat", "Failed to load history"));
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = async () => {
    if (selectedIds.length !== 2) {
      toast.error(t("Pilih 2 assessment untuk dibandingkan", "Select 2 assessments to compare"));
      return;
    }

    setComparing(true);
    try {
      const response = await axios.get(
        `${API}/relasi4/assessments/compare/${selectedIds[0]}/${selectedIds[1]}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setComparison(response.data);
    } catch (error) {
      console.error("Error comparing:", error);
      toast.error(t("Gagal membandingkan", "Failed to compare"));
    } finally {
      setComparing(false);
    }
  };

  const toggleSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
      setComparison(null);
    } else if (selectedIds.length < 2) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds([selectedIds[1], id]);
      setComparison(null);
    }
  };

  // Calculate progress summary
  const progressSummary = useMemo(() => {
    if (history.length < 2) return null;
    
    const latest = history[0];
    const oldest = history[history.length - 1];
    
    const colorChanges = Object.keys(COLOR_PALETTE).map(color => ({
      color,
      before: oldest.color_scores?.[color] || 0,
      after: latest.color_scores?.[color] || 0,
      change: (latest.color_scores?.[color] || 0) - (oldest.color_scores?.[color] || 0)
    }));
    
    const dominantChanged = latest.primary_color !== oldest.primary_color;
    const totalAssessments = history.length;
    const timeSpan = Math.ceil(
      (new Date(latest.calculated_at) - new Date(oldest.calculated_at)) / (1000 * 60 * 60 * 24)
    );
    
    return { colorChanges, dominantChanged, totalAssessments, timeSpan };
  }, [history]);

  // Not logged in
  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <Lock className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-bold mb-2">
              {t("Login Diperlukan", "Login Required")}
            </h2>
            <p className="text-muted-foreground mb-6">
              {t(
                "Masuk untuk melihat progress dan riwayat assessment",
                "Sign in to view your progress and assessment history"
              )}
            </p>
            <Button onClick={() => navigate('/login')} className="w-full">
              {t("Masuk", "Sign In")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            data-testid="back-btn"
          >
            <ArrowLeft className="w-5 h-5" />
            {t("Kembali", "Back")}
          </button>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-purple-500" />
            <span className="font-medium">{t("Progress Saya", "My Progress")}</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-2" style={{ fontFamily: 'Merriweather, serif' }}>
            {t("Riwayat & Progress", "History & Progress")}
          </h1>
          <p className="text-muted-foreground">
            {t(
              "Lacak perkembangan kepribadianmu dari waktu ke waktu",
              "Track your personality development over time"
            )}
          </p>
        </div>

        {history.length === 0 ? (
          /* Empty State */
          <Card>
            <CardContent className="p-12 text-center">
              <BarChart3 className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-bold mb-2">
                {t("Belum Ada Riwayat", "No History Yet")}
              </h3>
              <p className="text-muted-foreground mb-6">
                {t(
                  "Ambil quiz RELASI4™ untuk mulai tracking progress kepribadianmu",
                  "Take the RELASI4™ quiz to start tracking your personality progress"
                )}
              </p>
              <Button onClick={() => navigate('/relasi4')} data-testid="start-quiz-btn">
                <Sparkles className="w-4 h-4 mr-2" />
                {t("Mulai Quiz", "Start Quiz")}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Progress Summary Card */}
            {progressSummary && (
              <Card className="border-purple-500/30 bg-gradient-to-br from-purple-50/50 to-indigo-50/50 dark:from-purple-950/20 dark:to-indigo-950/20">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingUp className="w-5 h-5 text-purple-500" />
                    {t("Ringkasan Progress", "Progress Summary")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Stats Row */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-3 bg-background/60 rounded-xl">
                      <p className="text-2xl font-bold text-purple-600">{progressSummary.totalAssessments}</p>
                      <p className="text-xs text-muted-foreground">{t("Quiz Diambil", "Quizzes Taken")}</p>
                    </div>
                    <div className="text-center p-3 bg-background/60 rounded-xl">
                      <p className="text-2xl font-bold text-purple-600">{progressSummary.timeSpan}</p>
                      <p className="text-xs text-muted-foreground">{t("Hari", "Days")}</p>
                    </div>
                    <div className="text-center p-3 bg-background/60 rounded-xl">
                      <p className="text-2xl font-bold text-purple-600">
                        {progressSummary.dominantChanged ? "🔄" : "✓"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {progressSummary.dominantChanged 
                          ? t("Berubah", "Changed") 
                          : t("Konsisten", "Consistent")}
                      </p>
                    </div>
                  </div>
                  
                  {/* Color Progress Bars */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      {t("Perubahan Score (Awal → Terkini)", "Score Changes (First → Latest)")}
                    </p>
                    {progressSummary.colorChanges.map(({ color, before, after, change }) => (
                      <div key={color} className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: COLOR_PALETTE[color]?.hex }}
                        >
                          {COLOR_PALETTE[color]?.archetype?.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">
                              {COLOR_PALETTE[color]?.archetype}
                            </span>
                            <TrendIndicator before={before} after={after} />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-6">{before}</span>
                            <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div 
                                className="h-full rounded-full transition-all"
                                style={{ 
                                  width: `${Math.min(after, 100)}%`,
                                  backgroundColor: COLOR_PALETTE[color]?.hex
                                }}
                              />
                            </div>
                            <span className="text-xs font-bold w-6">{after}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Comparison Section */}
            {comparison && (
              <Card className="border-indigo-500/30 overflow-hidden" data-testid="comparison-result">
                <CardHeader className="bg-indigo-50 dark:bg-indigo-950/30 border-b">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <RefreshCw className="w-5 h-5 text-indigo-500" />
                    {t("Hasil Perbandingan", "Comparison Result")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {/* Before vs After Visual */}
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    {/* Before */}
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">
                        {t("Sebelum", "Before")}
                      </p>
                      <div 
                        className="w-16 h-16 mx-auto rounded-2xl mb-3 flex items-center justify-center text-white text-2xl font-bold shadow-lg"
                        style={{ backgroundColor: COLOR_PALETTE[comparison.assessment_before?.primary_color]?.hex }}
                      >
                        {COLOR_PALETTE[comparison.assessment_before?.primary_color]?.archetype?.charAt(0)}
                      </div>
                      <p className="font-bold text-lg">
                        {COLOR_PALETTE[comparison.assessment_before?.primary_color]?.archetype}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(comparison.assessment_before?.date).toLocaleDateString('id-ID', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </p>
                    </div>
                    
                    {/* Arrow */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex">
                      <ArrowRight className="w-8 h-8 text-muted-foreground" />
                    </div>
                    
                    {/* After */}
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">
                        {t("Sesudah", "After")}
                      </p>
                      <div 
                        className="w-16 h-16 mx-auto rounded-2xl mb-3 flex items-center justify-center text-white text-2xl font-bold shadow-lg"
                        style={{ backgroundColor: COLOR_PALETTE[comparison.assessment_after?.primary_color]?.hex }}
                      >
                        {COLOR_PALETTE[comparison.assessment_after?.primary_color]?.archetype?.charAt(0)}
                      </div>
                      <p className="font-bold text-lg">
                        {COLOR_PALETTE[comparison.assessment_after?.primary_color]?.archetype}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(comparison.assessment_after?.date).toLocaleDateString('id-ID', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Detailed Changes */}
                  <div className="space-y-2">
                    {comparison.color_changes?.map(change => {
                      const colorData = COLOR_PALETTE[change.dimension];
                      return (
                        <div 
                          key={change.dimension} 
                          className="flex items-center gap-3 p-3 bg-secondary/30 rounded-xl"
                        >
                          <div 
                            className="w-10 h-10 rounded-xl flex-shrink-0"
                            style={{ backgroundColor: colorData?.hex }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{colorData?.archetype}</p>
                            <p className="text-xs text-muted-foreground">
                              {language === 'id' ? colorData?.trait : colorData?.trait_en}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">{change.before}</span>
                            <ArrowRight className="w-3 h-3 text-muted-foreground" />
                            <span className="font-bold">{change.after}</span>
                          </div>
                          <TrendIndicator before={change.before} after={change.after} />
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary Badge */}
                  <div className={`mt-6 p-4 rounded-xl text-center ${
                    comparison.primary_color_changed 
                      ? 'bg-amber-100 dark:bg-amber-900/30'
                      : 'bg-green-100 dark:bg-green-900/30'
                  }`}>
                    <p className={`font-medium ${
                      comparison.primary_color_changed 
                        ? 'text-amber-700 dark:text-amber-400'
                        : 'text-green-700 dark:text-green-400'
                    }`}>
                      {comparison.primary_color_changed 
                        ? `🔄 ${t("Perubahan signifikan! Tipe dominan berubah.", "Significant shift! Dominant type changed.")}`
                        : `✅ ${t("Konsistensi terjaga. Tipe dominan tetap sama.", "Consistency maintained. Dominant type unchanged.")}`
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Selection Instructions */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 p-4 bg-secondary/30 rounded-xl">
              <div>
                <p className="font-medium">
                  {t("Bandingkan Assessment", "Compare Assessments")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t(
                    `Pilih 2 assessment untuk melihat perubahan (${selectedIds.length}/2 dipilih)`,
                    `Select 2 assessments to see changes (${selectedIds.length}/2 selected)`
                  )}
                </p>
              </div>
              <Button 
                onClick={handleCompare}
                disabled={selectedIds.length !== 2 || comparing}
                className="w-full md:w-auto"
                data-testid="compare-btn"
              >
                {comparing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                {t("Bandingkan", "Compare")}
              </Button>
            </div>

            {/* History Timeline */}
            <div className="space-y-0">
              {history.map((assessment, index) => {
                const primaryColor = COLOR_PALETTE[assessment.primary_color];
                const secondaryColor = COLOR_PALETTE[assessment.secondary_color];
                const isSelected = selectedIds.includes(assessment.assessment_id);
                const isExpanded = expandedId === assessment.assessment_id;
                const isFirst = index === 0;
                const isLast = index === history.length - 1;
                
                return (
                  <div key={assessment.assessment_id} className="flex gap-4">
                    {/* Timeline */}
                    <div className="hidden md:flex flex-col items-center pt-6">
                      <TimelineDot 
                        color={assessment.primary_color}
                        isFirst={isFirst}
                        isLast={isLast}
                        isSelected={isSelected}
                      />
                    </div>
                    
                    {/* Card */}
                    <Card 
                      className={`flex-1 mb-3 transition-all cursor-pointer ${
                        isSelected 
                          ? 'ring-2 ring-purple-500 shadow-lg' 
                          : 'hover:shadow-md'
                      }`}
                      data-testid={`history-item-${index}`}
                    >
                      <CardContent className="p-4">
                        {/* Main Row */}
                        <div 
                          className="flex items-center gap-4"
                          onClick={() => toggleSelect(assessment.assessment_id)}
                        >
                          {/* Color Badge */}
                          <div 
                            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-md flex-shrink-0"
                            style={{ backgroundColor: primaryColor?.hex }}
                          >
                            {primaryColor?.archetype?.charAt(0)}
                            {secondaryColor && (
                              <span 
                                className="text-xs opacity-80"
                                style={{ color: secondaryColor?.hex }}
                              >
                                {secondaryColor?.archetype?.charAt(0)}
                              </span>
                            )}
                          </div>
                          
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-bold truncate">{primaryColor?.archetype}</p>
                              {isFirst && (
                                <span className="px-2 py-0.5 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-full">
                                  {t("Terbaru", "Latest")}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(assessment.calculated_at).toLocaleDateString('id-ID', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </div>
                          </div>
                          
                          {/* Mini Scores */}
                          <div className="hidden sm:flex gap-1">
                            {Object.entries(assessment.color_scores || {})
                              .sort(([,a], [,b]) => b - a)
                              .map(([color, score]) => (
                                <div 
                                  key={color}
                                  className="w-7 h-7 rounded-lg text-xs flex items-center justify-center text-white font-medium"
                                  style={{ backgroundColor: COLOR_PALETTE[color]?.hex }}
                                  title={`${COLOR_PALETTE[color]?.archetype}: ${score}`}
                                >
                                  {score}
                                </div>
                              ))}
                          </div>
                          
                          {/* Selection Indicator */}
                          {isSelected && (
                            <div className="w-7 h-7 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm font-bold">
                              {selectedIds.indexOf(assessment.assessment_id) + 1}
                            </div>
                          )}
                          
                          {/* Expand Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedId(isExpanded ? null : assessment.assessment_id);
                            }}
                            className="p-2 hover:bg-secondary rounded-lg transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        
                        {/* Expanded Details */}
                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t space-y-4 animate-in slide-in-from-top-2">
                            {/* All Scores */}
                            <div>
                              <p className="text-sm font-medium mb-3">
                                {t("Detail Skor", "Score Details")}
                              </p>
                              <div className="space-y-2">
                                {Object.entries(assessment.color_scores || {})
                                  .sort(([,a], [,b]) => b - a)
                                  .map(([color, score]) => (
                                    <div key={color} className="flex items-center gap-3">
                                      <div 
                                        className="w-6 h-6 rounded-lg flex-shrink-0"
                                        style={{ backgroundColor: COLOR_PALETTE[color]?.hex }}
                                      />
                                      <span className="text-sm w-16">{COLOR_PALETTE[color]?.archetype}</span>
                                      <ScoreBar color={color} score={score} showLabel={false} />
                                    </div>
                                  ))}
                              </div>
                            </div>
                            
                            {/* Needs & Conflict */}
                            {(assessment.primary_need || assessment.primary_conflict_style) && (
                              <div className="grid grid-cols-2 gap-3">
                                {assessment.primary_need && (
                                  <div className="p-3 bg-secondary/30 rounded-xl">
                                    <p className="text-xs text-muted-foreground mb-1">
                                      {t("Kebutuhan Utama", "Primary Need")}
                                    </p>
                                    <p className="text-sm font-medium capitalize">
                                      {assessment.primary_need?.replace('need_', '').replace('_', ' ')}
                                    </p>
                                  </div>
                                )}
                                {assessment.primary_conflict_style && (
                                  <div className="p-3 bg-secondary/30 rounded-xl">
                                    <p className="text-xs text-muted-foreground mb-1">
                                      {t("Gaya Konflik", "Conflict Style")}
                                    </p>
                                    <p className="text-sm font-medium capitalize">
                                      {assessment.primary_conflict_style?.replace('conflict_', '').replace('_', ' ')}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {/* View Report Button */}
                            {assessment.has_report && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => navigate(`/relasi4/report/${assessment.report_id}`)}
                                className="w-full"
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                {t("Lihat Laporan", "View Report")}
                              </Button>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>

            {/* Take New Quiz CTA */}
            <div className="text-center pt-6 border-t">
              <p className="text-muted-foreground mb-4">
                {t(
                  "Ambil quiz lagi untuk melihat perkembangan kepribadianmu",
                  "Take the quiz again to see how your personality develops"
                )}
              </p>
              <Button 
                onClick={() => navigate('/relasi4')} 
                variant="outline"
                data-testid="new-quiz-btn"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {t("Ambil Quiz Baru", "Take New Quiz")}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Relasi4ProgressPage;
