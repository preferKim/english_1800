import React, { useState } from 'react';
import { BookOpen, Award, CheckCircle, BookMarked, Search, HelpCircle, Zap } from 'lucide-react';

interface DashboardProps {
  onSelectLesson: (lessonId: string, mode: 'study' | 'quiz') => void;
  onGoToNotebook: () => void;
  completedStudies: string[];
  quizScores: { [lessonId: string]: { score: number; total: number } };
  incorrectCount: number;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onSelectLesson,
  onGoToNotebook,
  completedStudies,
  quizScores,
  incorrectCount,
}) => {
  const [activeTab, setActiveTab] = useState<'main' | 'extra'>('main');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unstarted' | 'studying' | 'completed'>('all');

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

  // Filter lessons by query and status
  const filteredLessons = activeLessons.filter(lessonId => {
    const matchesSearch = lessonId.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    const isCompleted = completedStudies.includes(lessonId);
    const hasQuizScore = quizScores[lessonId] !== undefined;

    if (statusFilter === 'unstarted') {
      return !isCompleted && !hasQuizScore;
    }
    if (statusFilter === 'studying') {
      return isCompleted && !hasQuizScore;
    }
    if (statusFilter === 'completed') {
      return isCompleted && hasQuizScore;
    }
    return true; // 'all'
  });

  // Get active lessons with quiz scores for graphing
  const activeLessonsWithScores = activeLessons.map(lessonId => {
    const scoreInfo = quizScores[lessonId];
    const pct = scoreInfo ? Math.round((scoreInfo.score / scoreInfo.total) * 100) : null;
    return {
      lessonId,
      pct,
      scoreInfo
    };
  });

  const hasAnyScores = activeLessonsWithScores.some(item => item.pct !== null);
  const colWidth = activeTab === 'main' ? 32 : 60;
  const chartWidth = activeLessons.length * colWidth + 50;

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
      {/* Stats Summary Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        
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
              {incorrectCount} <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-secondary)' }}>복습하기 &rarr;</span>
            </div>
          </div>
        </div>

        <div 
          className="glass-panel" 
          style={{ 
            padding: '1.5rem', 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'space-between',
            gap: '0.75rem', 
            border: '1px solid rgba(14, 165, 233, 0.2)',
            background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.05) 0%, rgba(18, 24, 38, 0.6) 100%)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'var(--secondary-glow)', padding: '0.75rem', borderRadius: 'var(--radius-md)', color: 'var(--secondary)' }}>
              <Zap size={24} />
            </div>
            <div>
              <div style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 700 }}>⚡ 누적 랜덤 퀴즈</div>
              {quizScores.cumulative ? (
                <div style={{ fontSize: '1.05rem', fontWeight: 800 }}>
                  최근: <span style={{ color: 'var(--secondary)' }}>{quizScores.cumulative.score}</span> / {quizScores.cumulative.total}
                  <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)', marginLeft: '0.25rem' }}>
                    ({Math.round(quizScores.cumulative.score / quizScores.cumulative.total * 100)}%)
                  </span>
                </div>
              ) : (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  완료한 강 전체 대상 30문항
                </div>
              )}
            </div>
          </div>
          <button
            className={`btn ${completedStudies.length === 0 ? 'btn-secondary btn-disabled' : 'btn-primary'}`}
            disabled={completedStudies.length === 0}
            onClick={() => onSelectLesson('cumulative', 'quiz')}
            style={{ 
              width: '100%', 
              padding: '0.4rem 0.8rem', 
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.25rem'
            }}
            title={completedStudies.length === 0 ? '학습 완료한 강의가 있어야 도전할 수 있습니다.' : '누적 퀴즈 도전'}
          >
            <Zap size={12} /> 누적 퀴즈 도전
          </button>
        </div>

      </div>

      {/* Quiz Progress Graph Section */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          📊 {activeTab === 'main' ? '기본 학습(Day 01~60)' : '추가 학습(Unit 01~10)'} 퀴즈 최고 점수 현황
        </h3>
        
        {!hasAnyScores ? (
          <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p style={{ fontSize: '0.95rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>아직 퀴즈 기록이 없습니다.</p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>강의 카드의 '퀴즈 도전'을 완료하면 각 강의별 최고 정답률이 여기에 실시간 그래프로 기록됩니다.</p>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span style={{ display: 'inline-block', width: '12px', height: '12px', background: 'var(--success)', borderRadius: '2px' }}></span>
                <span>우수 (80% 이상)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span style={{ display: 'inline-block', width: '12px', height: '12px', background: 'var(--warning)', borderRadius: '2px' }}></span>
                <span>보통 (50% 이상)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span style={{ display: 'inline-block', width: '12px', height: '12px', background: 'var(--danger)', borderRadius: '2px' }}></span>
                <span>노력 필요 (50% 미만)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span style={{ display: 'inline-block', width: '12px', height: '12px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-light)', borderRadius: '2px' }}></span>
                <span>미응시</span>
              </div>
            </div>
            
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', background: 'rgba(0,0,0,0.15)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', padding: '1.25rem 0' }}>
              <div style={{ width: `${chartWidth}px`, height: '170px', position: 'relative' }}>
                <svg width={chartWidth} height={170} style={{ display: 'block' }}>
                  {/* Grid Lines */}
                  {/* 100% line */}
                  <line x1={35} y1={30} x2={chartWidth - 15} y2={30} stroke="rgba(255,255,255,0.07)" strokeDasharray="3,3" />
                  <text x={25} y={33} fill="var(--text-tertiary)" fontSize={9} textAnchor="end">100%</text>
                  
                  {/* 50% line */}
                  <line x1={35} y1={80} x2={chartWidth - 15} y2={80} stroke="rgba(255,255,255,0.07)" strokeDasharray="3,3" />
                  <text x={25} y={83} fill="var(--text-tertiary)" fontSize={9} textAnchor="end">50%</text>
                  
                  {/* 0% line */}
                  <line x1={35} y1={130} x2={chartWidth - 15} y2={130} stroke="rgba(255,255,255,0.15)" />
                  <text x={25} y={133} fill="var(--text-tertiary)" fontSize={9} textAnchor="end">0%</text>

                  {/* Draw Columns */}
                  {activeLessonsWithScores.map((item, index) => {
                    const x = index * colWidth + 40;
                    const barWidth = colWidth - 8;
                    const isScoreExist = item.pct !== null;
                    
                    let barHeight = 4;
                    let y = 126;
                    let barColor = 'rgba(255, 255, 255, 0.05)';
                    
                    if (isScoreExist) {
                      const scorePct = item.pct as number;
                      barHeight = Math.max(4, (scorePct / 100) * 100);
                      y = 130 - barHeight;
                      barColor = scorePct >= 80 ? 'var(--success)' : scorePct >= 50 ? 'var(--warning)' : 'var(--danger)';
                    }

                    return (
                      <g key={item.lessonId}>
                        {/* Bar rect */}
                        <rect 
                          x={x} 
                          y={y} 
                          width={barWidth} 
                          height={barHeight} 
                          fill={barColor} 
                          rx={2} 
                          ry={2} 
                          style={{ transition: 'all 0.3s ease' }}
                        />
                        
                        {/* Score Text above bar */}
                        {isScoreExist && (
                          <text 
                            x={x + barWidth / 2} 
                            y={y - 6} 
                            fill="var(--text-primary)" 
                            fontSize={9} 
                            fontWeight="bold" 
                            textAnchor="middle"
                          >
                            {item.pct}%
                          </text>
                        )}
                        
                        {/* Lesson ID Label */}
                        <text 
                          x={x + barWidth / 2} 
                          y={150} 
                          fill={isScoreExist ? 'var(--text-secondary)' : 'var(--text-tertiary)'} 
                          fontSize={9} 
                          fontWeight={isScoreExist ? 'bold' : 'normal'}
                          textAnchor="middle"
                        >
                          {item.lessonId.startsWith('D') ? `D${item.lessonId.substring(1)}` : `U${item.lessonId.substring(1)}`}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.5rem', textAlign: 'right', paddingRight: '0.5rem' }}>
              * 좌우로 스와이프/스크롤하여 전체 진도를 확인하실 수 있습니다.
            </div>
          </div>
        )}
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

        {/* Status Filter */}
        <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-secondary)', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
          <button 
            className={`btn ${statusFilter === 'all' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setStatusFilter('all')}
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', borderRadius: 'var(--radius-sm)' }}
          >
            전체
          </button>
          <button 
            className={`btn ${statusFilter === 'unstarted' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setStatusFilter('unstarted')}
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', borderRadius: 'var(--radius-sm)' }}
          >
            미학습
          </button>
          <button 
            className={`btn ${statusFilter === 'studying' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setStatusFilter('studying')}
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', borderRadius: 'var(--radius-sm)' }}
          >
            학습 중
          </button>
          <button 
            className={`btn ${statusFilter === 'completed' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setStatusFilter('completed')}
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', borderRadius: 'var(--radius-sm)' }}
          >
            완료
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
          
          // Calculate custom border and glow depending on state
          let cardBorderColor = 'var(--border-light)';
          let cardBg = 'var(--bg-secondary)';
          let cardBoxShadow = 'none';

          if (isCompleted && hasQuizScore) {
            cardBorderColor = 'rgba(16, 185, 129, 0.35)'; // success border
            cardBg = 'rgba(16, 185, 129, 0.015)'; 
            cardBoxShadow = '0 4px 20px rgba(16, 185, 129, 0.05)';
          } else if (isCompleted) {
            cardBorderColor = 'rgba(99, 102, 241, 0.35)'; // primary border
            cardBg = 'rgba(99, 102, 241, 0.015)';
            cardBoxShadow = '0 4px 20px rgba(99, 102, 241, 0.05)';
          }

          return (
            <div 
              key={lessonId} 
              className="lesson-card"
              style={{
                border: `1px solid ${cardBorderColor}`,
                background: cardBg,
                boxShadow: cardBoxShadow,
                transition: 'all 0.3s ease'
              }}
            >
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

              <div className="lesson-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', height: '100%', justifyContent: 'space-between' }}>
                {/* Checklists for gamification */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(0,0,0,0.12)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.825rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: isCompleted ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                      {isCompleted ? (
                        <CheckCircle size={14} style={{ color: 'var(--success)', flexShrink: 0 }} />
                      ) : (
                        <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', border: '1px solid var(--text-tertiary)', flexShrink: 0 }} />
                      )}
                      <strong>Step 1</strong> 단어 암기
                    </span>
                    <span style={{ fontSize: '0.75rem', color: isCompleted ? 'var(--success)' : 'var(--text-tertiary)', fontWeight: isCompleted ? 700 : 'normal' }}>
                      {isCompleted ? '완료' : '대기'}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.825rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: hasQuizScore ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                      {hasQuizScore ? (
                        <Award size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                      ) : (
                        <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', border: '1px solid var(--text-tertiary)', flexShrink: 0 }} />
                      )}
                      <strong>Step 2</strong> 퀴즈 도전
                    </span>
                    <span style={{ fontSize: '0.75rem', color: hasQuizScore ? 'var(--primary)' : 'var(--text-tertiary)', fontWeight: hasQuizScore ? 700 : 'normal' }}>
                      {hasQuizScore ? `${Math.round((scoreInfo.score / scoreInfo.total) * 100)}%` : '대기'}
                    </span>
                  </div>
                </div>

                {/* Course Metadata */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-tertiary)', padding: '0 0.25rem' }}>
                  <span>총 30개 단어 수록</span>
                  <span>최고 기록: {hasQuizScore ? `${scoreInfo.score}/${scoreInfo.total}` : '-'}</span>
                </div>

                {/* Navigation Action Buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <button 
                    className={`btn ${isCompleted ? 'btn-secondary' : 'btn-outline'}`} 
                    onClick={() => onSelectLesson(lessonId, 'study')}
                    style={{ fontSize: '0.85rem', padding: '0.5rem 0.25rem', gap: '0.25rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                  >
                    <BookOpen size={14} /> {isCompleted ? '복습 하기' : '단어 학습'}
                  </button>
                  <button 
                    className={`btn ${hasQuizScore ? 'btn-success' : 'btn-primary'}`} 
                    onClick={() => onSelectLesson(lessonId, 'quiz')}
                    style={{ fontSize: '0.85rem', padding: '0.5rem 0.25rem', gap: '0.25rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                  >
                    <Award size={14} /> {hasQuizScore ? '재도전' : '퀴즈 도전'}
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
