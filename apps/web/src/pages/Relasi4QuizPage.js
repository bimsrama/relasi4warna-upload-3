import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useLanguage, useAuth, API } from "../App";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { ArrowLeft, ArrowRight, Clock, CheckCircle, Sparkles, Share2, Download, X, Crown } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

// Color palette for RELASI4™
const COLOR_PALETTE = {
  color_red: { hex: "#C05640", name: { id: "Merah", en: "Red" }, archetype: "Driver" },
  color_yellow: { hex: "#D99E30", name: { id: "Kuning", en: "Yellow" }, archetype: "Spark" },
  color_green: { hex: "#5D8A66", name: { id: "Hijau", en: "Green" }, archetype: "Anchor" },
  color_blue: { hex: "#5B8FA8", name: { id: "Biru", en: "Blue" }, archetype: "Analyst" }
};

// Animated Progress Bar Component
const AnimatedProgressBar = ({ progress, primaryColor, secondaryColor }) => {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  
  useEffect(() => {
    const timer = setTimeout(() => setAnimatedProgress(progress), 100);
    return () => clearTimeout(timer);
  }, [progress]);

  const primaryHex = COLOR_PALETTE[primaryColor]?.hex || "#4A3B32";
  const secondaryHex = COLOR_PALETTE[secondaryColor]?.hex || "#E6E2D8";

  return (
    <div className="relative w-full h-3 bg-secondary/50 rounded-full overflow-hidden">
      {/* Gradient progress bar */}
      <div 
        className="h-full rounded-full transition-all duration-700 ease-out relative overflow-hidden"
        style={{ 
          width: `${animatedProgress}%`,
          background: `linear-gradient(90deg, ${primaryHex} 0%, ${secondaryHex} 100%)`
        }}
      >
        {/* Shimmer effect */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
            animation: 'shimmer 2s infinite'
          }}
        />
      </div>
      
      {/* Milestone dots */}
      <div className="absolute inset-0 flex justify-between items-center px-1">
        {[25, 50, 75].map((milestone) => (
          <div
            key={milestone}
            className={`w-2 h-2 rounded-full transition-all duration-500 ${
              animatedProgress >= milestone 
                ? 'bg-white shadow-lg scale-110' 
                : 'bg-secondary/60 scale-100'
            }`}
            style={{ marginLeft: `${milestone - 2}%` }}
          />
        ))}
      </div>
    </div>
  );
};

// Circular Progress Ring
const CircularProgress = ({ progress, size = 60, strokeWidth = 4, color }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        className="text-secondary/30"
        strokeWidth={strokeWidth}
        stroke="currentColor"
        fill="transparent"
        r={radius}
        cx={size / 2}
        cy={size / 2}
      />
      <circle
        className="transition-all duration-700 ease-out"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        stroke={color}
        fill="transparent"
        r={radius}
        cx={size / 2}
        cy={size / 2}
        style={{ strokeDasharray: circumference, strokeDashoffset: offset }}
      />
    </svg>
  );
};

