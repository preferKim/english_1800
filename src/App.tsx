import { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { StudyMode } from './components/StudyMode';
import { QuizMode } from './components/QuizMode';
import { NotebookMode } from './components/NotebookMode';
import { LoginScreen } from './components/LoginScreen';
import { db, supabase } from './lib/supabaseClient';
import { BookOpen, BookMarked, LogOut } from 'lucide-react';

function App() {
  const [activeScreen, setActiveScreen] = useState<'dashboard' | 'study' | 'quiz' | 'notebook'>('dashboard');
  const [selectedLessonId, setSelectedLessonId] = useState<string>('');
  
  // Auth & Session States
  const [userId, setUserId] = useState<string>('');
  const [userMetadata, setUserMetadata] = useState<{ name?: string; email?: string; avatarUrl?: string } | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // Progress States
  const [completedStudies, setCompletedStudies] = useState<string[]>([]);
  const [quizScores, setQuizScores] = useState<{ [lessonId: string]: { score: number; total: number } }>({});
  const [incorrectCount, setIncorrectCount] = useState<number>(0);

  // 1. Auth Listener
  useEffect(() => {
    if (!supabase) {
      // No Supabase, stop loading (LoginScreen will display configure error warning)
      setAuthLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        handleUserLogin(session.user);
      } else {
        // No session found, force sign-in
        setAuthLoading(false);
      }
    });

    // Listen to changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (session) {
        handleUserLogin(session.user);
      } else {
        handleUserLogout();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Helper: Handle Login Session
  const handleUserLogin = async (sbUser: any) => {
    const uid = sbUser.id;
    setUserId(uid);
    localStorage.setItem('english_1800_user_id', uid);
    localStorage.setItem('english_1800_auth_mode', 'auth');

    // Extract google metadata
    const meta = sbUser.user_metadata;
    setUserMetadata({
      name: meta?.full_name || sbUser.email,
      email: sbUser.email,
      avatarUrl: meta?.avatar_url
    });

    // Fetch cloud-synced progress
    try {
      const progress = await db.getUserProgress(uid);
      if (progress) {
        setCompletedStudies(progress.completed_lessons || []);
        setQuizScores(progress.quiz_scores || {});
        // Save to localStorage as a backup
        localStorage.setItem('english_1800_completed_studies', JSON.stringify(progress.completed_lessons || []));
        localStorage.setItem('english_1800_quiz_scores', JSON.stringify(progress.quiz_scores || {}));
      } else {
        // Fallback to local if no cloud profile exists yet
        loadLocalProgress();
      }
    } catch (e) {
      console.error('Error fetching cloud progress, using local storage backup:', e);
      loadLocalProgress();
    }

    setAuthLoading(false);
  };

  // Helper: Handle Logout
  const handleUserLogout = () => {
    setUserId('');
    setUserMetadata(null);
    localStorage.removeItem('english_1800_auth_mode');
    setCompletedStudies([]);
    setQuizScores({});
    setIncorrectCount(0);
    setActiveScreen('dashboard');
    setAuthLoading(false);
  };

  // Load progress from localStorage
  const loadLocalProgress = () => {
    const storedCompleted = localStorage.getItem('english_1800_completed_studies');
    if (storedCompleted) {
      setCompletedStudies(JSON.parse(storedCompleted));
    } else {
      setCompletedStudies([]);
    }

    const storedScores = localStorage.getItem('english_1800_quiz_scores');
    if (storedScores) {
      setQuizScores(JSON.parse(storedScores));
    } else {
      setQuizScores({});
    }
  };

  // Sync active incorrect count when userId/guest status is finalized
  const refreshIncorrectCount = async () => {
    if (!userId) return;
    try {
      const list = await db.getIncorrectAnswers(userId);
      const activeMistakes = list.filter(item => !item.is_learned).length;
      setIncorrectCount(activeMistakes);
    } catch (e) {
      console.error('Failed to sync incorrect count:', e);
    }
  };

  useEffect(() => {
    if (userId) {
      refreshIncorrectCount();
    }
  }, [userId]);

  // Actions
  const handleSelectLesson = (lessonId: string, mode: 'study' | 'quiz') => {
    setSelectedLessonId(lessonId);
    setActiveScreen(mode);
  };

  const handleCompleteStudy = async (lessonId: string) => {
    if (!completedStudies.includes(lessonId)) {
      const updated = [...completedStudies, lessonId];
      setCompletedStudies(updated);
      localStorage.setItem('english_1800_completed_studies', JSON.stringify(updated));

      // Push to cloud
      await db.saveUserProgress(userId, updated, quizScores);
    }
  };

  const handleSaveScore = async (lessonId: string, score: number, total: number) => {
    const existing = quizScores[lessonId];
    const existingPct = existing ? existing.score / existing.total : 0;
    const newPct = score / total;

    if (newPct >= existingPct) {
      const updated = {
        ...quizScores,
        [lessonId]: { score, total }
      };
      setQuizScores(updated);
      localStorage.setItem('english_1800_quiz_scores', JSON.stringify(updated));

      // Push to cloud
      await db.saveUserProgress(userId, completedStudies, updated);
    }
    
    setTimeout(() => {
      refreshIncorrectCount();
    }, 500);
  };

  const triggerSignOut = async () => {
    setAuthLoading(true);
    await db.signOut();
  };

  // --- Rendering States ---

  // Auth checking loading screen
  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ border: '4px solid rgba(255,255,255,0.1)', borderTop: '4px solid var(--primary)', borderRadius: '50%', width: '45px', height: '45px', animation: 'spin 1s linear infinite', marginBottom: '1rem' }} />
        <p style={{ color: 'var(--text-secondary)' }}>사용자 인증 정보를 확인하는 중...</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Not logged in: Show Login Portal
  if (!userId) {
    return <LoginScreen />;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Global Banner Header */}
      <header 
        className="glass-panel" 
        style={{ 
          margin: '1rem', 
          padding: '0.75rem 2rem', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-light)',
          position: 'sticky',
          top: '1rem',
          zIndex: 100
        }}
      >
        <div 
          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
          onClick={() => setActiveScreen('dashboard')}
        >
          <div style={{ background: 'var(--primary)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', color: 'white' }}>
            <BookOpen size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 800, lineHeight: 1.1 }}>English 1800</h1>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>단어 학습 & 오답노트</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          
          {/* User profile / Logged In info */}
          {userMetadata && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.03)', padding: '0.35rem 0.75rem', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-light)' }}>
              {userMetadata.avatarUrl ? (
                <img 
                  src={userMetadata.avatarUrl} 
                  alt="avatar" 
                  style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} 
                />
              ) : (
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold' }}>
                  {userMetadata.name?.charAt(0).toUpperCase()}
                </div>
              )}
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {userMetadata.name}
              </span>
              <button 
                onClick={triggerSignOut}
                style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', display: 'flex', padding: 0 }}
                title="로그아웃"
              >
                <LogOut size={16} onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'} />
              </button>
            </div>
          )}

          {/* Notebook button */}
          <button 
            className={`btn ${activeScreen === 'notebook' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveScreen('notebook')}
            style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
          >
            <BookMarked size={16} /> 오답노트
            {incorrectCount > 0 && (
              <span 
                style={{ 
                  background: 'var(--danger)', 
                  color: 'white', 
                  borderRadius: '50%', 
                  padding: '0.1rem 0.4rem', 
                  fontSize: '0.7rem', 
                  fontWeight: 'bold', 
                  marginLeft: '0.25rem' 
                }}
              >
                {incorrectCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flexGrow: 1, paddingBottom: '3rem' }} className="container">
        {activeScreen === 'dashboard' && (
          <Dashboard
            onSelectLesson={handleSelectLesson}
            onGoToNotebook={() => setActiveScreen('notebook')}
            completedStudies={completedStudies}
            quizScores={quizScores}
            incorrectCount={incorrectCount}
          />
        )}

        {activeScreen === 'study' && (
          <StudyMode
            lessonId={selectedLessonId}
            onBack={() => {
              setActiveScreen('dashboard');
              refreshIncorrectCount();
            }}
            onCompleteStudy={handleCompleteStudy}
          />
        )}

        {activeScreen === 'quiz' && (
          <QuizMode
            lessonId={selectedLessonId}
            userId={userId}
            completedStudies={completedStudies}
            onBack={() => {
              setActiveScreen('dashboard');
              refreshIncorrectCount();
            }}
            onSaveScore={handleSaveScore}
          />
        )}

        {activeScreen === 'notebook' && (
          <NotebookMode
            userId={userId}
            onBack={() => {
              setActiveScreen('dashboard');
              refreshIncorrectCount();
            }}
            onRefreshStats={refreshIncorrectCount}
          />
        )}
      </main>

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-tertiary)', borderTop: '1px solid var(--border-light)', fontSize: '0.8rem' }}>
        &copy; {new Date().getFullYear()} English 1800 단어장. All rights reserved. | 연동 계정: {userMetadata?.email}
      </footer>

    </div>
  );
}

export default App;
