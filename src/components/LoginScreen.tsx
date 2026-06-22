import React, { useState } from 'react';
import { BookOpen, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { db, isSupabaseConfigured } from '../lib/supabaseClient';

interface LoginScreenProps {
  onContinueAsGuest: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onContinueAsGuest }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    if (!isSupabaseConfigured) {
      setError('Supabase 키 설정이 필요합니다. .env 파일을 먼저 작성해주세요.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { error: authError } = await db.signInWithGoogle();
      if (authError) throw authError;
    } catch (e: any) {
      console.error(e);
      setError(e.message || '로그인 요청 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '80vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '1.5rem' 
    }}>
      <div className="glass-panel animate-fade-in" style={{ 
        maxWidth: '480px', 
        width: '100%', 
        padding: '3rem 2rem', 
        textAlign: 'center' 
      }}>
        {/* App Branding */}
        <div style={{ 
          background: 'var(--primary)', 
          display: 'inline-flex', 
          padding: '1rem', 
          borderRadius: 'var(--radius-lg)', 
          color: 'white', 
          marginBottom: '1.5rem',
          boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)'
        }}>
          <BookOpen size={36} />
        </div>

        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
          English 1800
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem' }}>
          영단어 암기 & 맞춤 오답노트 서비스
        </p>

        {/* Benefits list */}
        <div style={{ 
          textAlign: 'left', 
          background: 'rgba(255, 255, 255, 0.02)', 
          border: '1px solid var(--border-light)', 
          borderRadius: 'var(--radius-md)', 
          padding: '1.25rem', 
          marginBottom: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <ShieldCheck size={18} style={{ color: 'var(--success)', flexShrink: 0, marginTop: '0.1rem' }} />
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              **오답노트 클라우드 백업**: 기기를 바꾸거나 캐시를 비워도 틀린 단어가 보관됩니다.
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <ShieldCheck size={18} style={{ color: 'var(--success)', flexShrink: 0, marginTop: '0.1rem' }} />
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              **학습 기록 동기화**: 학습한 강의 진도와 퀴즈 최고 점수가 실시간 연동됩니다.
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <ShieldCheck size={18} style={{ color: 'var(--success)', flexShrink: 0, marginTop: '0.1rem' }} />
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              **모바일-PC 연동**: 이동 중에는 모바일로, 자리에선 PC로 공부하세요.
            </span>
          </div>
        </div>

        {error && (
          <div style={{ 
            background: 'var(--danger-glow)', 
            border: '1px solid rgba(239, 68, 68, 0.2)', 
            borderRadius: 'var(--radius-md)', 
            padding: '0.75rem 1rem', 
            color: '#f87171', 
            fontSize: '0.85rem', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            marginBottom: '1.5rem',
            textAlign: 'left'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button 
            onClick={handleGoogleLogin} 
            className="btn btn-primary"
            disabled={loading}
            style={{ 
              padding: '0.9rem', 
              fontSize: '1rem',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '0.75rem'
            }}
          >
            {loading ? (
              <span style={{ border: '2px solid rgba(255,255,255,0.2)', borderTop: '2px solid white', borderRadius: '50%', width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} />
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
                Google 계정으로 로그인
              </>
            )}
          </button>

          <button 
            onClick={onContinueAsGuest} 
            className="btn btn-outline"
            disabled={loading}
            style={{ 
              padding: '0.8rem', 
              fontSize: '0.9rem',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--text-secondary)'
            }}
          >
            로그인 없이 게스트로 시작하기 <ArrowRight size={14} />
          </button>
        </div>

        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
};
