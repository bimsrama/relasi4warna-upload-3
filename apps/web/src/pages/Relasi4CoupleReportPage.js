import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useLanguage, useAuth, API } from "../App";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { 
  Heart, ArrowLeft, Share2, Download, Users, AlertTriangle,
  CheckCircle, Loader2, Crown, Sparkles, TrendingUp, X,
  MessageCircle, Shield, Lightbulb, FileText
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import Relasi4PdfGenerator from "../utils/Relasi4PdfGenerator";

// Color palette
const COLOR_PALETTE = {
  color_red: { hex: "#C05640", name: "Merah", archetype: "Driver", emoji: "🔴" },
  color_yellow: { hex: "#D99E30", name: "Kuning", archetype: "Spark", emoji: "🟡" },
  color_green: { hex: "#5D8A66", name: "Hijau", archetype: "Anchor", emoji: "🟢" },
  color_blue: { hex: "#5B8FA8", name: "Biru", archetype: "Analyst", emoji: "🔵" }
};

// Compatibility Meter Component
const CompatibilityMeter = ({ score, size = 200 }) => {
  const [animatedScore, setAnimatedScore] = useState(0);
  
  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 300);
    return () => clearTimeout(timer);
  }, [score]);

  const radius = (size - 20) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (animatedScore / 100) * circumference;
  
  // Color based on score
  const getColor = (s) => {
    if (s >= 70) return "#22C55E"; // Green
    if (s >= 40) return "#F59E0B"; // Amber
    return "#EF4444"; // Red
  };

  const getLabel = (s) => {
    if (s >= 70) return { id: "Tinggi", en: "High" };
    if (s >= 40) return { id: "Sedang", en: "Medium" };
    return { id: "Rendah", en: "Low" };
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          className="text-secondary/30"
          strokeWidth={12}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress circle */}
        <circle
          className="transition-all duration-1000 ease-out"
          strokeWidth={12}
          strokeLinecap="round"
          stroke={getColor(animatedScore)}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          style={{ 
            strokeDasharray: circumference, 
            strokeDashoffset: offset,
            filter: `drop-shadow(0 0 8px ${getColor(animatedScore)}40)`
          }}
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold" style={{ color: getColor(animatedScore) }}>
          {animatedScore}%
        </span>
        <span className="text-sm text-muted-foreground">
          Kompatibilitas {getLabel(animatedScore).id}
        </span>
      </div>
    </div>
  );
};

// Profile Card Component
const ProfileCard = ({ profile, color, label }) => {
  const colorInfo = COLOR_PALETTE[color] || COLOR_PALETTE.color_red;
  
  return (
    <div className="flex-1 p-4 rounded-xl bg-secondary/30">
      <div className="flex items-center gap-3 mb-3">
        <div 
          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
          style={{ backgroundColor: colorInfo.hex }}
        >
          {label.charAt(0)}
        </div>
        <div>
          <p className="font-medium">{label}</p>
          <p className="text-sm" style={{ color: colorInfo.hex }}>
            {colorInfo.archetype} ({colorInfo.name})
          </p>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        {profile?.summary || ""}
      </p>
    </div>
  );
};

