import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useLanguage, useAuth, API } from "../App";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { 
  Users, ArrowLeft, Share2, Download, AlertTriangle,
  CheckCircle, Loader2, Crown, Sparkles, TrendingUp, X,
  MessageCircle, Shield, Lightbulb, Heart, UserPlus,
  Home, Zap, FileText
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

// Family Member Avatar
const MemberAvatar = ({ member, index }) => {
  const colorInfo = COLOR_PALETTE[member.primary_color] || COLOR_PALETTE.color_red;
  
  return (
    <div className="flex flex-col items-center">
      <div 
        className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg"
        style={{ backgroundColor: colorInfo.hex }}
      >
        {member.member_name?.charAt(0) || `M${index + 1}`}
      </div>
      <p className="text-sm font-medium mt-2">{member.member_name || `Anggota ${index + 1}`}</p>
      <p className="text-xs text-muted-foreground">{colorInfo.archetype}</p>
    </div>
  );
};

// Harmony Score Ring
const HarmonyScoreRing = ({ score, size = 150 }) => {
  const [animatedScore, setAnimatedScore] = useState(0);
  
  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 300);
    return () => clearTimeout(timer);
  }, [score]);

  const radius = (size - 20) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (animatedScore / 100) * circumference;
  
  const getColor = (s) => {
    if (s >= 70) return "#22C55E";
    if (s >= 40) return "#F59E0B";
    return "#EF4444";
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          className="text-secondary/30"
          strokeWidth={10}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className="transition-all duration-1000 ease-out"
          strokeWidth={10}
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
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <Home className="w-6 h-6 text-muted-foreground mb-1" />
        <span className="text-3xl font-bold" style={{ color: getColor(animatedScore) }}>
          {animatedScore}%
        </span>
        <span className="text-xs text-muted-foreground">Harmoni Keluarga</span>
      </div>
    </div>
  );
};

