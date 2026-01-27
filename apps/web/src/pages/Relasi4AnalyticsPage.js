import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage, useAuth, API } from "../App";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { 
  ArrowLeft, TrendingUp, Eye, MousePointer, BarChart3, 
  Loader2, RefreshCw, PieChart, Target, Brain, Shield, Heart, Leaf, Compass, Zap
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

// Color mapping for archetypes
const COLOR_CONFIG = {
  driver: { hex: "#C05640", label: "Driver (Red)" },
  spark: { hex: "#D99E30", label: "Spark (Yellow)" },
  anchor: { hex: "#5D8A66", label: "Anchor (Green)" },
  analyst: { hex: "#5B8FA8", label: "Analyst (Blue)" }
};

// Need dimension config (Psychological CTA)
const NEED_CONFIG = {
  need_control: { 
    hex: "#C05640", 
    label_id: "Kontrol", 
    label_en: "Control",
    icon: Shield,
    emotion_id: "Kehilangan kendali, frustrasi",
    emotion_en: "Loss of control, frustration"
  },
  need_validation: { 
    hex: "#D99E30", 
    label_id: "Validasi", 
    label_en: "Validation",
    icon: Heart,
    emotion_id: "Tidak didengar, tidak dihargai",
    emotion_en: "Unheard, unappreciated"
  },
  need_harmony: { 
    hex: "#5D8A66", 
    label_id: "Harmoni", 
    label_en: "Harmony",
    icon: Leaf,
    emotion_id: "Takut konflik, lelah mengalah",
    emotion_en: "Fear of conflict, tired of giving in"
  },
  need_autonomy: { 
    hex: "#5B8FA8", 
    label_id: "Otonomi", 
    label_en: "Autonomy",
    icon: Compass,
    emotion_id: "Sesak, tertekan, butuh ruang",
    emotion_en: "Suffocated, pressured, need space"
  }
};

// Conflict style config
const CONFLICT_CONFIG = {
  conflict_attack: { 
    hex: "#C05640", 
    label_id: "Menyerang", 
    label_en: "Attack",
    urgency: "high"
  },
  conflict_avoid: { 
    hex: "#D99E30", 
    label_id: "Menghindar", 
    label_en: "Avoid",
    urgency: "medium"
  },
  conflict_freeze: { 
    hex: "#5B8FA8", 
    label_id: "Membeku", 
    label_en: "Freeze",
    urgency: "medium"
  },
  conflict_appease: { 
    hex: "#5D8A66", 
    label_id: "Menenangkan", 
    label_en: "Appease",
    urgency: "low"
  }
};

const Relasi4AnalyticsPage = () => {
  const { t, language } = useLanguage();
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    fetchAnalytics();
  }, [days]);

  const fetchAnalytics = async () => {
    try {
      setRefreshing(true);
      const response = await axios.get(`${API}/relasi4/analytics/summary?days=${days}`);
      setData(response.data);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error(t("Gagal memuat analytics", "Failed to load analytics"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Check if user is admin
  const isAdmin = user?.role === 'admin' || user?.email?.includes('admin');

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-xl font-bold mb-2">
              {t("Akses Dibatasi", "Access Restricted")}
            </h2>
            <p className="text-muted-foreground mb-4">
              {t(
                "Halaman ini hanya untuk admin",
                "This page is for admins only"
              )}
            </p>
            <Button onClick={() => navigate('/admin')}>
              {t("Ke Admin Dashboard", "Go to Admin Dashboard")}
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

  const conversionRateColor = data?.conversion_rate >= 5 
    ? "text-green-500" 
    : data?.conversion_rate >= 2 
      ? "text-yellow-500" 
      : "text-red-500";

  // Determine winning variant
  const softRate = data?.variants?.soft?.rate || 0;
  const aggressiveRate = data?.variants?.aggressive?.rate || 0;
  const winningVariant = softRate > aggressiveRate ? "soft" : "aggressive";
  const rateGap = Math.abs(softRate - aggressiveRate);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <button 
            onClick={() => navigate('/admin')} 
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
            {t("Admin", "Admin")}
          </button>
          <div className="flex items-center gap-4">
            {/* Period Selector */}
            <select 
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="px-3 py-1.5 rounded-lg border bg-background text-sm"
            >
              <option value={7}>7 {t("hari", "days")}</option>
              <option value={30}>30 {t("hari", "days")}</option>
              <option value={90}>90 {t("hari", "days")}</option>
            </select>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => navigate('/relasi4/heatmap')}
            >
              {t("🗺️ Heatmap", "🗺️ Heatmap")}
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={fetchAnalytics}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {t("Refresh", "Refresh")}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: 'Merriweather, serif' }}>
              RELASI4™ A/B Testing Analytics
            </h1>
            <p className="text-muted-foreground">
              {t(`Data ${days} hari terakhir`, `Last ${days} days data`)}
            </p>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-blue-500/10">
                  <Eye className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("Total Views", "Total Views")}</p>
                  <p className="text-2xl font-bold">{data?.total_views?.toLocaleString() || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-green-500/10">
                  <MousePointer className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("Total Clicks", "Total Clicks")}</p>
                  <p className="text-2xl font-bold">{data?.total_clicks?.toLocaleString() || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-purple-500/10">
                  <TrendingUp className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("Conversion Rate", "Conversion Rate")}</p>
                  <p className={`text-2xl font-bold ${conversionRateColor}`}>
                    {data?.conversion_rate || 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-amber-500/10">
                  <Target className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("Winning Variant", "Winning Variant")}</p>
                  <p className="text-lg font-bold capitalize">
                    {winningVariant} 
                    <span className="text-sm text-green-500 ml-1">+{rateGap.toFixed(1)}%</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* A/B Test Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Soft Variant */}
          <Card className={`border-2 ${winningVariant === 'soft' ? 'border-green-500/50' : 'border-transparent'}`}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                  Variant: SOFT
                </span>
                {winningVariant === 'soft' && (
                  <span className="text-xs px-2 py-1 bg-green-500/10 text-green-500 rounded-full">
                    🏆 {t("Menang", "Winner")}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                &ldquo;{t("Ingin memahami relasi Anda lebih dalam?", "Want to understand your relationships deeper?")}&rdquo;
              </p>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-secondary/30 rounded-xl">
                  <p className="text-xs text-muted-foreground">{t("Views", "Views")}</p>
                  <p className="text-xl font-bold">{data?.variants?.soft?.views || 0}</p>
                </div>
                <div className="p-3 bg-secondary/30 rounded-xl">
                  <p className="text-xs text-muted-foreground">{t("Clicks", "Clicks")}</p>
                  <p className="text-xl font-bold">{data?.variants?.soft?.clicks || 0}</p>
                </div>
                <div className="p-3 bg-secondary/30 rounded-xl">
                  <p className="text-xs text-muted-foreground">{t("Rate", "Rate")}</p>
                  <p className="text-xl font-bold">{data?.variants?.soft?.rate || 0}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Aggressive Variant */}
          <Card className={`border-2 ${winningVariant === 'aggressive' ? 'border-green-500/50' : 'border-transparent'}`}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  Variant: AGGRESSIVE
                </span>
                {winningVariant === 'aggressive' && (
                  <span className="text-xs px-2 py-1 bg-green-500/10 text-green-500 rounded-full">
                    🏆 {t("Menang", "Winner")}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                &ldquo;{t("Pola yang sama akan terulang — kecuali Anda memahaminya", "The same patterns will repeat — unless you understand them")}&rdquo;
              </p>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-secondary/30 rounded-xl">
                  <p className="text-xs text-muted-foreground">{t("Views", "Views")}</p>
                  <p className="text-xl font-bold">{data?.variants?.aggressive?.views || 0}</p>
                </div>
                <div className="p-3 bg-secondary/30 rounded-xl">
                  <p className="text-xs text-muted-foreground">{t("Clicks", "Clicks")}</p>
                  <p className="text-xl font-bold">{data?.variants?.aggressive?.clicks || 0}</p>
                </div>
                <div className="p-3 bg-secondary/30 rounded-xl">
                  <p className="text-xs text-muted-foreground">{t("Rate", "Rate")}</p>
                  <p className="text-xl font-bold">{data?.variants?.aggressive?.rate || 0}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* By Color Archetype */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              {t("Performa per Archetype (Warna)", "Performance by Archetype (Color)")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(data?.by_color || {}).length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {t("Belum ada data archetype", "No archetype data yet")}
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {Object.entries(data?.by_color || {}).map(([color, stats]) => {
                  const colorConfig = COLOR_CONFIG[color] || { hex: "#888", label: color };
                  return (
                    <div 
                      key={color} 
                      className="p-4 rounded-xl border-2"
                      style={{ borderColor: colorConfig.hex + '40' }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: colorConfig.hex }}
                        />
                        <span className="font-medium text-sm">{colorConfig.label}</span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Views:</span>
                          <span className="font-bold">{stats.views}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Clicks:</span>
                          <span className="font-bold">{stats.clicks}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Rate:</span>
                          <span className="font-bold" style={{ color: colorConfig.hex }}>
                            {stats.rate}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* PSYCHOLOGICAL CTA ANALYTICS */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">{t("CTA Psikologis (Need + Conflict)", "Psychological CTA (Need + Conflict)")}</h2>
            {data?.psychological_stats?.views > 0 && (
              <span className={`text-xs px-2 py-1 rounded-full ${
                data.psychological_stats.vs_color_rate > 0 
                  ? 'bg-green-500/10 text-green-500' 
                  : 'bg-red-500/10 text-red-500'
              }`}>
                {data.psychological_stats.vs_color_rate > 0 ? '+' : ''}{data.psychological_stats.vs_color_rate}% vs Color
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* By Primary Need */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  {t("Performa per Primary Need", "Performance by Primary Need")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(data?.by_need || {}).length === 0 ? (
                  <p className="text-center text-muted-foreground py-6 text-sm">
                    {t(
                      "Belum ada data need. CTA psikologis akan muncul setelah user memiliki RELASI4™ assessment.",
                      "No need data yet. Psychological CTA appears after user has RELASI4™ assessment."
                    )}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(data?.by_need || {}).map(([need, stats]) => {
                      const needConfig = NEED_CONFIG[need] || { hex: "#888", label_id: need, label_en: need };
                      const IconComponent = needConfig.icon || Zap;
                      return (
                        <div 
                          key={need} 
                          className="p-3 rounded-lg border-l-4"
                          style={{ borderColor: needConfig.hex, backgroundColor: needConfig.hex + '08' }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <IconComponent className="w-4 h-4" style={{ color: needConfig.hex }} />
                              <span className="font-medium text-sm">
                                {language === 'id' ? needConfig.label_id : needConfig.label_en}
                              </span>
                            </div>
                            <span className="text-lg font-bold" style={{ color: needConfig.hex }}>
                              {stats.rate}%
                            </span>
                          </div>
                          <div className="flex gap-4 text-xs text-muted-foreground">
                            <span>Views: {stats.views}</span>
                            <span>Clicks: {stats.clicks}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            &ldquo;{language === 'id' ? needConfig.emotion_id : needConfig.emotion_en}&rdquo;
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* By Conflict Style */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  {t("Performa per Conflict Style", "Performance by Conflict Style")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(data?.by_conflict_style || {}).length === 0 ? (
                  <p className="text-center text-muted-foreground py-6 text-sm">
                    {t(
                      "Belum ada data conflict style. Modifier akan muncul berdasarkan gaya konflik user.",
                      "No conflict style data yet. Modifier appears based on user's conflict style."
                    )}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(data?.by_conflict_style || {}).map(([style, stats]) => {
                      const styleConfig = CONFLICT_CONFIG[style] || { hex: "#888", label_id: style, label_en: style };
                      return (
                        <div 
                          key={style} 
                          className="p-3 rounded-lg border-l-4"
                          style={{ borderColor: styleConfig.hex, backgroundColor: styleConfig.hex + '08' }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: styleConfig.hex }}
                              />
                              <span className="font-medium text-sm">
                                {language === 'id' ? styleConfig.label_id : styleConfig.label_en}
                              </span>
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                styleConfig.urgency === 'high' ? 'bg-red-100 text-red-600' :
                                styleConfig.urgency === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                                'bg-green-100 text-green-600'
                              }`}>
                                {styleConfig.urgency}
                              </span>
                            </div>
                            <span className="text-lg font-bold" style={{ color: styleConfig.hex }}>
                              {stats.rate}%
                            </span>
                          </div>
                          <div className="flex gap-4 text-xs text-muted-foreground">
                            <span>Views: {stats.views}</span>
                            <span>Clicks: {stats.clicks}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* By Entry Point */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              {t("Performa per Entry Point", "Performance by Entry Point")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(data?.by_entry_point || {}).length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {t("Belum ada data entry point", "No entry point data yet")}
              </p>
            ) : (
              <div className="space-y-3">
                {Object.entries(data?.by_entry_point || {}).map(([entry, stats]) => (
                  <div 
                    key={entry} 
                    className="flex items-center gap-4 p-4 bg-secondary/20 rounded-xl"
                  >
                    <div className="flex-1">
                      <p className="font-medium capitalize">{entry.replace(/_/g, ' ')}</p>
                      <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                        <span>Views: {stats.views}</span>
                        <span>Clicks: {stats.clicks}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-xl font-bold ${stats.rate >= 5 ? 'text-green-500' : stats.rate >= 2 ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                        {stats.rate}%
                      </p>
                      <p className="text-xs text-muted-foreground">conversion</p>
                    </div>
                    {/* Progress bar */}
                    <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${Math.min(stats.rate * 10, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle>{t("Rekomendasi", "Recommendations")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {rateGap > 2 && (
                <div className="p-4 bg-green-500/10 rounded-xl">
                  <p className="font-medium text-green-700 dark:text-green-400">
                    ✅ {t(
                      `Variant "${winningVariant}" menunjukkan performa ${rateGap.toFixed(1)}% lebih baik. Pertimbangkan untuk menjadikannya sebagai default.`,
                      `Variant "${winningVariant}" shows ${rateGap.toFixed(1)}% better performance. Consider making it the default.`
                    )}
                  </p>
                </div>
              )}
              
              {data?.conversion_rate < 2 && (
                <div className="p-4 bg-amber-500/10 rounded-xl">
                  <p className="font-medium text-amber-700 dark:text-amber-400">
                    ⚠️ {t(
                      "Conversion rate masih rendah (<2%). Pertimbangkan untuk mengoptimasi copy CTA atau posisi teaser.",
                      "Conversion rate is still low (<2%). Consider optimizing CTA copy or teaser position."
                    )}
                  </p>
                </div>
              )}
              
              {Object.entries(data?.by_color || {}).some(([_, stats]) => stats.rate > 10) && (
                <div className="p-4 bg-blue-500/10 rounded-xl">
                  <p className="font-medium text-blue-700 dark:text-blue-400">
                    💡 {t(
                      "Beberapa archetype menunjukkan conversion rate tinggi. Personalisasi lebih lanjut bisa meningkatkan keseluruhan conversion.",
                      "Some archetypes show high conversion rates. Further personalization could improve overall conversion."
                    )}
                  </p>
                </div>
              )}
              
              {Object.keys(data?.by_color || {}).length === 0 && data?.total_views > 0 && (
                <div className="p-4 bg-secondary/50 rounded-xl">
                  <p className="text-muted-foreground">
                    ℹ️ {t(
                      "Data archetype masih kosong karena teaser hanya muncul di result page (setelah user selesai quiz).",
                      "Archetype data is empty because the teaser only appears on result page (after user completes quiz)."
                    )}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Relasi4AnalyticsPage;