// Share Card Modal for Couple
const CoupleShareModal = ({ isOpen, onClose, report, language }) => {
  const canvasRef = useRef(null);
  const [cardDataUrl, setCardDataUrl] = useState(null);
  
  const compatibility = report?.compatibility_summary;
  const personA = report?.person_a_profile;
  const personB = report?.person_b_profile;
  
  const colorA = COLOR_PALETTE[personA?.primary_color] || COLOR_PALETTE.color_red;
  const colorB = COLOR_PALETTE[personB?.primary_color] || COLOR_PALETTE.color_yellow;

  const generateCard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !report) return;

    const ctx = canvas.getContext('2d');
    const width = 600;
    const height = 450;
    canvas.width = width;
    canvas.height = height;

    // Gradient background
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, colorA.hex);
    gradient.addColorStop(0.5, '#FF6B9D');
    gradient.addColorStop(1, colorB.hex);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Pattern overlay
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    for (let i = 0; i < width; i += 30) {
      for (let j = 0; j < height; j += 30) {
        ctx.beginPath();
        ctx.arc(i, j, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // White card with shadow effect
    ctx.shadowColor = 'rgba(0,0,0,0.2)';
    ctx.shadowBlur = 20;
    ctx.fillStyle = 'rgba(255,255,255,0.98)';
    ctx.beginPath();
    ctx.roundRect(40, 40, width - 80, height - 80, 24);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Title with heart
    ctx.fillStyle = '#4A3B32';
    ctx.font = 'bold 22px Merriweather, serif';
    ctx.textAlign = 'center';
    ctx.fillText('💕 RELASI4™ Couple Match', width / 2, 85);

    // Compatibility level text
    const score = compatibility?.compatibility_score || 0;
    const levelText = score >= 80 ? '🔥 Sangat Cocok!' :
                      score >= 60 ? '💖 Cocok' :
                      score >= 40 ? '💛 Cukup Cocok' : '💔 Perlu Usaha';

    ctx.font = '16px Inter, sans-serif';
    ctx.fillStyle = score >= 70 ? '#16A34A' : score >= 40 ? '#D97706' : '#DC2626';
    ctx.fillText(levelText, width / 2, 115);

    // Large score circle with ring
    ctx.strokeStyle = score >= 70 ? '#22C55E' : score >= 40 ? '#F59E0B' : '#EF4444';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(width / 2, 190, 55, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(width / 2, 190, 48, 0, Math.PI * 2);
    ctx.fillStyle = score >= 70 ? '#22C55E' : score >= 40 ? '#F59E0B' : '#EF4444';
    ctx.fill();
    
    ctx.fillStyle = 'white';
    ctx.font = 'bold 32px Inter, sans-serif';
    ctx.fillText(`${score}%`, width / 2, 200);

    // Person circles with initials
    ctx.fillStyle = colorA.hex;
    ctx.beginPath();
    ctx.arc(width / 2 - 110, 310, 35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.fillText(colorA.archetype.charAt(0), width / 2 - 110, 318);

    ctx.fillStyle = colorB.hex;
    ctx.beginPath();
    ctx.arc(width / 2 + 110, 310, 35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.fillText(colorB.archetype.charAt(0), width / 2 + 110, 318);

    // Heart connection line
    ctx.strokeStyle = '#FF6B9D';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(width / 2 - 70, 310);
    ctx.lineTo(width / 2 + 70, 310);
    ctx.stroke();
    ctx.setLineDash([]);

    // Heart in middle
    ctx.font = '28px sans-serif';
    ctx.fillStyle = '#E91E63';
    ctx.fillText('❤️', width / 2, 318);

    // Archetype names
    ctx.fillStyle = '#4A3B32';
    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.fillText(colorA.archetype, width / 2 - 110, 360);
    ctx.fillText(colorB.archetype, width / 2 + 110, 360);

    // CTA
    ctx.font = '12px Inter, sans-serif';
    ctx.fillStyle = '#9CA3AF';
    ctx.fillText('Cek kompatibilitasmu di relasi4warna.com', width / 2, 400);

    setCardDataUrl(canvas.toDataURL('image/png'));
  }, [report, colorA, colorB, compatibility]);

  useEffect(() => {
    if (isOpen && report) {
      generateCard();
    }
  }, [isOpen, report, generateCard]);

  const handleDownload = () => {
    if (!cardDataUrl) return;
    const link = document.createElement('a');
    link.download = `relasi4-couple-${Date.now()}.png`;
    link.href = cardDataUrl;
    link.click();
    toast.success('Gambar berhasil diunduh!');
  };

  const handleShareWhatsApp = () => {
    const score = compatibility?.compatibility_score || 0;
    const text = `💕 Kami ${score}% kompatibel! ${colorA.archetype} + ${colorB.archetype}\n\nCek kompatibilitasmu juga di relasi4warna.com`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleShareTwitter = () => {
    const score = compatibility?.compatibility_score || 0;
    const text = `💕 Kami ${score}% kompatibel! ${colorA.archetype} + ${colorB.archetype} di RELASI4™\n\nCek kompatibilitasmu: relasi4warna.com #RELASI4 #CoupleGoals`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-background rounded-2xl max-w-lg w-full p-6 animate-scale-in">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold" style={{ fontFamily: 'Merriweather, serif' }}>
            Bagikan Match
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6 rounded-xl overflow-hidden shadow-lg">
          <canvas ref={canvasRef} className="w-full h-auto" style={{ display: 'block' }} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Button variant="outline" onClick={handleDownload} className="flex flex-col items-center gap-2 h-auto py-4">
            <Download className="w-5 h-5" />
            <span className="text-xs">Unduh</span>
          </Button>
          <Button onClick={handleShareWhatsApp} className="flex flex-col items-center gap-2 h-auto py-4 bg-[#25D366] hover:bg-[#20BA59]">
            <MessageCircle className="w-5 h-5" />
            <span className="text-xs">WhatsApp</span>
          </Button>
          <Button onClick={handleShareTwitter} className="flex flex-col items-center gap-2 h-auto py-4 bg-[#1DA1F2] hover:bg-[#1A91DA]">
            <Share2 className="w-5 h-5" />
            <span className="text-xs">Twitter</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

// Main Couple Report Page
const Relasi4CoupleReportPage = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { reportId } = useParams();
  const reportRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
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
      toast.error("Gagal memuat laporan");
      navigate("/relasi4");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    toast.info(t("Menyiapkan PDF multi-chapter...", "Preparing multi-chapter PDF..."));
    
    try {
      const pdfGenerator = new Relasi4PdfGenerator();
      const pdf = pdfGenerator.generateCoupleReport(report);
      
      pdf.save(`RELASI4-Couple-${Date.now()}.pdf`);
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
          <p className="text-muted-foreground">Memuat laporan pasangan...</p>
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
            <Button onClick={() => navigate("/relasi4")}>Kembali ke Quiz</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const compatibility = report.compatibility_summary || {};
  const personA = report.person_a_profile || {};
  const personB = report.person_b_profile || {};
  const sharedStrengths = report.shared_strengths || [];
  const frictionAreas = report.friction_areas || [];
  const conflictDynamics = report.conflict_dynamics || {};
  const emotionalNeeds = report.emotional_needs || {};
  const practicalTips = report.practical_tips || [];

  const colorA = COLOR_PALETTE[personA.primary_color] || COLOR_PALETTE.color_red;
  const colorB = COLOR_PALETTE[personB.primary_color] || COLOR_PALETTE.color_yellow;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
            Kembali
          </button>
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-500" />
            <span className="font-medium">Couple Report</span>
          </div>
        </div>
      </header>

      {/* Hero with gradient */}
      <div 
        className="h-48 relative"
        style={{ background: `linear-gradient(135deg, ${colorA.hex} 0%, ${colorB.hex} 100%)` }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white">
            <h1 className="text-2xl md:text-3xl font-bold mb-2" style={{ fontFamily: 'Merriweather, serif' }}>
              {colorA.archetype} + {colorB.archetype}
            </h1>
            <p className="text-white/80">Laporan Kompatibilitas Pasangan</p>
          </div>
        </div>
      </div>

      <main ref={reportRef} className="max-w-4xl mx-auto px-4 -mt-16 relative z-10 pb-24 bg-background">
        {/* Compatibility Score Card */}
        <Card className="shadow-xl mb-8" data-testid="compatibility-card">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-center gap-8">
              {/* Meter */}
              <div className="flex-shrink-0">
                <CompatibilityMeter score={compatibility.compatibility_score || 0} />
              </div>
              
              {/* Overview */}
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-xl font-bold mb-3" style={{ fontFamily: 'Merriweather, serif' }}>
                  Ringkasan Kompatibilitas
                </h2>
                <p className="text-muted-foreground">
                  {compatibility.overview}
                </p>
                
                {/* Share button */}
                <Button 
                  onClick={() => setShowShareModal(true)}
                  className="mt-4 bg-pink-500 hover:bg-pink-600"
                  data-testid="share-couple-btn"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Bagikan Match {compatibility.compatibility_score}%
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Comparison */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Perbandingan Profil
            </h3>
            <div className="flex flex-col md:flex-row gap-4">
              <ProfileCard profile={personA} color={personA.primary_color} label="Person A" />
              <div className="flex items-center justify-center">
                <Heart className="w-8 h-8 text-pink-500" />
              </div>
              <ProfileCard profile={personB} color={personB.primary_color} label="Person B" />
            </div>
          </CardContent>
        </Card>

        {/* Shared Strengths */}
        <Card className="mb-6 overflow-hidden">
          <div className="h-1 bg-green-500" />
          <CardContent className="p-6">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Kekuatan Bersama
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              {sharedStrengths.map((strength, i) => (
                <div key={i} className="p-4 bg-green-50 dark:bg-green-950/20 rounded-xl">
                  <h4 className="font-medium text-green-700 dark:text-green-400 mb-1">
                    {strength.title}
                  </h4>
                  <p className="text-sm text-muted-foreground">{strength.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Friction Areas */}
        <Card className="mb-6 overflow-hidden">
          <div className="h-1 bg-amber-500" />
          <CardContent className="p-6">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Area yang Perlu Diwaspadai
            </h3>
            <div className="space-y-4">
              {frictionAreas.map((friction, i) => (
                <div key={i} className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-xl">
                  <h4 className="font-medium text-amber-700 dark:text-amber-400 mb-2">
                    {friction.area}
                  </h4>
                  <p className="text-sm text-muted-foreground mb-2">{friction.why}</p>
                  <div className="flex items-start gap-2 text-sm">
                    <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <span className="text-amber-700 dark:text-amber-400">{friction.solution}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Conflict Dynamics */}
        <Card className="mb-6 overflow-hidden">
          <div className="h-1 bg-orange-500" />
          <CardContent className="p-6">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-orange-500" />
              Dinamika Konflik
            </h3>
            
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="p-4 bg-secondary/30 rounded-xl">
                <p className="text-sm text-muted-foreground mb-1">Person A saat konflik:</p>
                <p className="font-medium">{conflictDynamics.person_a_style?.replace('conflict_', '').replace('_', ' ')}</p>
              </div>
              <div className="p-4 bg-secondary/30 rounded-xl">
                <p className="text-sm text-muted-foreground mb-1">Person B saat konflik:</p>
                <p className="font-medium">{conflictDynamics.person_b_style?.replace('conflict_', '').replace('_', ' ')}</p>
              </div>
            </div>

            <p className="text-muted-foreground mb-4">{conflictDynamics.interaction_pattern}</p>

            <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-xl">
              <h4 className="font-medium text-green-700 dark:text-green-400 mb-2">Tips Resolusi Sehat:</h4>
              <ul className="space-y-2">
                {conflictDynamics.healthy_resolution_tips?.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Emotional Needs */}
        <Card className="mb-6 overflow-hidden">
          <div className="h-1 bg-pink-500" />
          <CardContent className="p-6">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Heart className="w-5 h-5 text-pink-500" />
              Kebutuhan Emosional
            </h3>
            
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="p-4 bg-pink-50 dark:bg-pink-950/20 rounded-xl">
                <p className="text-sm text-muted-foreground mb-1">Person A butuh:</p>
                <p className="font-medium text-pink-700 dark:text-pink-400">{emotionalNeeds.person_a_needs}</p>
              </div>
              <div className="p-4 bg-pink-50 dark:bg-pink-950/20 rounded-xl">
                <p className="text-sm text-muted-foreground mb-1">Person B butuh:</p>
                <p className="font-medium text-pink-700 dark:text-pink-400">{emotionalNeeds.person_b_needs}</p>
              </div>
            </div>

            <div className="p-4 bg-secondary/30 rounded-xl">
              <h4 className="font-medium mb-2">Cara Memenuhi Kebutuhan Satu Sama Lain:</h4>
              <p className="text-sm text-muted-foreground">{emotionalNeeds.how_to_fulfill_each_other}</p>
            </div>
          </CardContent>
        </Card>

        {/* Practical Tips */}
        <Card className="mb-8 overflow-hidden">
          <div className="h-1 bg-blue-500" />
          <CardContent className="p-6">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              5 Tips Praktis untuk Hubungan Sehat
            </h3>
            <div className="space-y-3">
              {practicalTips.map((tip, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {i + 1}
                  </div>
                  <p className="text-sm">{tip}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Footer Actions */}
        <div className="flex flex-col md:flex-row justify-center gap-4">
          <Button 
            onClick={() => setShowShareModal(true)}
            className="bg-pink-500 hover:bg-pink-600 rounded-full"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Bagikan Match {compatibility.compatibility_score}%
          </Button>
          <Button 
            variant="outline" 
            className="rounded-full" 
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
          <Button variant="outline" className="rounded-full" onClick={() => navigate('/relasi4')}>
            Ambil Quiz Lagi
          </Button>
        </div>

        {/* Generation info */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Dibuat pada: {new Date(report.generated_at).toLocaleString('id-ID')}
        </p>
      </main>

      {/* Share Modal */}
      <CoupleShareModal 
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        report={report}
        language={language}
      />

      <style>{`
        .animate-scale-in {
          animation: scaleIn 0.3s ease-out;
        }
        @keyframes scaleIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default Relasi4CoupleReportPage;
