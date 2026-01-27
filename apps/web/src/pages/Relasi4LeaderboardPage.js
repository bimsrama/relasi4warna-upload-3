import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage, API } from "../App";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { 
  ArrowLeft, Heart, Home, Crown, Trophy, Medal,
  Loader2, Sparkles, TrendingUp, Users
} from "lucide-react";
import axios from "axios";

// Color palette
const COLOR_PALETTE = {
  color_red: { hex: "#C05640", name: "Merah", archetype: "Driver" },
  color_yellow: { hex: "#D99E30", name: "Kuning", archetype: "Spark" },
  color_green: { hex: "#5D8A66", name: "Hijau", archetype: "Anchor" },
  color_blue: { hex: "#5B8FA8", name: "Biru", archetype: "Analyst" }
};

const Relasi4LeaderboardPage = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [coupleLeaderboard, setCoupleLeaderboard] = useState([]);
  const [familyLeaderboard, setFamilyLeaderboard] = useState([]);
  const [totalCouples, setTotalCouples] = useState(0);
  const [totalFamilies, setTotalFamilies] = useState(0);

  useEffect(() => {
    fetchLeaderboards();
  }, []);

  const fetchLeaderboards = async () => {
    setLoading(true);
    try {
      const [coupleRes, familyRes] = await Promise.all([
        axios.get(`${API}/relasi4/leaderboard/couples?limit=20`),
        axios.get(`${API}/relasi4/leaderboard/families?limit=20`)
      ]);

      setCoupleLeaderboard(coupleRes.data.leaderboard || []);
      setTotalCouples(coupleRes.data.total_couples || 0);
      setFamilyLeaderboard(familyRes.data.leaderboard || []);
      setTotalFamilies(familyRes.data.total_families || 0);
    } catch (error) {
      console.error("Error fetching leaderboards:", error);
    } finally {
      setLoading(false);
    }
  };

  const getMedal = (index) => {
    if (index === 0) return { icon: "🥇", color: "from-yellow-400 to-amber-500" };
    if (index === 1) return { icon: "🥈", color: "from-gray-300 to-gray-400" };
    if (index === 2) return { icon: "🥉", color: "from-orange-400 to-orange-600" };
    return { icon: `#${index + 1}`, color: "from-secondary to-secondary" };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-amber-500 mx-auto mb-4" />
          <p className="text-muted-foreground">{t("Memuat leaderboard...", "Loading leaderboard...")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-pink-500 text-white">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <button 
            onClick={() => navigate('/relasi4')} 
            className="flex items-center gap-2 text-white/80 hover:text-white mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            {t("Kembali", "Back")}
          </button>
          
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-white/20 rounded-full">
                <Trophy className="w-12 h-12" />
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2" style={{ fontFamily: 'Merriweather, serif' }}>
              {t("🏆 Leaderboard Kompatibilitas", "🏆 Compatibility Leaderboard")}
            </h1>
            <p className="text-white/80 max-w-xl mx-auto">
              {t(
                "Lihat pasangan dan keluarga dengan skor kompatibilitas tertinggi!",
                "See couples and families with the highest compatibility scores!"
              )}
            </p>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 mb-8 -mt-12">
          <Card className="shadow-xl border-pink-200">
            <CardContent className="p-6 text-center">
              <Heart className="w-10 h-10 mx-auto mb-2 text-pink-500" />
              <p className="text-3xl font-bold text-pink-600">{totalCouples}</p>
              <p className="text-sm text-muted-foreground">{t("Total Pasangan", "Total Couples")}</p>
            </CardContent>
          </Card>
          <Card className="shadow-xl border-green-200">
            <CardContent className="p-6 text-center">
              <Home className="w-10 h-10 mx-auto mb-2 text-green-500" />
              <p className="text-3xl font-bold text-green-600">{totalFamilies}</p>
              <p className="text-sm text-muted-foreground">{t("Total Keluarga", "Total Families")}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="couples" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="couples" className="flex items-center gap-2">
              <Heart className="w-4 h-4" />
              {t("Pasangan", "Couples")}
            </TabsTrigger>
            <TabsTrigger value="families" className="flex items-center gap-2">
              <Home className="w-4 h-4" />
              {t("Keluarga", "Families")}
            </TabsTrigger>
          </TabsList>

          {/* Couples Leaderboard */}
          <TabsContent value="couples">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-6 h-6 text-pink-500" />
                  {t("Top Pasangan Paling Cocok", "Most Compatible Couples")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {coupleLeaderboard.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Heart className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p>{t("Belum ada pasangan", "No couples yet")}</p>
                    <Button onClick={() => navigate('/relasi4')} className="mt-4">
                      {t("Ambil Quiz & Undang Pasangan", "Take Quiz & Invite Partner")}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {coupleLeaderboard.map((couple, index) => {
                      const medal = getMedal(index);
                      const colorA = COLOR_PALETTE[couple.person_a_profile?.primary_color] || COLOR_PALETTE.color_red;
                      const colorB = COLOR_PALETTE[couple.person_b_profile?.primary_color] || COLOR_PALETTE.color_yellow;
                      const score = couple.compatibility_summary?.compatibility_score || 0;

                      return (
                        <div 
                          key={couple.report_id}
                          className={`flex items-center gap-4 p-4 rounded-xl transition-all hover:scale-[1.01] ${
                            index === 0 ? 'bg-gradient-to-r from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30 border-2 border-yellow-400' :
                            index === 1 ? 'bg-gradient-to-r from-gray-100 to-slate-100 dark:from-gray-800/30 dark:to-slate-800/30 border border-gray-300' :
                            index === 2 ? 'bg-gradient-to-r from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 border border-orange-300' :
                            'bg-secondary/30'
                          }`}
                        >
                          {/* Rank */}
                          <div className={`text-2xl font-bold w-12 text-center ${index < 3 ? 'text-3xl' : ''}`}>
                            {medal.icon}
                          </div>
                          
                          {/* Couple Info */}
                          <div className="flex items-center gap-3 flex-1">
                            <div 
                              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-md"
                              style={{ backgroundColor: colorA.hex }}
                            >
                              {colorA.archetype.charAt(0)}
                            </div>
                            <Heart className={`w-5 h-5 ${index < 3 ? 'text-pink-500 animate-pulse' : 'text-pink-400'}`} />
                            <div 
                              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-md"
                              style={{ backgroundColor: colorB.hex }}
                            >
                              {colorB.archetype.charAt(0)}
                            </div>
                            <div className="ml-2">
                              <p className="font-medium">{colorA.archetype} + {colorB.archetype}</p>
                              <p className="text-xs text-muted-foreground">
                                {couple.compatibility_summary?.compatibility_level || 'Compatible'}
                              </p>
                            </div>
                          </div>
                          
                          {/* Score */}
                          <div className="text-right">
                            <p className={`text-2xl font-bold ${
                              score >= 70 ? 'text-green-500' :
                              score >= 40 ? 'text-amber-500' : 'text-red-500'
                            }`}>
                              {score}%
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Families Leaderboard */}
          <TabsContent value="families">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="w-6 h-6 text-green-500" />
                  {t("Top Keluarga Paling Harmonis", "Most Harmonious Families")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {familyLeaderboard.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Home className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p>{t("Belum ada keluarga", "No families yet")}</p>
                    <Button onClick={() => navigate('/relasi4')} className="mt-4">
                      {t("Ambil Quiz & Buat Grup Keluarga", "Take Quiz & Create Family Group")}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {familyLeaderboard.map((family, index) => {
                      const medal = getMedal(index);
                      const score = family.family_summary?.harmony_score || 0;
                      const members = family.member_profiles || [];

                      return (
                        <div 
                          key={family.report_id}
                          className={`flex items-center gap-4 p-4 rounded-xl transition-all hover:scale-[1.01] ${
                            index < 3 
                              ? `bg-gradient-to-r ${medal.color} bg-opacity-10` 
                              : 'bg-secondary/30'
                          }`}
                        >
                          {/* Rank */}
                          <div className={`text-2xl font-bold w-12 text-center ${index < 3 ? 'text-3xl' : ''}`}>
                            {medal.icon}
                          </div>
                          
                          {/* Family Info */}
                          <div className="flex items-center gap-3 flex-1">
                            <div className="flex -space-x-2">
                              {members.slice(0, 4).map((member, i) => {
                                const color = COLOR_PALETTE[member.primary_color] || COLOR_PALETTE.color_green;
                                return (
                                  <div 
                                    key={i}
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-background"
                                    style={{ backgroundColor: color.hex }}
                                  >
                                    {member.member_name?.charAt(0) || i + 1}
                                  </div>
                                );
                              })}
                              {members.length > 4 && (
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-secondary text-muted-foreground border-2 border-background">
                                  +{members.length - 4}
                                </div>
                              )}
                            </div>
                            <div className="ml-2">
                              <p className="font-medium">{family.family_name || "Family"}</p>
                              <p className="text-xs text-muted-foreground">
                                {members.length} {t("anggota", "members")}
                              </p>
                            </div>
                          </div>
                          
                          {/* Score */}
                          <div className="text-right">
                            <p className={`text-2xl font-bold ${
                              score >= 70 ? 'text-green-500' :
                              score >= 40 ? 'text-amber-500' : 'text-red-500'
                            }`}>
                              {score}%
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* CTA Section */}
        <Card className="mt-8 bg-gradient-to-r from-pink-50 to-amber-50 dark:from-pink-950/20 dark:to-amber-950/20 border-pink-200">
          <CardContent className="p-8 text-center">
            <Sparkles className="w-12 h-12 mx-auto mb-4 text-amber-500" />
            <h3 className="text-xl font-bold mb-2" style={{ fontFamily: 'Merriweather, serif' }}>
              {t("Ingin Masuk Leaderboard?", "Want to Join the Leaderboard?")}
            </h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              {t(
                "Ambil quiz RELASI4™ dan undang pasangan atau keluargamu untuk melihat seberapa cocok kalian!",
                "Take the RELASI4™ quiz and invite your partner or family to see how compatible you are!"
              )}
            </p>
            <Button onClick={() => navigate('/relasi4')} className="bg-pink-500 hover:bg-pink-600">
              <Heart className="w-4 h-4 mr-2" />
              {t("Mulai Quiz Sekarang", "Start Quiz Now")}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Relasi4LeaderboardPage;