// Share Modal for Family
const FamilyShareModal = ({ isOpen, onClose, report, language }) => {
  const canvasRef = useRef(null);
  const [cardDataUrl, setCardDataUrl] = useState(null);
  
  const familySummary = report?.family_summary;
  const members = report?.member_profiles || [];

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
    gradient.addColorStop(0, '#5D8A66');
    gradient.addColorStop(1, '#5B8FA8');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // White card
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    ctx.roundRect(40, 40, width - 80, height - 80, 20);
    ctx.fill();

    // Title
    ctx.fillStyle = '#4A3B32';
    ctx.font = 'bold 24px Merriweather, serif';
    ctx.textAlign = 'center';
    ctx.fillText('RELASI4™ Family Dynamics', width / 2, 90);

    // Family name
    ctx.font = '16px Inter, sans-serif';
    ctx.fillStyle = '#7A6E62';
    ctx.fillText(report.family_name || 'Keluarga Kita', width / 2, 120);

    // Score circle
    const score = familySummary?.harmony_score || 0;
    ctx.beginPath();
    ctx.arc(width / 2, 200, 45, 0, Math.PI * 2);
    ctx.fillStyle = score >= 70 ? '#22C55E' : score >= 40 ? '#F59E0B' : '#EF4444';
    ctx.fill();
    
    ctx.fillStyle = 'white';
    ctx.font = 'bold 24px Inter, sans-serif';
    ctx.fillText(`${score}%`, width / 2, 208);

    // Member circles
    const memberColors = members.slice(0, 6).map(m => 
      COLOR_PALETTE[m.primary_color]?.hex || '#5D8A66'
    );
    const startX = width / 2 - (memberColors.length * 25);
    memberColors.forEach((color, i) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(startX + i * 50, 300, 18, 0, Math.PI * 2);
      ctx.fill();
    });

    // Member count
    ctx.fillStyle = '#4A3B32';
    ctx.font = '14px Inter, sans-serif';
    ctx.fillText(`${members.length} Anggota Keluarga`, width / 2, 340);

    // CTA
    ctx.font = '12px Inter, sans-serif';
    ctx.fillStyle = '#7A6E62';
    ctx.fillText('Cek harmoni keluargamu di relasi4warna.com', width / 2, 390);

    setCardDataUrl(canvas.toDataURL('image/png'));
  }, [report, familySummary, members]);

  useEffect(() => {
    if (isOpen && report) {
      generateCard();
    }
  }, [isOpen, report, generateCard]);

  const handleDownload = () => {
    if (!cardDataUrl) return;
    const link = document.createElement('a');
    link.download = `relasi4-family-${Date.now()}.png`;
    link.href = cardDataUrl;
    link.click();
    toast.success('Gambar berhasil diunduh!');
  };

  const handleShareWhatsApp = () => {
    const score = familySummary?.harmony_score || 0;
    const text = `🏠 Keluarga kami ${score}% harmonis!\n\nCek harmoni keluargamu juga di relasi4warna.com`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-background rounded-2xl max-w-lg w-full p-6 animate-scale-in">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold" style={{ fontFamily: 'Merriweather, serif' }}>
            Bagikan Harmoni Keluarga
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6 rounded-xl overflow-hidden shadow-lg">
          <canvas ref={canvasRef} className="w-full h-auto" style={{ display: 'block' }} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={handleDownload} className="flex flex-col items-center gap-2 h-auto py-4">
            <Download className="w-5 h-5" />
            <span className="text-xs">Unduh</span>
          </Button>
          <Button onClick={handleShareWhatsApp} className="flex flex-col items-center gap-2 h-auto py-4 bg-[#25D366] hover:bg-[#20BA59]">
            <MessageCircle className="w-5 h-5" />
            <span className="text-xs">WhatsApp</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

// Main Family Report Page
const Relasi4FamilyReportPage = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { reportId } = useParams();

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
      const pdf = pdfGenerator.generateFamilyReport(report);
      
      pdf.save(`RELASI4-Family-${Date.now()}.pdf`);
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
          <p className="text-muted-foreground">Memuat laporan keluarga...</p>
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

  const familySummary = report.family_summary || {};
  const members = report.member_profiles || [];
  const dynamics = report.family_dynamics || {};
  const roleAnalysis = report.role_analysis || [];
  const strengthsMatrix = report.strengths_matrix || [];
  const frictionPoints = report.friction_points || [];
  const communicationGuide = report.communication_guide || [];
  const familyExercises = report.family_exercises || [];

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
            <Home className="w-5 h-5 text-green-500" />
            <span className="font-medium">Family Report</span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="h-48 relative bg-gradient-to-br from-green-500 to-blue-500">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white">
            <h1 className="text-2xl md:text-3xl font-bold mb-2" style={{ fontFamily: 'Merriweather, serif' }}>
              {report.family_name || "Keluarga Kita"}
            </h1>
            <p className="text-white/80">{members.length} Anggota • Laporan Dinamika Keluarga</p>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 -mt-16 relative z-10 pb-24">
        {/* Harmony Score & Members */}
        <Card className="shadow-xl mb-8" data-testid="harmony-card">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-center gap-8">
              {/* Score Ring */}
              <div className="flex-shrink-0">
                <HarmonyScoreRing score={familySummary.harmony_score || 0} />
              </div>
              
              {/* Overview */}
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-xl font-bold mb-3" style={{ fontFamily: 'Merriweather, serif' }}>
                  {familySummary.headline || "Dinamika Keluarga"}
                </h2>
                <p className="text-muted-foreground mb-4">
                  {familySummary.overview}
                </p>
                
                <Button 
                  onClick={() => setShowShareModal(true)}
                  className="bg-green-500 hover:bg-green-600"
                  data-testid="share-family-btn"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Bagikan Harmoni {familySummary.harmony_score}%
                </Button>
              </div>
            </div>

            {/* Member Avatars */}
            <div className="mt-8 pt-6 border-t">
              <h3 className="text-sm font-medium text-muted-foreground mb-4 text-center">
                Anggota Keluarga
              </h3>
              <div className="flex flex-wrap justify-center gap-6">
                {members.map((member, i) => (
                  <MemberAvatar key={i} member={member} index={i} />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Role Analysis */}
        {roleAnalysis.length > 0 && (
          <Card className="mb-6 overflow-hidden">
            <div className="h-1 bg-purple-500" />
            <CardContent className="p-6">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Crown className="w-5 h-5 text-purple-500" />
                Peran dalam Keluarga
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                {roleAnalysis.map((role, i) => {
                  const colorInfo = COLOR_PALETTE[role.primary_color] || COLOR_PALETTE.color_green;
                  return (
                    <div key={i} className="p-4 bg-secondary/30 rounded-xl">
                      <div className="flex items-center gap-3 mb-2">
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: colorInfo.hex }}
                        >
                          {role.member_name?.charAt(0) || i + 1}
                        </div>
                        <div>
                          <p className="font-medium">{role.member_name}</p>
                          <p className="text-xs" style={{ color: colorInfo.hex }}>{role.role_title}</p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{role.role_description}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Strengths Matrix */}
        {strengthsMatrix.length > 0 && (
          <Card className="mb-6 overflow-hidden">
            <div className="h-1 bg-green-500" />
            <CardContent className="p-6">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-green-500" />
                Kekuatan Kolektif Keluarga
              </h3>
              <div className="space-y-3">
                {strengthsMatrix.map((strength, i) => (
                  <div key={i} className="p-4 bg-green-50 dark:bg-green-950/20 rounded-xl">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-green-700 dark:text-green-400">
                          {strength.strength_title}
                        </h4>
                        <p className="text-sm text-muted-foreground">{strength.how_it_helps}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Friction Points */}
        {frictionPoints.length > 0 && (
          <Card className="mb-6 overflow-hidden">
            <div className="h-1 bg-amber-500" />
            <CardContent className="p-6">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Titik Gesekan yang Perlu Diwaspadai
              </h3>
              <div className="space-y-4">
                {frictionPoints.map((friction, i) => (
                  <div key={i} className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-xl">
                    <h4 className="font-medium text-amber-700 dark:text-amber-400 mb-2">
                      {friction.between_members?.join(" & ")}
                    </h4>
                    <p className="text-sm text-muted-foreground mb-3">{friction.friction_description}</p>
                    <div className="flex items-start gap-2 text-sm">
                      <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <span className="text-amber-700 dark:text-amber-400">{friction.resolution_tip}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Communication Guide */}
        {communicationGuide.length > 0 && (
          <Card className="mb-6 overflow-hidden">
            <div className="h-1 bg-blue-500" />
            <CardContent className="p-6">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-blue-500" />
                Panduan Komunikasi Keluarga
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                {communicationGuide.map((guide, i) => (
                  <div key={i} className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-xl">
                    <h4 className="font-medium text-blue-700 dark:text-blue-400 mb-1">
                      {guide.member_name}
                    </h4>
                    <p className="text-sm text-muted-foreground">{guide.communication_style}</p>
                    <p className="text-xs mt-2 text-blue-600 dark:text-blue-400">
                      💡 {guide.how_to_approach}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Family Exercises */}
        {familyExercises.length > 0 && (
          <Card className="mb-8 overflow-hidden">
            <div className="h-1 bg-pink-500" />
            <CardContent className="p-6">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Heart className="w-5 h-5 text-pink-500" />
                Aktivitas untuk Mempererat Keluarga
              </h3>
              <div className="space-y-3">
                {familyExercises.map((exercise, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-pink-50 dark:bg-pink-950/20 rounded-xl">
                    <div className="w-6 h-6 rounded-full bg-pink-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {i + 1}
                    </div>
                    <div>
                      <h4 className="font-medium">{exercise.exercise_title}</h4>
                      <p className="text-sm text-muted-foreground">{exercise.instructions}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer Actions */}
        <div className="flex flex-col md:flex-row justify-center gap-4">
          <Button 
            onClick={() => setShowShareModal(true)}
            className="bg-green-500 hover:bg-green-600 rounded-full"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Bagikan Harmoni {familySummary.harmony_score}%
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
      <FamilyShareModal 
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

export default Relasi4FamilyReportPage;
