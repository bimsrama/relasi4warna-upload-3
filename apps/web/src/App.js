import React, { createContext, useContext, useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";

// Pages
import LandingPage from "./pages/LandingPage";
import SeriesPage from "./pages/SeriesPage";
import QuizPage from "./pages/QuizPage";
import ResultPage from "./pages/ResultPage";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import PricingPage from "./pages/PricingPage";
import CheckoutPage from "./pages/CheckoutPage";
import HowItWorksPage from "./pages/HowItWorksPage";
import FAQPage from "./pages/FAQPage";
import AuthCallback from "./pages/AuthCallback";
import AdminPage from "./pages/AdminPage";
import CouplesPage from "./pages/CouplesPage";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import TeamPackPage from "./pages/TeamPackPage";
import ChallengePage from "./pages/ChallengePage";
import BlogPage from "./pages/BlogPage";
import CompatibilityPage from "./pages/CompatibilityPage";
import AISafeguardPage from "./pages/AISafeguardPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import DeepDivePage from "./pages/DeepDivePage";
import HITLAnalyticsPage from "./pages/HITLAnalyticsPage";
import EliteReportPage from "./pages/EliteReportPage";
import Relasi4QuizPage from "./pages/Relasi4QuizPage";
import Relasi4TeaserPage from "./pages/Relasi4TeaserPage";
import Relasi4ReportPage from "./pages/Relasi4ReportPage";
import Relasi4PaymentFinishPage from "./pages/Relasi4PaymentFinishPage";
import Relasi4CoupleReportPage from "./pages/Relasi4CoupleReportPage";
import Relasi4CoupleJoinPage from "./pages/Relasi4CoupleJoinPage";
import Relasi4FamilyReportPage from "./pages/Relasi4FamilyReportPage";
import Relasi4FamilyJoinPage from "./pages/Relasi4FamilyJoinPage";
import Relasi4AdminPage from "./pages/Relasi4AdminPage";
import Relasi4LeaderboardPage from "./pages/Relasi4LeaderboardPage";
import Relasi4ProgressPage from "./pages/Relasi4ProgressPage";
import Relasi4AnalyticsPage from "./pages/Relasi4AnalyticsPage";
import Relasi4HeatmapPage from "./pages/Relasi4HeatmapPage";
import WhitepaperPage from "./pages/WhitepaperPage";

// Components
import { BudgetBanner } from "./components/BudgetBanner";

import "./App.css";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Language Context
const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem("language") || "id";
  });

  const toggleLanguage = () => {
    const newLang = language === "id" ? "en" : "id";
    setLanguage(newLang);
    localStorage.setItem("language", newLang);
  };

  const t = (id, en) => (language === "id" ? id : en);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

