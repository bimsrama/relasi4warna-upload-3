import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useLanguage, useAuth, API } from "../App";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { 
  Heart, Loader2, AlertCircle, ArrowRight, Users,
  Sparkles, CheckCircle, Clock
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

// Color palette
const COLOR_PALETTE = {
  color_red: { hex: "#C05640", name: "Merah", archetype: "Driver" },
  color_yellow: { hex: "#D99E30", name: "Kuning", archetype: "Spark" },
  color_green: { hex: "#5D8A66", name: "Hijau", archetype: "Anchor" },
  color_blue: { hex: "#5B8FA8", name: "Biru", archetype: "Analyst" }
};

const Relasi4CoupleJoinPage = () => {
  const { t, language } = useLanguage();
  const { token } = useAuth();
  const navigate = useNavigate();
  const { inviteCode } = useParams();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState(null);
  const [joining, setJoining] = useState(false);

  // Check if partner just completed quiz and needs to link
  const partnerAssessmentId = searchParams.get('assessment_id');

  useEffect(() => {
    fetchInvite();
  }, [inviteCode]);

  useEffect(() => {
    // Auto-join if partner has assessment ID from completing quiz
    if (invite && partnerAssessmentId && invite.status !== 'completed') {
      handleJoin(partnerAssessmentId);
    }
  }, [invite, partnerAssessmentId]);

  const fetchInvite = async () => {
    try {
      const response = await axios.get(`${API}/relasi4/couple/invite/${inviteCode}`);
      setInvite(response.data);
    } catch (err) {
      console.error("Error fetching invite:", err);
      setError("Undangan tidak ditemukan atau sudah kadaluarsa");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (assessmentId) => {
    setJoining(true);
    try {
      const response = await axios.post(
        `${API}/relasi4/couple/join/${inviteCode}?partner_assessment_id=${assessmentId}`
      );

      if (response.data.success) {
        toast.success("Berhasil bergabung! Membuat laporan kompatibilitas...");
        
        // Generate couple report
        const reportRes = await axios.post(
          `${API}/relasi4/couple/reports/generate`,
          {
            person_a_assessment_id: response.data.creator_assessment_id,
            person_b_assessment_id: assessmentId
          }
        );

        if (reportRes.data.success) {
          navigate(`/relasi4/couple/report/${reportRes.data.report.report_id}`);
        }
      }
    } catch (err) {
      console.error("Error joining:", err);
      toast.error("Gagal bergabung. Silakan coba lagi.");
    } finally {
      setJoining(false);
    }
  };

  const handleStartQuiz = () => {
    // Store invite code and redirect to quiz
    sessionStorage.setItem('couple_invite_code', inviteCode);
    navigate('/relasi4');
  };

  const creatorColor = COLOR_PALETTE[invite?.creator_primary_color] || COLOR_PALETTE.color_red;

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-pink-500 mx-auto mb-4" />
          <p className="text-muted-foreground">Memuat undangan...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-bold mb-2">Undangan Tidak Valid</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={() => navigate('/relasi4')} className="w-full">
              Ambil Quiz Sendiri
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Already completed
  if (invite?.status === 'completed') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full overflow-hidden">
          <div className="h-2 bg-green-500" />
          <CardContent className="p-8 text-center">
            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
            <h2 className="text-xl font-bold mb-2">Undangan Sudah Digunakan</h2>
            <p className="text-muted-foreground mb-6">
              Pasangan ini sudah mengisi quiz bersama. Kamu bisa mulai quiz baru untuk dirimu sendiri.
            </p>
            <Button onClick={() => navigate('/relasi4')} className="w-full">
              Mulai Quiz Baru
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Joining in progress
  if (joining) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="relative w-20 h-20 mx-auto mb-4">
              <Heart className="w-20 h-20 text-pink-500 animate-pulse" />
            </div>
            <h2 className="text-xl font-bold mb-2">Menghubungkan Profil...</h2>
            <p className="text-muted-foreground">
              Sedang membuat laporan kompatibilitas pasangan
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main invite page
  return (
    <div className="min-h-screen bg-background">
      {/* Gradient header */}
      <div 
        className="h-64 relative"
        style={{ background: `linear-gradient(135deg, ${creatorColor.hex} 0%, #E91E63 100%)` }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white">
            <Heart className="w-16 h-16 mx-auto mb-4 animate-pulse" />
            <h1 className="text-2xl md:text-3xl font-bold mb-2" style={{ fontFamily: 'Merriweather, serif' }}>
              Undangan Couple Quiz
            </h1>
            <p className="text-white/80">
              {invite?.partner_name ? `Hai ${invite.partner_name}!` : 'Seseorang mengundangmu!'}
            </p>
          </div>
        </div>
      </div>

      <main className="max-w-md mx-auto px-4 -mt-16 relative z-10 pb-24">
        <Card className="shadow-xl">
          <CardContent className="p-6 md:p-8">
            {/* Creator profile teaser */}
            <div className="text-center mb-6">
              <div 
                className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ backgroundColor: creatorColor.hex }}
              >
                <span className="text-3xl text-white font-bold">
                  {creatorColor.archetype.charAt(0)}
                </span>
              </div>
              <p className="text-muted-foreground">
                Pasanganmu adalah seorang <strong style={{ color: creatorColor.hex }}>{creatorColor.archetype}</strong>
              </p>
            </div>

            {/* Info */}
            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-3 p-3 bg-secondary/30 rounded-xl">
                <Users className="w-5 h-5 text-pink-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Kenali Kompatibilitasmu</p>
                  <p className="text-sm text-muted-foreground">
                    Ambil quiz RELASI4™ dan lihat seberapa cocok kalian berdua!
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-secondary/30 rounded-xl">
                <Clock className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">5 Menit</p>
                  <p className="text-sm text-muted-foreground">
                    Hanya butuh 5 menit untuk menyelesaikan 20 pertanyaan
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-secondary/30 rounded-xl">
                <Sparkles className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Laporan Premium</p>
                  <p className="text-sm text-muted-foreground">
                    Dapatkan analisis AI tentang dinamika hubungan kalian
                  </p>
                </div>
              </div>
            </div>

            {/* CTA */}
            <Button 
              onClick={handleStartQuiz}
              className="w-full bg-pink-500 hover:bg-pink-600 h-12"
              data-testid="start-couple-quiz-btn"
            >
              <Heart className="w-5 h-5 mr-2" />
              Mulai Quiz Sekarang
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>

            <p className="text-center text-xs text-muted-foreground mt-4">
              Kode undangan: <code className="bg-secondary px-2 py-1 rounded">{inviteCode}</code>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Relasi4CoupleJoinPage;
