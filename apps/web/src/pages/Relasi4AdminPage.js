import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage, useAuth, API } from "../App";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { 
  ArrowLeft, Users, FileText, Heart, Home, BarChart3, 
  Eye, Trash2, RefreshCw, Loader2, Download, Crown,
  TrendingUp, AlertCircle, CheckCircle, Clock
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

const Relasi4AdminPage = () => {
  const { t, language } = useLanguage();
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [filter, setFilter] = useState({ type: "all" });

  useEffect(() => {
    if (!token || user?.role !== 'admin') {
      navigate('/login');
      return;
    }
    fetchData();
  }, [token, user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      // Fetch stats
      const [reportsRes, assessmentsRes] = await Promise.all([
        axios.get(`${API}/relasi4/admin/reports`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/relasi4/admin/assessments`, { headers }).catch(() => ({ data: [] }))
      ]);

      setReports(reportsRes.data || []);
      setAssessments(assessmentsRes.data || []);

      // Calculate stats
      const allReports = reportsRes.data || [];
      setStats({
        total_assessments: (assessmentsRes.data || []).length,
        total_reports: allReports.length,
        single_reports: allReports.filter(r => r.report_type === 'SINGLE').length,
        couple_reports: allReports.filter(r => r.report_type === 'COUPLE').length,
        family_reports: allReports.filter(r => r.report_type === 'FAMILY').length
      });

      // Build leaderboard from couple reports
      const coupleReports = allReports.filter(r => r.report_type === 'COUPLE');
      const sortedCouples = coupleReports
        .map(r => ({
          report_id: r.report_id,
          score: r.compatibility_summary?.compatibility_score || 0,
          person_a: r.person_a_profile,
          person_b: r.person_b_profile,
          created_at: r.created_at
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
      setLeaderboard(sortedCouples);

    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReport = async (reportId) => {
    if (!confirm(t("Yakin hapus laporan ini?", "Are you sure you want to delete this report?"))) return;
    try {
      await axios.delete(`${API}/relasi4/admin/reports/${reportId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(t("Laporan berhasil dihapus", "Report deleted successfully"));
      fetchData();
    } catch (error) {
      toast.error(t("Gagal menghapus laporan", "Failed to delete report"));
    }
  };

  const filteredReports = reports.filter(r => {
    if (filter.type === "all") return true;
    return r.report_type === filter.type;
  });

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
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/admin')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold">RELASI4™ Admin</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => navigate('/relasi4/analytics')} variant="outline" size="sm">
              <TrendingUp className="w-4 h-4 mr-2" />
              A/B Analytics
            </Button>
            <Button onClick={fetchData} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <FileText className="w-8 h-8 mx-auto mb-2 text-blue-500" />
              <p className="text-2xl font-bold">{stats?.total_assessments || 0}</p>
              <p className="text-xs text-muted-foreground">Total Assessments</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <BarChart3 className="w-8 h-8 mx-auto mb-2 text-purple-500" />
              <p className="text-2xl font-bold">{stats?.total_reports || 0}</p>
              <p className="text-xs text-muted-foreground">Total Reports</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="w-8 h-8 mx-auto mb-2 text-amber-500" />
              <p className="text-2xl font-bold">{stats?.single_reports || 0}</p>
              <p className="text-xs text-muted-foreground">Single Reports</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Heart className="w-8 h-8 mx-auto mb-2 text-pink-500" />
              <p className="text-2xl font-bold">{stats?.couple_reports || 0}</p>
              <p className="text-xs text-muted-foreground">Couple Reports</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Home className="w-8 h-8 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold">{stats?.family_reports || 0}</p>
              <p className="text-xs text-muted-foreground">Family Reports</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="reports" className="space-y-4">
          <TabsList>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="leaderboard">🏆 Leaderboard</TabsTrigger>
            <TabsTrigger value="assessments">Assessments</TabsTrigger>
          </TabsList>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Generated Reports</CardTitle>
                  <div className="flex gap-2">
                    {["all", "SINGLE", "COUPLE", "FAMILY"].map(type => (
                      <Button
                        key={type}
                        variant={filter.type === type ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilter({ type })}
                      >
                        {type === "all" ? "Semua" : type}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Report ID</th>
                        <th className="text-left p-2">Type</th>
                        <th className="text-left p-2">Details</th>
                        <th className="text-left p-2">Created</th>
                        <th className="text-left p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReports.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center p-8 text-muted-foreground">
                            Tidak ada laporan
                          </td>
                        </tr>
                      ) : (
                        filteredReports.map(report => {
                          const colorA = COLOR_PALETTE[report.person_a_profile?.primary_color || report.primary_color];
                          const colorB = COLOR_PALETTE[report.person_b_profile?.primary_color || report.secondary_color];
                          
                          return (
                            <tr key={report.report_id} className="border-b hover:bg-secondary/30">
                              <td className="p-2 font-mono text-xs">{report.report_id}</td>
                              <td className="p-2">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  report.report_type === 'SINGLE' ? 'bg-amber-100 text-amber-700' :
                                  report.report_type === 'COUPLE' ? 'bg-pink-100 text-pink-700' :
                                  'bg-green-100 text-green-700'
                                }`}>
                                  {report.report_type}
                                </span>
                              </td>
                              <td className="p-2">
                                {report.report_type === 'COUPLE' ? (
                                  <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1">
                                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: colorA?.hex }} />
                                      <span className="text-xs">{colorA?.archetype}</span>
                                    </div>
                                    <span className="text-pink-500">❤️</span>
                                    <div className="flex items-center gap-1">
                                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: colorB?.hex }} />
                                      <span className="text-xs">{colorB?.archetype}</span>
                                    </div>
                                    <span className="font-bold text-sm ml-2">
                                      {report.compatibility_summary?.compatibility_score || 0}%
                                    </span>
                                  </div>
                                ) : report.report_type === 'FAMILY' ? (
                                  <div className="flex items-center gap-2">
                                    <Home className="w-4 h-4 text-green-500" />
                                    <span>{report.family_name || "Family"}</span>
                                    <span className="font-bold text-sm">
                                      {report.family_summary?.harmony_score || 0}%
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: colorA?.hex }} />
                                    <span className="text-xs">{colorA?.archetype}</span>
                                  </div>
                                )}
                              </td>
                              <td className="p-2 text-xs text-muted-foreground">
                                {new Date(report.created_at || report.generated_at).toLocaleDateString('id-ID')}
                              </td>
                              <td className="p-2">
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      const path = report.report_type === 'COUPLE' 
                                        ? `/relasi4/couple/report/${report.report_id}`
                                        : report.report_type === 'FAMILY'
                                        ? `/relasi4/family/report/${report.report_id}`
                                        : `/relasi4/report/${report.report_id}`;
                                      window.open(path, '_blank');
                                    }}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-500 hover:text-red-700"
                                    onClick={() => handleDeleteReport(report.report_id)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-6 h-6 text-amber-500" />
                  Couple Compatibility Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                {leaderboard.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Heart className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p>Belum ada data couple report</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {leaderboard.map((couple, index) => {
                      const colorA = COLOR_PALETTE[couple.person_a?.primary_color] || COLOR_PALETTE.color_red;
                      const colorB = COLOR_PALETTE[couple.person_b?.primary_color] || COLOR_PALETTE.color_yellow;
                      const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`;
                      
                      return (
                        <div 
                          key={couple.report_id}
                          className={`flex items-center gap-4 p-4 rounded-xl ${
                            index < 3 ? 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200' : 'bg-secondary/30'
                          }`}
                        >
                          <div className="text-2xl font-bold w-12 text-center">
                            {medal}
                          </div>
                          
                          <div className="flex items-center gap-3 flex-1">
                            <div 
                              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                              style={{ backgroundColor: colorA.hex }}
                            >
                              {colorA.archetype.charAt(0)}
                            </div>
                            <Heart className="w-5 h-5 text-pink-500" />
                            <div 
                              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                              style={{ backgroundColor: colorB.hex }}
                            >
                              {colorB.archetype.charAt(0)}
                            </div>
                            <div className="ml-2">
                              <p className="font-medium">{colorA.archetype} + {colorB.archetype}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(couple.created_at).toLocaleDateString('id-ID')}
                              </p>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <p className={`text-2xl font-bold ${
                              couple.score >= 70 ? 'text-green-500' :
                              couple.score >= 40 ? 'text-amber-500' : 'text-red-500'
                            }`}>
                              {couple.score}%
                            </p>
                            <p className="text-xs text-muted-foreground">Compatibility</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Assessments Tab */}
          <TabsContent value="assessments">
            <Card>
              <CardHeader>
                <CardTitle>Recent Assessments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Assessment ID</th>
                        <th className="text-left p-2">Primary Color</th>
                        <th className="text-left p-2">Scores</th>
                        <th className="text-left p-2">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assessments.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center p-8 text-muted-foreground">
                            Tidak ada assessment
                          </td>
                        </tr>
                      ) : (
                        assessments.slice(0, 50).map(assessment => {
                          const primaryColor = COLOR_PALETTE[assessment.primary_color];
                          return (
                            <tr key={assessment.assessment_id} className="border-b hover:bg-secondary/30">
                              <td className="p-2 font-mono text-xs">{assessment.assessment_id}</td>
                              <td className="p-2">
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-6 h-6 rounded-full"
                                    style={{ backgroundColor: primaryColor?.hex }}
                                  />
                                  <span>{primaryColor?.archetype || '-'}</span>
                                </div>
                              </td>
                              <td className="p-2">
                                <div className="flex gap-1">
                                  {Object.entries(assessment.color_scores || {}).map(([color, score]) => {
                                    const c = COLOR_PALETTE[color];
                                    return (
                                      <div 
                                        key={color}
                                        className="w-6 h-6 rounded text-xs flex items-center justify-center text-white font-medium"
                                        style={{ backgroundColor: c?.hex }}
                                        title={`${c?.name}: ${score}`}
                                      >
                                        {score}
                                      </div>
                                    );
                                  })}
                                </div>
                              </td>
                              <td className="p-2 text-xs text-muted-foreground">
                                {new Date(assessment.calculated_at).toLocaleDateString('id-ID')}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Relasi4AdminPage;
