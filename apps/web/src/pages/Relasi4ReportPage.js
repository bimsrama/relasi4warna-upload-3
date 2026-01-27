import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useLanguage, useAuth, API } from "../App";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { 
  Sparkles, ArrowLeft, CheckCircle, Download, Share2,
  Heart, Briefcase, Users, TrendingUp, AlertTriangle,
  Lightbulb, Target, Star, Loader2, Crown, FileText
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import Relasi4PdfGenerator from "../utils/Relasi4PdfGenerator";

// Color palette with i18n
const COLOR_PALETTE = {
  color_red: { hex: "#C05640", name: { id: "Merah", en: "Red" }, archetype: "Driver" },
  color_yellow: { hex: "#D99E30", name: { id: "Kuning", en: "Yellow" }, archetype: "Spark" },
  color_green: { hex: "#5D8A66", name: { id: "Hijau", en: "Green" }, archetype: "Anchor" },
  color_blue: { hex: "#5B8FA8", name: { id: "Biru", en: "Blue" }, archetype: "Analyst" }
};

// Section component
const ReportSection = ({ icon: Icon, title, children, color }) => (
  <Card className="mb-6 overflow-hidden">
    <div className="h-1" style={{ backgroundColor: color || '#4A3B32' }} />
    <CardHeader className="pb-2">
      <CardTitle className="flex items-center gap-2 text-lg">
        <Icon className="w-5 h-5" style={{ color: color || '#4A3B32' }} />
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

// Premium Report Page Component
const Relasi4ReportPage = () => {
  const { t, language } = useLanguage();
  const { token } = useAuth();
  const navigate = useNavigate();
  const { reportId } = useParams();
  const reportRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    fetchReport();
  }, [reportId]);

  const fetchReport = async () => {
    try {
      const response = await axios.get(`${API}/relasi4/reports/${reportId}`);
      setReport(response.data);
    } catch (error) {
      console.error("Error fetching report:", error);
      toast.error(t("Gagal memuat laporan", "Failed to load report"));
      navigate("/relasi4");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!reportRef.current) return;
    
    setDownloadingPdf(true);
    toast.info(t("Menyiapkan PDF multi-chapter...", "Preparing multi-chapter PDF..."));
    
    try {
      const pdfGenerator = new Relasi4PdfGenerator();
      const pdf = pdfGenerator.generateSingleReport(report);
      
      const archetype = report.profile?.archetype || 'report';
      pdf.save(`RELASI4-${archetype}-${Date.now()}.pdf`);
      toast.success(t("PDF berhasil diunduh!", "PDF downloaded successfully!"));
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error(t("Gagal membuat PDF", "Failed to generate PDF"));
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Memuat laporan premium...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-amber-500" />
            <h2 className="text-xl font-bold mb-2">Laporan Tidak Ditemukan</h2>
            <Button onClick={() => navigate("/relasi4")}>
              Kembali ke Quiz
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const primaryAnalysis = report.primary_color_analysis || {};
  const secondaryAnalysis = report.secondary_color_analysis || {};
  const conflictPattern = report.conflict_pattern || {};
  const coreNeeds = report.core_needs || {};
  const relationships = report.relationship_dynamics || {};
  const recommendations = report.growth_recommendations || [];

  const primaryColorInfo = COLOR_PALETTE[primaryAnalysis.color] || COLOR_PALETTE.color_red;
  const secondaryColorInfo = COLOR_PALETTE[secondaryAnalysis.color] || COLOR_PALETTE.color_yellow;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b">
        <div className="max-w-4xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
            Kembali
          </button>
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-500" />
            <span className="font-medium">Laporan Premium</span>
          </div>
        </div>
      </header>

      {/* Gradient Hero */}
      <div 
        className="h-40 md:h-56 relative"
        style={{
          background: `linear-gradient(135deg, ${primaryColorInfo.hex} 0%, ${secondaryColorInfo.hex} 100%)`
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center text-white">
          <div className="text-center">
            <h1 className="text-2xl md:text-3xl font-bold mb-2" style={{ fontFamily: 'Merriweather, serif' }}>
              Laporan Premium RELASI4™
            </h1>
            <p className="text-white/80">
              {primaryColorInfo.archetype} + {secondaryColorInfo.archetype}
            </p>
          </div>
        </div>
      </div>

      <main ref={reportRef} className="max-w-4xl mx-auto px-4 md:px-8 -mt-8 relative z-10 pb-24 bg-background">
        {/* Executive Summary Card */}
        <Card className="shadow-xl mb-8" data-testid="executive-summary">
          <CardContent className="p-6 md:p-8">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold mb-2" style={{ fontFamily: 'Merriweather, serif' }}>
                  Ringkasan
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {report.executive_summary}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Primary Color Analysis */}
        <ReportSection 
          icon={Star} 
          title={`Warna Primer: ${primaryColorInfo.name} (${primaryColorInfo.archetype})`}
          color={primaryColorInfo.hex}
        >
          <p className="text-muted-foreground mb-4">
            {primaryAnalysis.description}
          </p>
          
          {/* Strengths */}
          <div className="mb-4">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Kekuatan
            </h4>
            <ul className="grid md:grid-cols-2 gap-2">
              {primaryAnalysis.strengths?.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full mt-2" style={{ backgroundColor: primaryColorInfo.hex }} />
                  {s}
                </li>
              ))}
            </ul>
          </div>

          {/* Blind Spots */}
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Area Perhatian (Blind Spots)
            </h4>
            <ul className="space-y-1">
              {primaryAnalysis.blind_spots?.map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2" />
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </ReportSection>

        {/* Secondary Color Analysis */}
        <ReportSection 
          icon={Star} 
          title={`Warna Sekunder: ${secondaryColorInfo.name} (${secondaryColorInfo.archetype})`}
          color={secondaryColorInfo.hex}
        >
          <p className="text-muted-foreground mb-4">
            {secondaryAnalysis.description}
          </p>
          <div className="p-4 bg-secondary/30 rounded-xl">
            <h4 className="font-medium mb-2">Bagaimana Warna Ini Menyeimbangkan</h4>
            <p className="text-sm text-muted-foreground">
              {secondaryAnalysis.how_it_balances}
            </p>
          </div>
        </ReportSection>

        {/* Conflict Pattern */}
        <ReportSection 
          icon={AlertTriangle} 
          title={t("Pola Konflik", "Conflict Patterns")}
          color="#E67E22"
        >
          <div className="mb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-100 dark:bg-orange-950/30 rounded-full mb-3">
              <span className="font-medium text-orange-700 dark:text-orange-400">
                {conflictPattern.primary_style}
              </span>
              <span className="text-sm text-orange-600 dark:text-orange-500">
                ({t("Skor", "Score")}: {conflictPattern.score})
              </span>
            </div>
            <p className="text-muted-foreground">
              {conflictPattern.description}
            </p>
          </div>

          {/* Triggers */}
          <div className="mb-4">
            <h4 className="font-medium mb-2">{t("Pemicu Konflik", "Conflict Triggers")}</h4>
            <ul className="space-y-1">
              {conflictPattern.triggers?.map((tr, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2" />
                  {tr}
                </li>
              ))}
            </ul>
          </div>

          {/* Healthy Alternatives */}
          <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-xl">
            <h4 className="font-medium mb-2 text-green-700 dark:text-green-400">
              {t("Alternatif Sehat", "Healthy Alternatives")}
            </h4>
            <ul className="space-y-1">
              {conflictPattern.healthy_alternatives?.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  {a}
                </li>
              ))}
            </ul>
          </div>
        </ReportSection>

        {/* Core Needs */}
        <ReportSection 
          icon={Heart} 
          title={t("Kebutuhan Emosional Inti", "Core Emotional Needs")}
          color="#E74C3C"
        >
          <div className="mb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-100 dark:bg-red-950/30 rounded-full mb-3">
              <span className="font-medium text-red-700 dark:text-red-400">
                {coreNeeds.primary_need}
              </span>
              <span className="text-sm text-red-600 dark:text-red-500">
                ({t("Skor", "Score")}: {coreNeeds.score})
              </span>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-secondary/30 rounded-xl">
              <h4 className="font-medium mb-2">{t("Bagaimana Terlihat", "How It Shows")}</h4>
              <p className="text-sm text-muted-foreground">
                {coreNeeds.how_it_shows}
              </p>
            </div>
            <div className="p-4 bg-secondary/30 rounded-xl">
              <h4 className="font-medium mb-2">{t("Cara Memenuhi", "How to Fulfill")}</h4>
              <p className="text-sm text-muted-foreground">
                {coreNeeds.how_to_fulfill}
              </p>
            </div>
          </div>
        </ReportSection>

        {/* Relationship Dynamics */}
        <ReportSection 
          icon={Users} 
          title={t("Dinamika dalam Hubungan", "Relationship Dynamics")}
          color="#3498DB"
        >
          <div className="space-y-4">
            {/* Romantic */}
            <div className="p-4 bg-pink-50 dark:bg-pink-950/20 rounded-xl">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Heart className="w-4 h-4 text-pink-500" />
                {t("Hubungan Romantis", "Romantic Relationships")}
              </h4>
              <p className="text-sm text-muted-foreground">
                {relationships.romantic}
              </p>
            </div>

            {/* Family */}
            <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-xl">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Users className="w-4 h-4 text-green-500" />
                {t("Hubungan Keluarga", "Family Relationships")}
              </h4>
              <p className="text-sm text-muted-foreground">
                {relationships.family}
              </p>
            </div>

            {/* Workplace */}
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-xl">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-500" />
                {t("Hubungan Kerja", "Work Relationships")}
              </h4>
              <p className="text-sm text-muted-foreground">
                {relationships.workplace}
              </p>
            </div>
          </div>
        </ReportSection>

        {/* Growth Recommendations */}
        <ReportSection 
          icon={TrendingUp} 
          title={t("Rekomendasi Pengembangan Diri", "Personal Growth Recommendations")}
          color="#27AE60"
        >
          <div className="space-y-6">
            {recommendations.map((rec, idx) => (
              <div key={idx} className="relative pl-8">
                {/* Number badge */}
                <div 
                  className="absolute left-0 top-0 w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold"
                >
                  {idx + 1}
                </div>
                
                <div>
                  <h4 className="font-bold mb-2">{rec.title}</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    {rec.description}
                  </p>
                  
                  {/* Action Steps */}
                  <div className="p-4 bg-secondary/30 rounded-xl">
                    <h5 className="text-sm font-medium mb-2">{t("Langkah Aksi:", "Action Steps:")}</h5>
                    <ul className="space-y-2">
                      {rec.action_steps?.map((step, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <Target className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ReportSection>

        {/* Footer Actions */}
        <div className="flex flex-col md:flex-row justify-center gap-4 mt-8">
          <Button 
            variant="outline" 
            className="rounded-full" 
            data-testid="download-pdf"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
          >
            {downloadingPdf ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Menyiapkan...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Unduh PDF
              </>
            )}
          </Button>
          <Button variant="outline" className="rounded-full" data-testid="share-report">
            <Share2 className="w-4 h-4 mr-2" />
            Bagikan
          </Button>
          <Button 
            onClick={() => navigate('/relasi4')}
            className="btn-primary rounded-full"
            data-testid="retake-quiz"
          >
            Ambil Quiz Lagi
          </Button>
        </div>

        {/* Degraded notice */}
        {report.is_degraded && (
          <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl text-center">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4 inline mr-1" />
              Laporan ini dibuat dalam mode hemat. Beberapa bagian mungkin lebih singkat dari biasanya.
            </p>
          </div>
        )}

        {/* Generation info */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Dibuat pada: {new Date(report.generated_at).toLocaleString('id-ID')}
        </p>
      </main>
    </div>
  );
};

export default Relasi4ReportPage;
