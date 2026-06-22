import React, { useState } from 'react';
import { BookOpen, Award, CheckCircle, BookMarked, Search, HelpCircle } from 'lucide-react';

interface DashboardProps {
  onSelectLesson: (lessonId: string, mode: 'study' | 'quiz') => void;
  onGoToNotebook: () => void;
  completedStudies: string[];
  quizScores: { [lessonId: string]: { score: number; total: number } };
  incorrectCount: number;
  isGuest?: boolean;
  onSignInTrigger?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onSelectLesson,
  onGoToNotebook,
  completedStudies,
  quizScores,
  incorrectCount,
  isGuest = false,
  onSignInTrigger,
}) => {
  const [activeTab, setActiveTab] = useState<'main' | 'extra'>('main');
  const [searchQuery, setSearchQuery] = useState('');

  // Generate main lessons D01 - D60
  const mainLessons = Array.from({ length: 60 }, (_, i) => {
    const num = i + 1;
    return `D${num.toString().padStart(2, '0')}`;
  });

  // Generate extra lessons U01 - U10
  const extraLessons = Array.from({ length: 10 }, (_, i) => {
    const num = i + 1;
    return `U${num.toString().padStart(2, '0')}`;
  });

  const activeLessons = activeTab === 'main' ? mainLessons : extraLessons;

  // Filter lessons
  const filteredLessons = activeLessons.filter(lessonId => 
    lessonId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Compute stats
  const totalCompleted = completedStudies.length;
  const quizScoresArray = Object.values(quizScores);
  const avgQuizScore = quizScoresArray.length > 0 
    ? Math.round(
        (quizScoresArray.reduce((acc, curr) => acc + (curr.score / curr.total), 0) / quizScoresArray.length) * 100
      )
    : 0;

  return (
    <div className="animate-fade-in">
      {/* Guest Warning Banner */}
      {isGuest && (
        <div 
          className="glass-panel" 
          style={{ 
            padding: '1rem 1.5rem', 
            marginBottom: '2rem', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            border: '1px solid rgba(245, 158, 11, 0.3)', 
            background: 'rgba(245, 158, 11, 0.03)',
            borderRadius: 'var(--radius-md)',
            flexWrap: 'wrap',
            gap: '1rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.25rem' }}>⚠️</span>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--warning)', fontSize: '0.95rem' }}>게스트 모드로 학습 중입니다.</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>쿠키를 청소하거나 기기를 변경하면 학습 진도와 오답노트 기록이 모두 손실됩니다.</div>
            </div>
          </div>
          <button 
            className="btn btn-warning" 
            onClick={onSignInTrigger}
            style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', borderRadius: 'var(--radius-sm)' }}
          >
            Google 로그인 연동하기
          </button>
        </div>
      )}
      {/* Stats Summary Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ background: 'var(--primary-glow)', padding: '1rem', borderRadius: 'var(--radius-md)', color: 'var(--primary)' }}>
            <BookOpen size={28} />
          </div>
          <div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>학습 완료한 강수</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{totalCompleted} <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-secondary)' }}>/ 70강</span></div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ background: 'var(--success-glow)', padding: '1rem', borderRadius: 'var(--radius-md)', color: 'var(--success)' }}>
            <Award size={28} />
          </div>
          <div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>퀴즈 평균 점수</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{avgQuizScore}<span style={{ fontSize: '1rem', fontWeight: 500 }}>%</span></div>
          </div>
        </div>

        <div 
          className="glass-panel" 
          onClick={onGoToNotebook}
          style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem', cursor: 'pointer', border: '1px solid rgba(239, 68, 68, 0.2)', transition: 'all var(--transition-fast)' }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
        >
          <div style={{ background: 'var(--danger-glow)', padding: '1rem', borderRadius: 'var(--radius-md)', color: 'var(--danger)' }}>
            <BookMarked size={28} />
          </div>
          <div style={{ flexGrow: 1 }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>오답노트 등록 단어</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: incorrectCount > 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
              {incorrectCount} <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-secondary)' }}>단어 복습하기 &rarr;</span>
            </div>
          </div>
        </div>

      </div>

      {/* Tabs and Search Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem' }}>
        
        <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
          <button 
            className={`btn ${activeTab === 'main' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => { setActiveTab('main'); setSearchQuery(''); }}
            style={{ padding: '0.5rem 1.25rem', borderRadius: 'var(--radius-sm)' }}
          >
            기본 학습 (Day 01~60)
          </button>
          <button 
            className={`btn ${activeTab === 'extra' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => { setActiveTab('extra'); setSearchQuery(''); }}
            style={{ padding: '0.5rem 1.25rem', borderRadius: 'var(--radius-sm)' }}
          >
            추가 학습 (Unit 01~10)
          </button>
        </div>

        {/* Search bar */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input 
            type="text" 
            placeholder="강의 검색 (예: D01, U05)..." 
            className="text-input" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '2.5rem', paddingTop: '0.6rem', paddingBottom: '0.6rem', fontSize: '0.95rem', borderRadius: 'var(--radius-md)' }}
          />
        </div>

      </div>

      {/* Lesson Grid */}
      <div className="lesson-grid">
        {filteredLessons.map((lessonId) => {
          const isCompleted = completedStudies.includes(lessonId);
          const scoreInfo = quizScores[lessonId];
          const hasQuizScore = scoreInfo !== undefined;
          
          return (
            <div key={lessonId} className="lesson-card">
              <div className="lesson-card-header">
                <span style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.05em' }}>
                  {activeTab === 'main' ? `Day ${lessonId.substring(1)}` : `Unit ${lessonId.substring(1)}`}
                </span>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  {isCompleted && (
                    <span className="badge badge-success" title="학습 완료">
                      <CheckCircle size={12} style={{ marginRight: '0.25rem' }} /> 학습됨
                    </span>
                  )}
                  {hasQuizScore && (
                    <span className="badge badge-primary" title="최고 퀴즈 점수">
                      <Award size={12} style={{ marginRight: '0.25rem' }} /> {Math.round((scoreInfo.score / scoreInfo.total) * 100)}%
                    </span>
                  )}
                </div>
              </div>

              <div className="lesson-card-body">
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  기본 단어 30개로 이루어진 코스입니다. 단어를 먼저 암기한 후 퀴즈에 도전해보세요.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => onSelectLesson(lessonId, 'study')}
                    style={{ fontSize: '0.85rem', padding: '0.5rem' }}
                  >
                    단어 학습
                  </button>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => onSelectLesson(lessonId, 'quiz')}
                    style={{ fontSize: '0.85rem', padding: '0.5rem' }}
                  >
                    퀴즈 도전
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredLessons.length === 0 && (
          <div style={{ gridColumn: '1 / -1', padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <HelpCircle size={48} style={{ margin: '0 auto 1rem', color: 'var(--text-tertiary)' }} />
            <p>검색 결과와 일치하는 강의가 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
};
