import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useLanguage, useAuth, API } from "../App";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { 
  Home, Loader2, AlertCircle, ArrowRight, Users,
  Sparkles, CheckCircle, Clock, Heart, UserPlus
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

const Relasi4FamilyJoinPage = () => {
  const { t, language } = useLanguage();
  const { token } = useAuth();
  const navigate = useNavigate();
  const { inviteCode } = useParams();

  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState(null);
  const [error, setError] = useState(null);
  const [joining, setJoining] = useState(false);
  const [memberName, setMemberName] = useState("");

  useEffect(() => {
    fetchGroup();
  }, [inviteCode]);

  const fetchGroup = async () => {
    try {
      const response = await axios.get(`${API}/relasi4/family/invite/${inviteCode}`);
      setGroup(response.data);
    } catch (err) {
      console.error("Error fetching group:", err);
      setError(t("Grup keluarga tidak ditemukan atau sudah ditutup", "Family group not found or closed"));
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuiz = () => {
    // Store family info and redirect to quiz
    sessionStorage.setItem('family_invite_code', inviteCode);
    sessionStorage.setItem('family_member_name', memberName || `Anggota ${(group?.current_members || 0) + 1}`);
    navigate('/relasi4');
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-green-500 mx-auto mb-4" />
          <p className="text-muted-foreground">{t("Memuat grup keluarga...", "Loading family group...")}</p>
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
            <h2 className="text-xl font-bold mb-2">{t("Grup Tidak Ditemukan", "Group Not Found")}</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={() => navigate('/relasi4')} className="w-full">
              {t("Buat Grup Keluarga Baru", "Create New Family Group")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Full state
  if (!group?.can_join) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full overflow-hidden">
          <div className="h-2 bg-amber-500" />
          <CardContent className="p-8 text-center">
            <Users className="w-16 h-16 mx-auto mb-4 text-amber-500" />
            <h2 className="text-xl font-bold mb-2">{t("Grup Sudah Penuh", "Group is Full")}</h2>
            <p className="text-muted-foreground mb-2">
              <strong>{group.family_name}</strong>
            </p>
            <p className="text-muted-foreground mb-6">
              {group.current_members}/{group.max_members} {t("anggota sudah bergabung", "members have joined")}.
              {group.status !== 'open' && ` ${t("Grup sudah ditutup untuk pendaftaran.", "Group is closed for registration.")}`}
            </p>
            <Button onClick={() => navigate('/relasi4')} className="w-full">
              {t("Buat Grup Keluarga Baru", "Create New Family Group")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main join page
  return (
    <div className="min-h-screen bg-background">
      {/* Gradient header */}
      <div className="h-64 relative bg-gradient-to-br from-green-500 to-blue-500">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white">
            <Home className="w-16 h-16 mx-auto mb-4" />
            <h1 className="text-2xl md:text-3xl font-bold mb-2" style={{ fontFamily: 'Merriweather, serif' }}>
              {group.family_name || t("Grup Keluarga", "Family Group")}
            </h1>
            <p className="text-white/80">
              {group.current_members}/{group.max_members} {t("anggota sudah bergabung", "members joined")}
            </p>
          </div>
        </div>
      </div>

      <main className="max-w-md mx-auto px-4 -mt-16 relative z-10 pb-24">
        <Card className="shadow-xl">
          <CardContent className="p-6 md:p-8">
            {/* Progress indicator */}
            <div className="flex justify-center gap-2 mb-6">
              {Array.from({ length: group.max_members }).map((_, i) => (
                <div 
                  key={i}
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    i < group.current_members 
                      ? 'bg-green-500 text-white' 
                      : 'bg-secondary text-muted-foreground'
                  }`}
                >
                  {i < group.current_members ? <CheckCircle className="w-4 h-4" /> : i + 1}
                </div>
              ))}
            </div>

            <p className="text-center text-muted-foreground mb-6">
              {t(
                "Kamu diundang untuk bergabung dalam quiz keluarga! Isi quiz untuk melihat dinamika keluargamu.",
                "You're invited to join the family quiz! Complete the quiz to see your family dynamics."
              )}
            </p>

            {/* Name input */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                {t("Nama Panggilanmu (opsional)", "Your Nickname (optional)")}
              </label>
              <input
                type="text"
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                placeholder={`${t("Anggota", "Member")} ${(group.current_members || 0) + 1}`}
                className="w-full px-4 py-3 rounded-xl border bg-background focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>

            {/* Info cards */}
            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3 p-3 bg-secondary/30 rounded-xl">
                <Users className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">{t("Quiz Keluarga", "Family Quiz")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "Lihat bagaimana kepribadianmu berinteraksi dengan anggota keluarga lain",
                      "See how your personality interacts with other family members"
                    )}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-secondary/30 rounded-xl">
                <Clock className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">{t("5 Menit", "5 Minutes")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "Hanya butuh 5 menit untuk menyelesaikan 20 pertanyaan",
                      "Only takes 5 minutes to complete 20 questions"
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-secondary/30 rounded-xl">
                <Sparkles className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">{t("Laporan Dinamika", "Dynamics Report")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "Dapatkan analisis AI tentang harmoni dan komunikasi keluarga",
                      "Get AI analysis about family harmony and communication"
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* CTA */}
            <Button 
              onClick={handleStartQuiz}
              className="w-full bg-green-500 hover:bg-green-600 h-12"
              data-testid="start-family-quiz-btn"
            >
              <UserPlus className="w-5 h-5 mr-2" />
              {t("Bergabung & Mulai Quiz", "Join & Start Quiz")}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>

            <p className="text-center text-xs text-muted-foreground mt-4">
              {t("Kode grup:", "Group code:")} <code className="bg-secondary px-2 py-1 rounded">{inviteCode}</code>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Relasi4FamilyJoinPage;
