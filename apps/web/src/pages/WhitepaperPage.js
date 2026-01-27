import React, { useState } from "react";
import { useLanguage } from "../App";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { 
  FileText, Download, Share2, BarChart3, 
  Users, Heart, Zap, Shield, ChevronDown,
  ChevronUp, ExternalLink, BookOpen
} from "lucide-react";

// Data Constants
const NEED_DATA = [
  { key: "validation", label: "Validasi", labelEn: "Validation", value: 34.2, color: "#D99E30", description: "Butuh diakui dan dihargai" },
  { key: "harmony", label: "Harmoni", labelEn: "Harmony", value: 26.8, color: "#5D8A66", description: "Prioritas keselarasan" },
  { key: "control", label: "Kontrol", labelEn: "Control", value: 21.5, color: "#C05640", description: "Butuh pengaruh & kepastian" },
  { key: "autonomy", label: "Otonomi", labelEn: "Autonomy", value: 17.5, color: "#5B8FA8", description: "Butuh ruang mandiri" }
];

const CONFLICT_DATA = [
  { key: "avoid", label: "Menghindar", labelEn: "Avoid", value: 38.7, color: "#5B8FA8" },
  { key: "appease", label: "Mengalah", labelEn: "Appease", value: 28.4, color: "#5D8A66" },
  { key: "freeze", label: "Membeku", labelEn: "Freeze", value: 19.3, color: "#6c757d" },
  { key: "attack", label: "Menyerang", labelEn: "Attack", value: 13.6, color: "#C05640" }
];

const KEY_INSIGHTS = [
  {
    number: "34.2%",
    title: { id: "Dominasi Kebutuhan Validasi", en: "Validation Need Dominates" },
    description: { 
      id: "Lebih dari sepertiga masyarakat Indonesia memiliki kebutuhan utama untuk diakui dan dihargai.",
      en: "More than a third of Indonesians have a primary need to be recognized and appreciated."
    }
  },
  {
    number: "38.7%",
    title: { id: "Pola Menghindar Mendominasi", en: "Avoidance Pattern Dominates" },
    description: { 
      id: "Hampir 4 dari 10 orang cenderung menghindari konflik secara langsung.",
      en: "Almost 4 out of 10 people tend to avoid direct conflict."
    }
  },
  {
    number: "18.4%",
    title: { id: "Kombinasi Risiko Tertinggi", en: "Highest Risk Combination" },
    description: { 
      id: "Kombinasi Validasi + Menghindar menciptakan siklus kekecewaan tidak terungkap.",
      en: "Validation + Avoidance combination creates cycles of unexpressed disappointment."
    }
  },
  {
    number: "67.1%",
    title: { id: "Mayoritas Avoid-Centric", en: "Majority Avoid-Centric" },
    description: { 
      id: "Dua pertiga kombinasi pola dalam relasi adalah avoid-centric.",
      en: "Two-thirds of pattern combinations in relationships are avoid-centric."
    }
  }
];

// Bar Chart Component
const HorizontalBar = ({ label, value, color, maxValue = 40 }) => {
  const percentage = (value / maxValue) * 100;
  
  return (
    <div className="flex items-center gap-3 mb-3">
      <span className="w-24 text-sm text-muted-foreground">{label}</span>
      <div className="flex-1 h-8 bg-secondary rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full flex items-center justify-end pr-3 text-white text-sm font-semibold transition-all duration-1000"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        >
          {value}%
        </div>
      </div>
    </div>
  );
};

