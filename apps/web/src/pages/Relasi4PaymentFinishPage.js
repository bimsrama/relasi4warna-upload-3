import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLanguage, API } from "../App";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { 
  CheckCircle, Loader2, XCircle, ArrowRight, 
  Clock
} from "lucide-react";
import axios from "axios";

// Payment finish handler component
const Relasi4PaymentFinishPage = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [status, setStatus] = useState("loading"); // loading, success, pending, failed
  const [paymentData, setPaymentData] = useState(null);

  const orderId = searchParams.get("order_id");

  useEffect(() => {
    let isMounted = true;
    
    const checkPayment = async () => {
      if (!orderId) {
        if (isMounted) setStatus("failed");
        return;
      }
      
      try {
        const response = await axios.get(`${API}/relasi4/payment/status/${orderId}`);
        if (!isMounted) return;
        
        const data = response.data;
        setPaymentData(data);

        if (data.status === "paid") {
          setStatus("success");
          // If report exists, redirect to it
          if (data.report_id) {
            setTimeout(() => {
              if (isMounted) navigate(`/relasi4/report/${data.report_id}`);
            }, 3000);
          }
        } else if (data.status === "pending") {
          setStatus("pending");
        } else {
          setStatus("failed");
        }
      } catch (error) {
        console.error("Error checking payment:", error);
        if (isMounted) setStatus("failed");
      }
    };
    
    checkPayment();
    
    return () => { isMounted = false; };
  }, [orderId, navigate]);

  // Loading state
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-primary" />
            <h2 className="text-xl font-bold mb-2">
              {t("Memverifikasi Pembayaran...", "Verifying Payment...")}
            </h2>
            <p className="text-muted-foreground">
              {t("Mohon tunggu sebentar", "Please wait a moment")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (status === "success") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full overflow-hidden">
          <div className="h-2 bg-green-500" />
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2 text-green-600">
              {t("Pembayaran Berhasil!", "Payment Successful!")}
            </h2>
            <p className="text-muted-foreground mb-6">
              {t(
                "Terima kasih! Laporan premium Anda sedang dibuat.",
                "Thank you! Your premium report is being generated."
              )}
            </p>

            {paymentData?.report_id ? (
              <Button 
                onClick={() => navigate(`/relasi4/report/${paymentData.report_id}`)}
                className="w-full btn-primary"
                data-testid="view-report-btn"
              >
                {t("Lihat Laporan Premium", "View Premium Report")}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t("Membuat laporan...", "Generating report...")}</span>
              </div>
            )}

            <p className="text-xs text-muted-foreground mt-4">
              Order ID: {orderId}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pending state
  if (status === "pending") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full overflow-hidden">
          <div className="h-2 bg-amber-500" />
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-4 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
              <Clock className="w-10 h-10 text-amber-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2 text-amber-600">
              {t("Menunggu Pembayaran", "Awaiting Payment")}
            </h2>
            <p className="text-muted-foreground mb-6">
              {t(
                "Pembayaran Anda sedang diproses. Silakan selesaikan pembayaran.",
                "Your payment is being processed. Please complete the payment."
              )}
            </p>

            <div className="space-y-3">
              <Button 
                onClick={() => window.location.reload()}
                variant="outline"
                className="w-full"
              >
                {t("Cek Status Lagi", "Check Status Again")}
              </Button>
              <Button 
                onClick={() => navigate(`/relasi4/result/${paymentData?.assessment_id}`)}
                variant="ghost"
                className="w-full"
              >
                {t("Kembali ke Hasil", "Back to Result")}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground mt-4">
              Order ID: {orderId}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Failed state
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full overflow-hidden">
        <div className="h-2 bg-red-500" />
        <CardContent className="p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <XCircle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold mb-2 text-red-600">
            {t("Pembayaran Gagal", "Payment Failed")}
          </h2>
          <p className="text-muted-foreground mb-6">
            {t(
              "Maaf, pembayaran tidak dapat diproses. Silakan coba lagi.",
              "Sorry, payment could not be processed. Please try again."
            )}
          </p>

          <div className="space-y-3">
            <Button 
              onClick={() => navigate("/relasi4")}
              className="w-full btn-primary"
            >
              {t("Kembali ke Quiz", "Back to Quiz")}
            </Button>
            <Button 
              onClick={() => navigate("/")}
              variant="ghost"
              className="w-full"
            >
              {t("Ke Beranda", "Go Home")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Relasi4PaymentFinishPage;
