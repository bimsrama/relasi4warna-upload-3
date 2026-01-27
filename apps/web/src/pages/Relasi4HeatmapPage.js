import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage, useAuth, API } from "../App";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { 
  ArrowLeft, TrendingUp, Loader2, RefreshCw, 
  BarChart3, Map, Lightbulb, Award, Brain
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

// Need and Conflict labels
const NEED_LABELS = {
  need_control: { id: "Kontrol", en: "Control", color: "#C05640" },
  need_validation: { id: "Validasi", en: "Validation", color: "#D99E30" },
  need_harmony: { id: "Harmoni", en: "Harmony", color: "#5D8A66" },
  need_autonomy: { id: "Otonomi", en: "Autonomy", color: "#5B8FA8" }
};

const CONFLICT_LABELS = {
  conflict_attack: { id: "Menyerang", en: "Attack", color: "#C05640" },
  conflict_avoid: { id: "Menghindar", en: "Avoid", color: "#D99E30" },
  conflict_freeze: { id: "Membeku", en: "Freeze", color: "#5B8FA8" },
  conflict_appease: { id: "Menenangkan", en: "Appease", color: "#5D8A66" }
};

const Relasi4HeatmapPage = () => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [heatmapData, setHeatmapData] = useState(null);
  const [abcData, setAbcData] = useState(null);
  const [insights, setInsights] = useState(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    fetchAllData();
  }, [days]);

  const fetchAllData = async () => {
    setRefreshing(true);
    try {
      const [heatmapRes, abcRes, insightsRes] = await Promise.all([
        axios.get(`${API}/relasi4/analytics/heatmap?days=${days}`),
        axios.get(`${API}/relasi4/analytics/abc-comparison?days=${days}`),
        axios.get(`${API}/relasi4/analytics/weekly-insights`)
      ]);
      
      setHeatmapData(heatmapRes.data);
      setAbcData(abcRes.data);
      setInsights(insightsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error(t("Gagal memuat data", "Failed to load data"));
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
            <Map className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-xl font-bold mb-2">
              {t("Akses Dibatasi", "Access Restricted")}
            </h2>
            <p className="text-muted-foreground mb-4">
              {t("Halaman ini hanya untuk admin", "This page is for admins only")}
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

  // Get max volume for color intensity
  const maxVolume = heatmapData?.total_volume || 1;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <button 
            onClick={() => navigate('/relasi4/analytics')} 
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
            {t("Analytics", "Analytics")}
          </button>
          <div className="flex items-center gap-4">
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
              onClick={fetchAllData}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" style={{ fontFamily: 'Merriweather, serif' }}>
              <Map className="w-6 h-6 text-primary" />
              {t("Peta Emosional Indonesia", "Indonesia Emotional Heatmap")}
            </h1>
            <p className="text-muted-foreground">
              {t("Kebutuhan emosional & pola konflik (aggregated, non-PII)", "Emotional needs & conflict patterns (aggregated, non-PII)")}
            </p>
          </div>
        </div>

        {/* Weekly Insights */}
        {insights && (
          <Card className="mb-8 border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Lightbulb className="w-5 h-5 text-primary" />
                {t("Insight Mingguan", "Weekly Insights")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground font-medium mb-4">
                {language === 'id' ? insights.summary_id : insights.summary_en}
              </p>
              <div className="flex flex-wrap gap-2">
                {insights.insights?.map((insight, idx) => (
                  <span 
                    key={idx}
                    className="text-xs px-3 py-1.5 bg-background rounded-full border"
                  >
                    {language === 'id' ? insight.text_id : insight.text_en}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* A/B/C Test Comparison */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              {t("Perbandingan A/B/C Test", "A/B/C Test Comparison")}
              {abcData?.winner && (
                <span className="text-xs px-2 py-1 bg-green-500/10 text-green-500 rounded-full ml-2">
                  🏆 {abcData.winner.toUpperCase()} {t("Menang", "Wins")}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(abcData?.variants || {}).map(([variant, stats]) => {
                const isWinner = variant === abcData?.winner;
                const variantLabels = {
                  color: { id: "Warna", en: "Color", color: "#5B8FA8" },
                  psychological: { id: "Psikologis", en: "Psychological", color: "#D99E30" },
                  hybrid: { id: "Hybrid", en: "Hybrid", color: "#5D8A66" }
                };
                const label = variantLabels[variant] || { id: variant, en: variant, color: "#888" };
                
                return (
                  <div 
                    key={variant}
                    className={`p-4 rounded-xl border-2 ${isWinner ? 'border-green-500/50 bg-green-500/5' : 'border-transparent'}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold" style={{ color: label.color }}>
                        {language === 'id' ? label.id : label.en}
                      </span>
                      {isWinner && <span className="text-lg">🏆</span>}
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("Tampilan", "Rendered")}:</span>
                        <span className="font-bold">{stats.rendered}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("Klik", "Clicks")}:</span>
                        <span className="font-bold">{stats.clicked}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("Click Rate", "Click Rate")}:</span>
                        <span className="font-bold" style={{ color: label.color }}>{stats.click_rate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("Pembayaran", "Payment")}:</span>
                        <span className="font-bold">{stats.payment_success}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t">
                        <span className="text-muted-foreground font-medium">{t("Konversi", "Conversion")}:</span>
                        <span className={`font-bold text-lg ${isWinner ? 'text-green-500' : ''}`}>
                          {stats.conversion_rate}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Emotional Needs Heatmap */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              {t("Heatmap Kebutuhan Emosional", "Emotional Needs Heatmap")}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {t("X: Primary Need, Y: Conflict Style. Intensitas = Volume & Conversion Rate", 
                 "X: Primary Need, Y: Conflict Style. Intensity = Volume & Conversion Rate")}
            </p>
          </CardHeader>
          <CardContent>
            {heatmapData?.total_volume === 0 ? (
              <p className="text-center text-muted-foreground py-12">
                {t("Belum ada data untuk ditampilkan", "No data to display yet")}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="p-2 text-left text-xs text-muted-foreground"></th>
                      {heatmapData?.needs?.map(need => (
                        <th 
                          key={need} 
                          className="p-2 text-center text-xs font-medium"
                          style={{ color: NEED_LABELS[need]?.color }}
                        >
                          {language === 'id' ? NEED_LABELS[need]?.id : NEED_LABELS[need]?.en}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {heatmapData?.conflicts?.map(conflict => (
                      <tr key={conflict}>
                        <td 
                          className="p-2 text-xs font-medium text-right"
                          style={{ color: CONFLICT_LABELS[conflict]?.color }}
                        >
                          {language === 'id' ? CONFLICT_LABELS[conflict]?.id : CONFLICT_LABELS[conflict]?.en}
                        </td>
                        {heatmapData?.needs?.map(need => {
                          const cell = heatmapData?.heatmap?.[need]?.[conflict] || { volume: 0, rate: 0, percentage: 0 };
                          const intensity = Math.min(cell.volume / Math.max(maxVolume / 4, 1), 1);
                          const bgColor = `rgba(93, 138, 102, ${intensity * 0.8})`; // Green with varying opacity
                          
                          return (
                            <td 
                              key={`${need}-${conflict}`}
                              className="p-1"
                            >
                              <div 
                                className="rounded-lg p-3 text-center min-w-[80px] transition-all hover:scale-105"
                                style={{ 
                                  backgroundColor: cell.volume > 0 ? bgColor : 'rgba(0,0,0,0.05)',
                                  color: intensity > 0.5 ? 'white' : 'inherit'
                                }}
                                title={`Volume: ${cell.volume}, Conversion: ${cell.rate}%`}
                              >
                                <div className="text-lg font-bold">{cell.volume}</div>
                                <div className="text-xs opacity-80">{cell.rate}%</div>
                                <div className="text-xs opacity-60">{cell.percentage}%</div>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {/* Legend */}
                <div className="flex items-center justify-center gap-4 mt-6 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(93, 138, 102, 0.2)' }}></div>
                    <span>{t("Volume Rendah", "Low Volume")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(93, 138, 102, 0.5)' }}></div>
                    <span>{t("Volume Sedang", "Medium Volume")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(93, 138, 102, 0.8)' }}></div>
                    <span>{t("Volume Tinggi", "High Volume")}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Insights Interpretation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              {t("Interpretasi Strategis", "Strategic Interpretation")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-blue-500/10 rounded-xl">
                <h4 className="font-medium text-blue-700 dark:text-blue-400 mb-2">
                  {t("📊 Pola Indonesia", "📊 Indonesia Patterns")}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {t(
                    "Data ini mencerminkan kebutuhan emosional dan pola konflik pengguna Indonesia. Gunakan untuk optimasi copy CTA dan targeting.",
                    "This data reflects Indonesian users' emotional needs and conflict patterns. Use for CTA copy optimization and targeting."
                  )}
                </p>
              </div>
              
              <div className="p-4 bg-green-500/10 rounded-xl">
                <h4 className="font-medium text-green-700 dark:text-green-400 mb-2">
                  {t("💡 Rekomendasi", "💡 Recommendations")}
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• {t("Fokuskan CTA pada kebutuhan dominan", "Focus CTA on dominant needs")}</li>
                  <li>• {t("Sesuaikan urgency dengan pola konflik", "Adjust urgency based on conflict patterns")}</li>
                  <li>• {t("A/B test berbasis segmen psikologis", "A/B test based on psychological segments")}</li>
                </ul>
              </div>
              
              <div className="p-4 bg-amber-500/10 rounded-xl">
                <h4 className="font-medium text-amber-700 dark:text-amber-400 mb-2">
                  {t("⚠️ Catatan Privasi", "⚠️ Privacy Note")}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {t(
                    "Data ini aggregated dan tidak mengandung PII. Tidak ada data individual yang dapat diidentifikasi.",
                    "This data is aggregated and contains no PII. No individual data can be identified."
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Relasi4HeatmapPage;