// Auth Context
const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          const response = await axios.get(`${API}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUser(response.data);
        } catch (error) {
          console.error("Auth check failed:", error);
          localStorage.removeItem("token");
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, [token]);

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { email, password });
      const { access_token, user: userData } = response.data;
      localStorage.setItem("token", access_token);
      setToken(access_token);
      setUser(userData);
      toast.success("Login berhasil!");
      return true;
    } catch (error) {
      const message = error.response?.data?.detail || "Login gagal";
      toast.error(message);
      return false;
    }
  };

  const register = async (email, password, name, language) => {
    try {
      const response = await axios.post(`${API}/auth/register`, { email, password, name, language });
      const { access_token, user: userData } = response.data;
      localStorage.setItem("token", access_token);
      setToken(access_token);
      setUser(userData);
      toast.success("Registrasi berhasil!");
      return true;
    } catch (error) {
      const message = error.response?.data?.detail || "Registrasi gagal";
      toast.error(message);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    toast.success("Logout berhasil");
  };

  const loginWithSession = (sessionToken, userData) => {
    localStorage.setItem("token", sessionToken);
    setToken(sessionToken);
    setUser(userData);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, loginWithSession, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

// Protected Route
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse-soft">
          <div className="w-16 h-16 rounded-full bg-primary/20"></div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

// App Router
function AppRouter() {
  const location = useLocation();
  
  // Handle OAuth callback
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/how-it-works" element={<HowItWorksPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/faq" element={<FAQPage />} />
      <Route path="/series" element={<SeriesPage />} />
      <Route path="/series/:seriesId" element={<SeriesPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/blog" element={<BlogPage />} />
      <Route path="/blog/:slug" element={<BlogPage />} />
      <Route path="/compatibility" element={<CompatibilityPage />} />
      <Route path="/ai-safeguard" element={<AISafeguardPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      
      {/* RELASI4™ Quiz - Public access (supports anonymous) */}
      <Route path="/relasi4" element={<Relasi4QuizPage />} />
      <Route path="/relasi4/:setCode" element={<Relasi4QuizPage />} />
      <Route path="/relasi4/result/:assessmentId" element={<Relasi4TeaserPage />} />
      <Route path="/relasi4/report/:reportId" element={<Relasi4ReportPage />} />
      <Route path="/relasi4/payment/finish" element={<Relasi4PaymentFinishPage />} />
      <Route path="/relasi4/couple/report/:reportId" element={<Relasi4CoupleReportPage />} />
      <Route path="/relasi4/couple/join/:inviteCode" element={<Relasi4CoupleJoinPage />} />
      <Route path="/relasi4/family/report/:reportId" element={<Relasi4FamilyReportPage />} />
      <Route path="/relasi4/family/join/:inviteCode" element={<Relasi4FamilyJoinPage />} />
      <Route path="/relasi4/leaderboard" element={<Relasi4LeaderboardPage />} />
      <Route path="/relasi4/progress" element={<Relasi4ProgressPage />} />
      <Route path="/relasi4/admin" element={<Relasi4AdminPage />} />
      <Route path="/relasi4/analytics" element={<Relasi4AnalyticsPage />} />
      <Route path="/relasi4/heatmap" element={<Relasi4HeatmapPage />} />
      <Route path="/whitepaper" element={<WhitepaperPage />} />
      
      {/* Protected Routes */}
      <Route path="/quiz/:series" element={
        <ProtectedRoute>
          <QuizPage />
        </ProtectedRoute>
      } />
      <Route path="/result/:resultId" element={
        <ProtectedRoute>
          <ResultPage />
        </ProtectedRoute>
      } />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      } />
      <Route path="/checkout/:paymentId" element={
        <ProtectedRoute>
          <CheckoutPage />
        </ProtectedRoute>
      } />
      <Route path="/admin" element={
        <ProtectedRoute>
          <AdminPage />
        </ProtectedRoute>
      } />
      <Route path="/couples" element={
        <ProtectedRoute>
          <CouplesPage />
        </ProtectedRoute>
      } />
      <Route path="/couples/:packId" element={
        <ProtectedRoute>
          <CouplesPage />
        </ProtectedRoute>
      } />
      <Route path="/couples/join/:packId" element={
        <ProtectedRoute>
          <CouplesPage />
        </ProtectedRoute>
      } />
      <Route path="/team" element={
        <ProtectedRoute>
          <TeamPackPage />
        </ProtectedRoute>
      } />
      <Route path="/team/:packId" element={
        <ProtectedRoute>
          <TeamPackPage />
        </ProtectedRoute>
      } />
      <Route path="/team/join/:inviteId" element={
        <ProtectedRoute>
          <TeamPackPage />
        </ProtectedRoute>
      } />
      <Route path="/team/join-link/:packId" element={
        <ProtectedRoute>
          <TeamPackPage />
        </ProtectedRoute>
      } />
      <Route path="/challenge" element={
        <ProtectedRoute>
          <ChallengePage />
        </ProtectedRoute>
      } />
      <Route path="/deep-dive/:resultId" element={
        <ProtectedRoute>
          <DeepDivePage />
        </ProtectedRoute>
      } />
      <Route path="/hitl-analytics" element={
        <ProtectedRoute>
          <HITLAnalyticsPage />
        </ProtectedRoute>
      } />
      <Route path="/elite-report/:resultId" element={
        <ProtectedRoute>
          <EliteReportPage />
        </ProtectedRoute>
      } />
      
      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <BudgetBannerWithLanguage />
          <div className="min-h-screen bg-background">
            <AppRouter />
            <Toaster position="top-center" richColors />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}

// Wrapper component to access language context
function BudgetBannerWithLanguage() {
  const { language } = useLanguage();
  return <BudgetBanner language={language} />;
}

export default App;
