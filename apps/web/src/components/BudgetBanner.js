import React, { useEffect, useState } from 'react';
import { AlertTriangle, XCircle, Clock } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * BudgetBanner Component
 * Displays a warning/error banner when AI budget is low or exhausted
 * 
 * States:
 * - ok: No banner shown
 * - warning: Yellow banner, AI capacity is getting low
 * - blocked: Red banner, AI capacity exhausted
 */
export const BudgetBanner = ({ language = 'id' }) => {
  const [status, setStatus] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const fetchBudgetStatus = async () => {
      try {
        const response = await fetch(`${API_URL}/api/system/budget-status`);
        if (response.ok) {
          const data = await response.json();
          setStatus(data);
        }
      } catch (error) {
        console.error('Failed to fetch budget status:', error);
      }
    };

    fetchBudgetStatus();
    
    // Refresh status every 5 minutes
    const interval = setInterval(fetchBudgetStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Don't show if status is ok or dismissed
  if (!status || status.status === 'ok' || dismissed) {
    return null;
  }

  const isBlocked = status.status === 'blocked';
  const isWarning = status.status === 'warning';

  // Calculate hours until reset
  const hoursUntilReset = Math.ceil(status.retry_after_seconds / 3600);

  const messages = {
    id: {
      warning: {
        title: 'Kapasitas AI Hampir Penuh',
        description: `Tersisa ${status.capacity_remaining_percent?.toFixed(0)}% kapasitas AI. Layanan mungkin akan dibatasi sementara.`
      },
      blocked: {
        title: 'Kapasitas AI Tercapai',
        description: `Layanan AI tidak tersedia saat ini. Silakan coba lagi dalam ${hoursUntilReset} jam.`
      }
    },
    en: {
      warning: {
        title: 'AI Capacity Running Low',
        description: `${status.capacity_remaining_percent?.toFixed(0)}% AI capacity remaining. Service may be limited temporarily.`
      },
      blocked: {
        title: 'AI Capacity Reached',
        description: `AI service is currently unavailable. Please try again in ${hoursUntilReset} hours.`
      }
    }
  };

  const content = messages[language]?.[status.status] || messages.en[status.status];

  return (
    <div 
      data-testid="budget-banner"
      className={`fixed top-0 left-0 right-0 z-50 px-4 py-3 shadow-lg ${
        isBlocked 
          ? 'bg-red-50 border-b border-red-200' 
          : 'bg-amber-50 border-b border-amber-200'
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isBlocked ? (
            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          )}
          <div>
            <p className={`font-medium ${isBlocked ? 'text-red-800' : 'text-amber-800'}`}>
              {content?.title}
            </p>
            <p className={`text-sm ${isBlocked ? 'text-red-700' : 'text-amber-700'}`}>
              {content?.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {status.retry_after_seconds > 0 && (
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span>{hoursUntilReset}h</span>
            </div>
          )}
          {isWarning && (
            <button
              onClick={() => setDismissed(true)}
              className="text-amber-700 hover:text-amber-900 text-sm underline"
              data-testid="budget-banner-dismiss"
            >
              {language === 'id' ? 'Tutup' : 'Dismiss'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BudgetBanner;