// Insight Card Component
const InsightCard = ({ number, title, description, index }) => (
  <Card className="border-l-4 border-l-amber-500">
    <CardContent className="p-4">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
          {index + 1}
        </div>
        <div>
          <div className="text-2xl font-bold text-amber-600 mb-1">{number}</div>
          <h4 className="font-semibold mb-1">{title}</h4>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

// Main Component
const WhitepaperPage = () => {
  const { t, language } = useLanguage();
  const [expandedSection, setExpandedSection] = useState("insights");
  
  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };
  
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="max-w-5xl mx-auto px-4 py-16">
          <div className="flex items-center gap-2 text-amber-400 mb-4">
            <BookOpen className="w-5 h-5" />
            <span className="text-sm font-medium uppercase tracking-wider">Whitepaper Nasional</span>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: 'Merriweather, serif' }}>
            {t("Pola Emosional Relasi Indonesia 2026", "Emotional Patterns of Indonesian Relationships 2026")}
          </h1>
          
          <p className="text-lg text-slate-300 mb-8 max-w-2xl">
            {t(
              "Membaca Kebutuhan, Konflik, dan Dinamika Relasi Masyarakat Indonesia berdasarkan data dari >10.000 responden anonim.",
              "Reading the Needs, Conflicts, and Relationship Dynamics of Indonesian Society based on data from >10,000 anonymous respondents."
            )}
          </p>
          
          {/* Key Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white/10 rounded-xl p-4 text-center backdrop-blur-sm">
              <div className="text-2xl md:text-3xl font-bold text-amber-400">34.2%</div>
              <div className="text-xs text-slate-400 mt-1">{t("Butuh Validasi", "Need Validation")}</div>
            </div>
            <div className="bg-white/10 rounded-xl p-4 text-center backdrop-blur-sm">
              <div className="text-2xl md:text-3xl font-bold text-amber-400">38.7%</div>
              <div className="text-xs text-slate-400 mt-1">{t("Menghindar Konflik", "Avoid Conflict")}</div>
            </div>
            <div className="bg-white/10 rounded-xl p-4 text-center backdrop-blur-sm">
              <div className="text-2xl md:text-3xl font-bold text-amber-400">67.1%</div>
              <div className="text-xs text-slate-400 mt-1">{t("Avoid-Centric", "Avoid-Centric")}</div>
            </div>
            <div className="bg-white/10 rounded-xl p-4 text-center backdrop-blur-sm">
              <div className="text-2xl md:text-3xl font-bold text-amber-400">18.4%</div>
              <div className="text-xs text-slate-400 mt-1">{t("Kombinasi Risiko", "Risk Combination")}</div>
            </div>
          </div>
          
          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button 
              variant="default" 
              className="bg-amber-500 hover:bg-amber-600"
              onClick={() => window.open('/docs/WHITEPAPER_POLA_EMOSIONAL_RELASI_INDONESIA_2026.md', '_blank')}
            >
              <FileText className="w-4 h-4 mr-2" />
              {t("Baca Whitepaper Lengkap", "Read Full Whitepaper")}
            </Button>
            <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
              <Download className="w-4 h-4 mr-2" />
              {t("Download PDF", "Download PDF")}
            </Button>
            <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
              <Share2 className="w-4 h-4 mr-2" />
              {t("Bagikan", "Share")}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Content Sections */}
      <div className="max-w-5xl mx-auto px-4 py-12">
        
        {/* Key Insights Section */}
        <section className="mb-12">
          <button 
            onClick={() => toggleSection("insights")}
            className="w-full flex items-center justify-between p-4 bg-secondary/50 rounded-xl mb-4 hover:bg-secondary/70 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Zap className="w-6 h-6 text-amber-500" />
              <h2 className="text-xl font-bold">{t("5 Insight Utama", "5 Key Insights")}</h2>
            </div>
            {expandedSection === "insights" ? <ChevronUp /> : <ChevronDown />}
          </button>
          
          {expandedSection === "insights" && (
            <div className="grid md:grid-cols-2 gap-4 animate-in slide-in-from-top-2">
              {KEY_INSIGHTS.map((insight, idx) => (
                <InsightCard 
                  key={idx}
                  index={idx}
                  number={insight.number}
                  title={language === 'id' ? insight.title.id : insight.title.en}
                  description={language === 'id' ? insight.description.id : insight.description.en}
                />
              ))}
            </div>
          )}
        </section>
        
        {/* Need Distribution Section */}
        <section className="mb-12">
          <button 
            onClick={() => toggleSection("needs")}
            className="w-full flex items-center justify-between p-4 bg-secondary/50 rounded-xl mb-4 hover:bg-secondary/70 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Heart className="w-6 h-6 text-red-500" />
              <h2 className="text-xl font-bold">{t("Distribusi Kebutuhan Emosional", "Emotional Needs Distribution")}</h2>
            </div>
            {expandedSection === "needs" ? <ChevronUp /> : <ChevronDown />}
          </button>
          
          {expandedSection === "needs" && (
            <Card className="animate-in slide-in-from-top-2">
              <CardContent className="p-6">
                {NEED_DATA.map((item) => (
                  <HorizontalBar 
                    key={item.key}
                    label={language === 'id' ? item.label : item.labelEn}
                    value={item.value}
                    color={item.color}
                  />
                ))}
                <p className="text-sm text-muted-foreground mt-4">
                  {t(
                    "Indonesia menunjukkan kebutuhan validasi dan harmoni lebih tinggi dari rata-rata global, konsisten dengan orientasi kolektivis.",
                    "Indonesia shows higher validation and harmony needs than global average, consistent with collectivist orientation."
                  )}
                </p>
              </CardContent>
            </Card>
          )}
        </section>
        
        {/* Conflict Distribution Section */}
        <section className="mb-12">
          <button 
            onClick={() => toggleSection("conflicts")}
            className="w-full flex items-center justify-between p-4 bg-secondary/50 rounded-xl mb-4 hover:bg-secondary/70 transition-colors"
          >
            <div className="flex items-center gap-3">
              <BarChart3 className="w-6 h-6 text-blue-500" />
              <h2 className="text-xl font-bold">{t("Distribusi Gaya Konflik", "Conflict Style Distribution")}</h2>
            </div>
            {expandedSection === "conflicts" ? <ChevronUp /> : <ChevronDown />}
          </button>
          
          {expandedSection === "conflicts" && (
            <Card className="animate-in slide-in-from-top-2">
              <CardContent className="p-6">
                {CONFLICT_DATA.map((item) => (
                  <HorizontalBar 
                    key={item.key}
                    label={language === 'id' ? item.label : item.labelEn}
                    value={item.value}
                    color={item.color}
                  />
                ))}
                <p className="text-sm text-muted-foreground mt-4">
                  {t(
                    "67.1% responden cenderung menghindari konflik secara langsung, mencerminkan budaya 'menjaga muka' namun berisiko menumpuk konflik laten.",
                    "67.1% of respondents tend to avoid direct conflict, reflecting 'saving face' culture but risking latent conflict accumulation."
                  )}
                </p>
              </CardContent>
            </Card>
          )}
        </section>
        
        {/* Implications Section */}
        <section className="mb-12">
          <button 
            onClick={() => toggleSection("implications")}
            className="w-full flex items-center justify-between p-4 bg-secondary/50 rounded-xl mb-4 hover:bg-secondary/70 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-green-500" />
              <h2 className="text-xl font-bold">{t("Implikasi Sosial", "Social Implications")}</h2>
            </div>
            {expandedSection === "implications" ? <ChevronUp /> : <ChevronDown />}
          </button>
          
          {expandedSection === "implications" && (
            <div className="grid md:grid-cols-2 gap-4 animate-in slide-in-from-top-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Heart className="w-5 h-5 text-pink-500" />
                    {t("Keluarga & Pernikahan", "Family & Marriage")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "Konflik laten yang tidak terselesaikan antar generasi. Model penyelesaian konflik tidak sehat yang diwariskan.",
                      "Unresolved latent conflicts across generations. Unhealthy conflict resolution models being inherited."
                    )}
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-500" />
                    {t("Dunia Kerja", "Workplace")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "Feedback kritis tidak tersampaikan. Inovasi terhambat karena takut berseberangan pendapat.",
                      "Critical feedback not delivered. Innovation hindered due to fear of disagreement."
                    )}
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="w-5 h-5 text-green-500" />
                    {t("Pendidikan", "Education")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "72% generasi muda tidak pernah mendapat pendidikan formal tentang pengelolaan konflik.",
                      "72% of young generation never received formal education on conflict management."
                    )}
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="w-5 h-5 text-amber-500" />
                    {t("Komunitas", "Community")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "Pola Avoid yang dominan dapat menyembunyikan ketegangan sosial yang sebenarnya.",
                      "Dominant Avoid pattern can hide actual social tensions."
                    )}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </section>
        
        {/* Download Section */}
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200">
          <CardContent className="p-8 text-center">
            <FileText className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">
              {t("Unduh Whitepaper Lengkap", "Download Full Whitepaper")}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
              {t(
                "Dapatkan analisis lengkap termasuk metodologi, matriks Need×Conflict, proyeksi 2026, dan rekomendasi strategis.",
                "Get complete analysis including methodology, Need×Conflict matrix, 2026 projections, and strategic recommendations."
              )}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button className="bg-amber-500 hover:bg-amber-600">
                <Download className="w-4 h-4 mr-2" />
                {t("Whitepaper (MD)", "Whitepaper (MD)")}
              </Button>
              <Button variant="outline">
                <ExternalLink className="w-4 h-4 mr-2" />
                {t("Executive Brief", "Executive Brief")}
              </Button>
              <Button variant="outline">
                <Share2 className="w-4 h-4 mr-2" />
                {t("Infografik", "Infographic")}
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Disclaimer */}
        <div className="mt-12 p-6 bg-secondary/30 rounded-xl text-center">
          <p className="text-sm text-muted-foreground">
            <strong>{t("Disclaimer:", "Disclaimer:")}</strong> {t(
              "Whitepaper ini bertujuan edukatif dan reflektif. Bukan alat diagnosis, terapi, atau pengganti bantuan profesional. Data bersifat agregat dan anonim.",
              "This whitepaper is for educational and reflective purposes. Not a diagnostic tool, therapy, or substitute for professional help. Data is aggregate and anonymous."
            )}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            © 2026 Relasi4Warna Research Division
          </p>
        </div>
      </div>
    </div>
  );
};

export default WhitepaperPage;