// Share Card Modal Component
const ShareCardModal = ({ isOpen, onClose, result, language }) => {
  const canvasRef = useRef(null);
  const [cardDataUrl, setCardDataUrl] = useState(null);
  
  const primaryColor = COLOR_PALETTE[result?.primary_color];
  const secondaryColor = COLOR_PALETTE[result?.secondary_color];
  
  // Helper function - declared before useCallback
  const roundRect = (ctx, x, y, width, height, radius) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  };

  const generateShareCard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !result) return;

    const ctx = canvas.getContext('2d');
    const width = 600;
    const height = 400;
    canvas.width = width;
    canvas.height = height;

    // Create gradient background
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, primaryColor?.hex || '#C05640');
    gradient.addColorStop(1, secondaryColor?.hex || '#D99E30');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Add subtle pattern overlay
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let i = 0; i < 20; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * width, Math.random() * height, Math.random() * 50 + 20, 0, Math.PI * 2);
      ctx.fill();
    }

    // White card overlay
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    roundRect(ctx, 40, 40, width - 80, height - 80, 20);
    ctx.fill();

    // Title
    ctx.fillStyle = '#4A3B32';
    ctx.font = 'bold 28px Merriweather, serif';
    ctx.textAlign = 'center';
    ctx.fillText('RELASI4™', width / 2, 100);

    // Subtitle
    ctx.font = '16px Inter, sans-serif';
    ctx.fillStyle = '#7A6E62';
    ctx.fillText(language === 'id' ? 'Hasil Penilaian Saya' : 'My Assessment Result', width / 2, 130);

    // Primary color circle
    ctx.fillStyle = primaryColor?.hex || '#C05640';
    ctx.beginPath();
    ctx.arc(width / 2 - 60, 200, 50, 0, Math.PI * 2);
    ctx.fill();

    // Secondary color circle (overlapping)
    ctx.fillStyle = secondaryColor?.hex || '#D99E30';
    ctx.beginPath();
    ctx.arc(width / 2 + 60, 200, 50, 0, Math.PI * 2);
    ctx.fill();

    // Primary archetype text
    ctx.fillStyle = '#4A3B32';
    ctx.font = 'bold 24px Inter, sans-serif';
    const primaryName = primaryColor?.archetype || 'Driver';
    const secondaryName = secondaryColor?.archetype || 'Spark';
    ctx.fillText(`${primaryName} + ${secondaryName}`, width / 2, 290);

    // Score info
    ctx.font = '14px Inter, sans-serif';
    ctx.fillStyle = '#7A6E62';
    const scoreText = language === 'id' 
      ? `Skor: ${result.color_scores?.[0]?.score || 0} | ${result.completion_rate}% selesai`
      : `Score: ${result.color_scores?.[0]?.score || 0} | ${result.completion_rate}% complete`;
    ctx.fillText(scoreText, width / 2, 320);

    // CTA
    ctx.font = '12px Inter, sans-serif';
    ctx.fillStyle = primaryColor?.hex || '#C05640';
    ctx.fillText(language === 'id' ? 'Coba juga di relasi4warna.com' : 'Try it at relasi4warna.com', width / 2, 350);

    setCardDataUrl(canvas.toDataURL('image/png'));
  }, [result, primaryColor, secondaryColor, language]);
  
  useEffect(() => {
    if (isOpen && result && canvasRef.current) {
      generateShareCard();
    }
  }, [isOpen, result, generateShareCard]);

  const handleDownload = () => {
    if (!cardDataUrl) return;
    const link = document.createElement('a');
    link.download = `relasi4-result-${Date.now()}.png`;
    link.href = cardDataUrl;
    link.click();
    toast.success(language === 'id' ? 'Gambar berhasil diunduh!' : 'Image downloaded!');
  };

  const handleShareWhatsApp = () => {
    const text = language === 'id'
      ? `🎨 Hasil RELASI4™ saya: ${primaryColor?.archetype} + ${secondaryColor?.archetype}!\n\nCek kepribadianmu juga di relasi4warna.com`
      : `🎨 My RELASI4™ result: ${primaryColor?.archetype} + ${secondaryColor?.archetype}!\n\nDiscover your personality at relasi4warna.com`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleShareTwitter = () => {
    const text = language === 'id'
      ? `🎨 Hasil RELASI4™ saya: ${primaryColor?.archetype} + ${secondaryColor?.archetype}! Cek kepribadianmu juga di relasi4warna.com #RELASI4 #PersonalityTest`
      : `🎨 My RELASI4™ result: ${primaryColor?.archetype} + ${secondaryColor?.archetype}! Discover yours at relasi4warna.com #RELASI4 #PersonalityTest`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-background rounded-2xl max-w-lg w-full p-6 animate-scale-in">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold" style={{ fontFamily: 'Merriweather, serif' }}>
            {language === 'id' ? 'Bagikan Hasil' : 'Share Result'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preview Canvas */}
        <div className="mb-6 rounded-xl overflow-hidden shadow-lg">
          <canvas ref={canvasRef} className="w-full h-auto" style={{ display: 'block' }} />
        </div>

        {/* Share Buttons */}
        <div className="grid grid-cols-3 gap-3">
          <Button 
            variant="outline" 
            onClick={handleDownload}
            className="flex flex-col items-center gap-2 h-auto py-4"
            data-testid="download-share-card"
          >
            <Download className="w-5 h-5" />
            <span className="text-xs">{language === 'id' ? 'Unduh' : 'Download'}</span>
          </Button>
          <Button 
            onClick={handleShareWhatsApp}
            className="flex flex-col items-center gap-2 h-auto py-4 bg-[#25D366] hover:bg-[#20BA59]"
            data-testid="share-whatsapp"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            <span className="text-xs">WhatsApp</span>
          </Button>
          <Button 
            onClick={handleShareTwitter}
            className="flex flex-col items-center gap-2 h-auto py-4 bg-[#1DA1F2] hover:bg-[#1A91DA]"
            data-testid="share-twitter"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
            </svg>
            <span className="text-xs">Twitter</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

// Main RELASI4 Quiz Page Component
const Relasi4QuizPage = () => {
  const { t, language } = useLanguage();
  const { token } = useAuth();
  const navigate = useNavigate();
  const { setCode } = useParams();

  const [quizStarted, setQuizStarted] = useState(!!setCode); // Auto-start if setCode in URL
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [assessmentId, setAssessmentId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [questionSetCode, setQuestionSetCode] = useState(setCode || 'R4W_CORE_V1');
  const startTime = useRef(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);

  // Timer effect
  useEffect(() => {
    if (!quizStarted) return;
    const timer = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [quizStarted]);

  // Initialize quiz when started
  useEffect(() => {
    if (!quizStarted) {
      setLoading(false);
      return;
    }
    
    const initQuiz = async () => {
      try {
        // Get questions
        const questionsRes = await axios.get(`${API}/relasi4/questions/${questionSetCode}`);
        setQuestions(questionsRes.data || []);

        // Start assessment
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const startRes = await axios.post(
          `${API}/relasi4/assessments/start`,
          { question_set_code: questionSetCode, language },
          { headers }
        );
        setAssessmentId(startRes.data.assessment_id);
        startTime.current = Date.now();
        setLoading(false);
      } catch (error) {
        console.error("Error initializing RELASI4™ quiz:", error);
        toast.error(t("Gagal memuat pertanyaan", "Failed to load questions"));
        navigate("/");
      }
    };

    initQuiz();
  }, [quizStarted, questionSetCode, language, token, navigate, t]);

  const currentQuestion = questions[currentIndex];
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;
  const answeredCount = Object.keys(answers).length;

  // Determine dominant colors from current answers (for progress bar)
  const getDominantColors = useCallback(() => {
    const colorCounts = { color_red: 0, color_yellow: 0, color_green: 0, color_blue: 0 };
    // Simple heuristic: A=red, B=yellow, C=green, D=blue
    Object.values(answers).forEach(label => {
      if (label === 'A') colorCounts.color_red++;
      else if (label === 'B') colorCounts.color_yellow++;
      else if (label === 'C') colorCounts.color_green++;
      else if (label === 'D') colorCounts.color_blue++;
    });
    const sorted = Object.entries(colorCounts).sort((a, b) => b[1] - a[1]);
    return { primary: sorted[0][0], secondary: sorted[1][0] };
  }, [answers]);

  const dominantColors = getDominantColors();

  const handleSelectOption = (label) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.order_no]: label
    }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    const unanswered = questions.filter(q => !answers[q.order_no]);
    if (unanswered.length > 0) {
      toast.error(t(
        `Masih ada ${unanswered.length} pertanyaan yang belum dijawab`,
        `There are still ${unanswered.length} unanswered questions`
      ));
      return;
    }

    setSubmitting(true);
    try {
      const answersArray = Object.entries(answers).map(([order_no, label]) => ({
        order_no: parseInt(order_no),
        label
      }));

      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.post(
        `${API}/relasi4/assessments/submit`,
        { assessment_id: assessmentId, answers: answersArray },
        { headers }
      );

      // Check if this is part of a couple invite flow
      const coupleInviteCode = sessionStorage.getItem('couple_invite_code');
      if (coupleInviteCode) {
        // Clear the invite code
        sessionStorage.removeItem('couple_invite_code');
        
        toast.success(t("Quiz selesai! Menghubungkan dengan pasangan...", "Quiz complete! Connecting with partner..."));
        
        try {
          // Join the couple invite
          const joinRes = await axios.post(
            `${API}/relasi4/couple/join/${coupleInviteCode}?partner_assessment_id=${assessmentId}`
          );
          
          if (joinRes.data.success) {
            // Generate couple report
            const reportRes = await axios.post(
              `${API}/relasi4/couple/reports/generate`,
              {
                person_a_assessment_id: joinRes.data.creator_assessment_id,
                person_b_assessment_id: assessmentId
              }
            );
            
            if (reportRes.data.success) {
              toast.success(t("Laporan pasangan berhasil dibuat!", "Couple report created!"));
              navigate(`/relasi4/couple/report/${reportRes.data.report.report_id}`);
              return;
            }
          }
        } catch (coupleError) {
          console.error("Error in couple flow:", coupleError);
          toast.error(t("Gagal membuat laporan pasangan", "Failed to create couple report"));
        }
      }

      // Check if this is part of a family group flow
      const familyInviteCode = sessionStorage.getItem('family_invite_code');
      if (familyInviteCode) {
        const memberName = sessionStorage.getItem('family_member_name') || '';
        
        // Clear the stored values
        sessionStorage.removeItem('family_invite_code');
        sessionStorage.removeItem('family_member_name');
        
        toast.success(t("Quiz selesai! Bergabung dengan grup keluarga...", "Quiz complete! Joining family group..."));
        
        try {
          // Join the family group
          const joinRes = await axios.post(
            `${API}/relasi4/family/join/${familyInviteCode}`,
            {
              assessment_id: assessmentId,
              member_name: memberName
            }
          );
          
          if (joinRes.data.success) {
            toast.success(t(
              `Berhasil bergabung! (${joinRes.data.current_members}/${joinRes.data.max_members} anggota)`,
              `Joined successfully! (${joinRes.data.current_members}/${joinRes.data.max_members} members)`
            ));
            
            // Check if we can generate family report (need 3+ members)
            if (joinRes.data.current_members >= 3) {
              toast.info(t("Membuat laporan keluarga...", "Creating family report..."));
              
              const reportRes = await axios.post(
                `${API}/relasi4/family/reports/generate`,
                { family_group_id: joinRes.data.group_id }
              );
              
              if (reportRes.data.success) {
                navigate(`/relasi4/family/report/${reportRes.data.report.report_id}`);
                return;
              }
            } else {
              // Show result and notify to invite more members
              toast.info(t(
                `Perlu ${3 - joinRes.data.current_members} anggota lagi untuk laporan keluarga`,
                `Need ${3 - joinRes.data.current_members} more members for family report`
              ));
            }
          }
        } catch (familyError) {
          console.error("Error in family flow:", familyError);
          toast.error(t("Gagal bergabung dengan grup keluarga", "Failed to join family group"));
        }
      }

      setResult(response.data);
      toast.success(t("Penilaian selesai!", "Assessment completed!"));
    } catch (error) {
      console.error("Error submitting assessment:", error);
      toast.error(t("Gagal mengirim jawaban", "Failed to submit answers"));
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Quiz type selection state (before quiz starts)
  if (!quizStarted && !loading) {
    return (
      <div className="min-h-screen bg-background">
        {/* Gradient Header */}
        <div className="h-48 relative bg-gradient-to-br from-amber-500 via-orange-500 to-red-500">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white">
              <h1 className="text-3xl md:text-4xl font-bold mb-2" style={{ fontFamily: 'Merriweather, serif' }}>
                RELASI4™
              </h1>
              <p className="text-white/80">{t("Kenali Dirimu, Pahami Relasimu", "Know Yourself, Understand Your Relationships")}</p>
            </div>
          </div>
        </div>

        <main className="max-w-2xl mx-auto px-4 -mt-12 relative z-10 pb-24">
          <Card className="shadow-xl mb-6" data-testid="quiz-selector">
            <CardContent className="p-6 md:p-8">
              <h2 className="text-xl font-bold mb-6 text-center" style={{ fontFamily: 'Merriweather, serif' }}>
                {t("Pilih Jenis Quiz", "Select Quiz Type")}
              </h2>

              <div className="space-y-4">
                {/* Core Quiz */}
                <button
                  onClick={() => {
                    setQuestionSetCode('R4W_CORE_V1');
                    setQuizStarted(true);
                    setLoading(true);
                  }}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all hover:scale-[1.02] ${
                    questionSetCode === 'R4W_CORE_V1' 
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20' 
                      : 'border-secondary hover:border-amber-300'
                  }`}
                  data-testid="select-core-quiz"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-amber-500 rounded-xl text-white">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-1">{t("Quiz Dasar", "Core Quiz")}</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        {t(
                          "20 pertanyaan untuk mengetahui tipe kepribadianmu dalam 5 menit",
                          "20 questions to discover your personality type in 5 minutes"
                        )}
                      </p>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="flex items-center gap-1 text-amber-600">
                          <Clock className="w-3 h-3" /> ~5 {t("menit", "min")}
                        </span>
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="w-3 h-3" /> {t("Gratis", "Free")}
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </button>

                {/* Deep Quiz */}
                <button
                  onClick={() => {
                    setQuestionSetCode('R4T_DEEP_V1');
                    setQuizStarted(true);
                    setLoading(true);
                  }}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all hover:scale-[1.02] ${
                    questionSetCode === 'R4T_DEEP_V1' 
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/20' 
                      : 'border-secondary hover:border-purple-300'
                  }`}
                  data-testid="select-deep-quiz"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl text-white">
                      <Crown className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-lg">{t("Quiz Mendalam", "Deep Quiz")}</h3>
                        <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 rounded-full text-xs font-medium">
                          {t("Rekomendasi", "Recommended")}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {t(
                          "20 pertanyaan mendalam untuk analisis kepribadian yang lebih detail",
                          "20 in-depth questions for more detailed personality analysis"
                        )}
                      </p>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="flex items-center gap-1 text-purple-600">
                          <Clock className="w-3 h-3" /> ~7 {t("menit", "min")}
                        </span>
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="w-3 h-3" /> {t("Gratis", "Free")}
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </button>
              </div>

              {/* Info */}
              <div className="mt-6 p-4 bg-secondary/30 rounded-xl">
                <p className="text-sm text-muted-foreground text-center">
                  {t(
                    "Setelah quiz, kamu bisa undang pasangan atau keluarga untuk melihat kompatibilitas!",
                    "After the quiz, you can invite your partner or family to see compatibility!"
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Leaderboard Link */}
          <div className="text-center">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/relasi4/leaderboard')}
              className="text-muted-foreground"
            >
              🏆 {t("Lihat Leaderboard", "View Leaderboard")}
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-4">
            {/* Animated loading circles */}
            {Object.values(COLOR_PALETTE).map((color, i) => (
              <div
                key={i}
                className="absolute w-4 h-4 rounded-full animate-ping"
                style={{
                  backgroundColor: color.hex,
                  top: '50%',
                  left: '50%',
                  transform: `translate(-50%, -50%) rotate(${i * 90}deg) translateY(-20px)`,
                  animationDelay: `${i * 0.2}s`
                }}
              />
            ))}
          </div>
          <p className="text-muted-foreground">{t("Memuat RELASI4™...", "Loading RELASI4™...")}</p>
        </div>
      </div>
    );
  }

  // Result state - show share card
  if (result) {
    const primaryColor = COLOR_PALETTE[result.primary_color];
    const secondaryColor = COLOR_PALETTE[result.secondary_color];

    return (
      <div className="min-h-screen bg-background">
        {/* Gradient background based on result */}
        <div 
          className="fixed inset-0 opacity-10"
          style={{
            background: `linear-gradient(135deg, ${primaryColor?.hex} 0%, ${secondaryColor?.hex} 100%)`
          }}
        />

        <main className="relative z-10 pt-8 pb-24 px-4 md:px-8">
          <div className="max-w-2xl mx-auto">
            {/* Result Card */}
            <Card className="overflow-hidden shadow-xl animate-scale-in" data-testid="result-card">
              {/* Colorful header */}
              <div 
                className="h-32 relative"
                style={{
                  background: `linear-gradient(135deg, ${primaryColor?.hex} 0%, ${secondaryColor?.hex} 100%)`
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-12 h-12 text-white/80" />
                </div>
              </div>

              <CardContent className="p-6 md:p-8 -mt-8">
                {/* Profile circles */}
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <div 
                      className="w-24 h-24 rounded-full border-4 border-background shadow-lg flex items-center justify-center"
                      style={{ backgroundColor: primaryColor?.hex }}
                    >
                      <span className="text-white font-bold text-2xl">
                        {result.color_scores?.[0]?.score || 0}
                      </span>
                    </div>
                    <div 
                      className="absolute -right-4 -bottom-2 w-16 h-16 rounded-full border-4 border-background shadow-lg flex items-center justify-center"
                      style={{ backgroundColor: secondaryColor?.hex }}
                    >
                      <span className="text-white font-bold">
                        {result.color_scores?.[1]?.score || 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Result title */}
                <div className="text-center mb-6">
                  <h2 className="text-2xl md:text-3xl font-bold mb-2" style={{ fontFamily: 'Merriweather, serif' }}>
                    {primaryColor?.archetype} + {secondaryColor?.archetype}
                  </h2>
                  <p className="text-muted-foreground">
                    {language === 'id' 
                      ? `${primaryColor?.name.id} dominan dengan ${secondaryColor?.name.id} sekunder`
                      : `Dominant ${primaryColor?.name.en} with secondary ${secondaryColor?.name.en}`
                    }
                  </p>
                </div>

                {/* Color score bars */}
                <div className="space-y-3 mb-6">
                  {result.color_scores?.map((score) => (
                    <div key={score.dimension} className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: score.color_hex }}
                      />
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span>{language === 'id' ? score.label_id : score.label_en}</span>
                          <span className="font-medium">{score.score}</span>
                        </div>
                        <div className="h-2 bg-secondary/50 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-1000"
                            style={{ 
                              width: `${Math.min(score.score * 2, 100)}%`,
                              backgroundColor: score.color_hex 
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-secondary/30 rounded-xl mb-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold" style={{ color: primaryColor?.hex }}>
                      {result.questions_answered}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {language === 'id' ? 'Pertanyaan' : 'Questions'}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold" style={{ color: secondaryColor?.hex }}>
                      {result.completion_rate}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {language === 'id' ? 'Selesai' : 'Complete'}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground">
                      {formatTime(elapsedTime)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {language === 'id' ? 'Waktu' : 'Time'}
                    </p>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="space-y-3">
                  <Button 
                    onClick={() => setShowShareModal(true)}
                    className="w-full btn-primary flex items-center justify-center gap-2"
                    data-testid="share-result-btn"
                  >
                    <Share2 className="w-5 h-5" />
                    {language === 'id' ? 'Bagikan Hasil' : 'Share Result'}
                  </Button>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      variant="outline" 
                      onClick={() => navigate(`/relasi4/result/${result.assessment_id}`)}
                      className="rounded-full"
                      data-testid="view-full-result-btn"
                    >
                      {language === 'id' ? 'Lihat Detail' : 'View Details'}
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setResult(null);
                        setAnswers({});
                        setCurrentIndex(0);
                        startTime.current = Date.now();
                        setElapsedTime(0);
                      }}
                      className="rounded-full"
                    >
                      {language === 'id' ? 'Ulangi' : 'Retry'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Teaser for premium */}
            <div className="mt-6 p-6 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-xl border border-amber-500/20">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-500/20 rounded-full">
                  <Sparkles className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h4 className="font-bold mb-1">
                    {language === 'id' ? 'Dapatkan Laporan Premium' : 'Get Premium Report'}
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    {language === 'id' 
                      ? 'Analisis mendalam tentang kepribadianmu, pola konflik, dan tips hubungan personal.'
                      : 'Deep analysis of your personality, conflict patterns, and personal relationship tips.'
                    }
                  </p>
                  <Button 
                    size="sm" 
                    className="bg-amber-500 hover:bg-amber-600"
                    onClick={() => navigate(`/relasi4/result/${result.assessment_id}`)}
                    data-testid="get-premium-btn"
                  >
                    {language === 'id' ? 'Lihat Laporan Premium' : 'View Premium Report'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Share Modal */}
        <ShareCardModal 
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          result={result}
          language={language}
        />

        {/* CSS for shimmer animation */}
        <style>{`
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          .animate-scale-in {
            animation: scaleIn 0.5s ease-out;
          }
          @keyframes scaleIn {
            from { transform: scale(0.9); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  // Quiz state
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="max-w-4xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-16">
            <button 
              onClick={() => navigate("/")} 
              className="flex items-center text-muted-foreground hover:text-foreground"
              data-testid="back-btn"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              {t("Keluar", "Exit")}
            </button>
            <div className="flex items-center gap-4">
              {/* Circular progress indicator */}
              <div className="relative">
                <CircularProgress 
                  progress={progress} 
                  size={44} 
                  strokeWidth={3}
                  color={COLOR_PALETTE[dominantColors.primary]?.hex || '#4A3B32'}
                />
                <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                  {answeredCount}/{questions.length}
                </span>
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>{formatTime(elapsedTime)}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-24 px-4 md:px-8">
        <div className="max-w-3xl mx-auto">
          {/* Animated Progress Bar */}
          <div className="mb-8">
            <AnimatedProgressBar 
              progress={progress}
              primaryColor={dominantColors.primary}
              secondaryColor={dominantColors.secondary}
            />
            <div className="flex justify-between items-center mt-2">
              <p className="text-sm text-muted-foreground">
                {t("Pertanyaan", "Question")} {currentIndex + 1} {t("dari", "of")} {questions.length}
              </p>
              <div className="flex gap-1">
                {Object.entries(COLOR_PALETTE).map(([key, color]) => {
                  const isActive = key === dominantColors.primary || key === dominantColors.secondary;
                  return (
                    <div 
                      key={key}
                      className={`w-3 h-3 rounded-full transition-all duration-300 ${isActive ? 'scale-125' : 'scale-100 opacity-40'}`}
                      style={{ backgroundColor: color.hex }}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Question Card */}
          {currentQuestion && (
            <Card className="mb-8 overflow-hidden animate-fade-in" data-testid="question-card">
              {/* Color accent bar */}
              <div 
                className="h-1 transition-all duration-500"
                style={{
                  background: `linear-gradient(90deg, ${COLOR_PALETTE[dominantColors.primary]?.hex} 0%, ${COLOR_PALETTE[dominantColors.secondary]?.hex} 100%)`
                }}
              />
              <CardContent className="p-6 md:p-8">
                <h2 className="text-xl md:text-2xl font-bold text-foreground mb-6" style={{ fontFamily: 'Merriweather, serif' }}>
                  {currentQuestion.prompt}
                </h2>

                {/* Options */}
                <div className="space-y-3">
                  {currentQuestion.answers?.map((option, idx) => {
                    const isSelected = answers[currentQuestion.order_no] === option.label;
                    const optionColors = ['color_red', 'color_yellow', 'color_green', 'color_blue'];
                    const colorKey = optionColors[idx] || 'color_red';
                    const color = COLOR_PALETTE[colorKey]?.hex || "#4A3B32";

                    return (
                      <button
                        key={idx}
                        onClick={() => handleSelectOption(option.label)}
                        className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-300 ${
                          isSelected 
                            ? 'shadow-lg scale-[1.02]' 
                            : 'hover:border-muted-foreground/30 hover:bg-secondary/30'
                        }`}
                        style={isSelected ? { 
                          borderColor: color, 
                          backgroundColor: color + "15",
                          boxShadow: `0 4px 20px ${color}30`
                        } : { borderColor: '#E6E2D8' }}
                        data-testid={`option-${option.label}`}
                      >
                        <div className="flex items-start gap-3">
                          <div 
                            className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-300`}
                            style={{ 
                              borderColor: isSelected ? color : "#E6E2D8",
                              backgroundColor: isSelected ? color : "transparent"
                            }}
                          >
                            {isSelected ? (
                              <CheckCircle className="w-5 h-5 text-white" />
                            ) : (
                              <span className="text-muted-foreground font-medium">{option.label}</span>
                            )}
                          </div>
                          <span className="text-foreground pt-1">
                            {option.text}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="rounded-full"
              data-testid="prev-btn"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("Sebelumnya", "Previous")}
            </Button>

            {currentIndex < questions.length - 1 ? (
              <Button
                onClick={handleNext}
                disabled={!answers[currentQuestion?.order_no]}
                className="btn-primary"
                data-testid="next-btn"
              >
                {t("Selanjutnya", "Next")}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={submitting || answeredCount < questions.length}
                className="btn-primary"
                data-testid="submit-btn"
              >
                {submitting ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    {t("Menghitung...", "Calculating...")}
                  </>
                ) : (
                  <>
                    {t("Lihat Hasil", "See Result")}
                    <Sparkles className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Question Navigator */}
          <div className="mt-8 p-4 bg-secondary/30 rounded-xl">
            <p className="text-sm text-muted-foreground mb-3">{t("Navigasi:", "Navigation:")}</p>
            <div className="flex flex-wrap gap-2">
              {questions.map((q, idx) => {
                const isAnswered = !!answers[q.order_no];
                const isCurrent = idx === currentIndex;
                const answerLabel = answers[q.order_no];
                const colorMap = { A: 'color_red', B: 'color_yellow', C: 'color_green', D: 'color_blue' };
                const answerColor = answerLabel ? COLOR_PALETTE[colorMap[answerLabel]]?.hex : null;

                return (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-all duration-300 ${
                      isCurrent 
                        ? 'ring-2 ring-primary ring-offset-2' 
                        : ''
                    }`}
                    style={isAnswered ? {
                      backgroundColor: answerColor,
                      color: 'white'
                    } : {
                      backgroundColor: isCurrent ? '#4A3B32' : '#E6E2D8',
                      color: isCurrent ? 'white' : '#7A6E62'
                    }}
                    data-testid={`nav-${idx}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* CSS for animations */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-fade-in {
          animation: fadeIn 0.4s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default Relasi4QuizPage;
