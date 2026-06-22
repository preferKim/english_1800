import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trash2, CheckCircle, RefreshCcw, BookOpen, Award, Check, Volume2 } from 'lucide-react';
import type { IncorrectAnswer } from '../types';
import { db } from '../lib/supabaseClient';

interface NotebookModeProps {
  userId: string;
  onBack: () => void;
  onRefreshStats: () => void;
}

export const NotebookMode: React.FC<NotebookModeProps> = ({
  userId,
  onBack,
  onRefreshStats,
}) => {
  const [incorrectList, setIncorrectList] = useState<IncorrectAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterLearned, setFilterLearned] = useState<'all' | 'learning' | 'mastered'>('learning');
  const [selectedLesson, setSelectedLesson] = useState<string>('all');

  // Practice Modes
  const [practiceMode, setPracticeMode] = useState<'list' | 'flashcard' | 'quiz'>('list');
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [practiceFlipped, setPracticeFlipped] = useState(false);
  const [spellingInput, setSpellingInput] = useState('');
  const [hasAnswered, setHasAnswered] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<IncorrectAnswer[]>([]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await db.getIncorrectAnswers(userId);
      setIncorrectList(data);
      onRefreshStats();
    } catch (e: any) {
      console.error(e);
      setError('오답노트를 가져오는 도중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  const handleDelete = async (word: string) => {
    try {
      await db.deleteIncorrectAnswer(userId, word);
      setIncorrectList(prev => prev.filter(item => item.word !== word));
      onRefreshStats();
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleLearned = async (word: string, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus;
      await db.markAsLearned(userId, word, newStatus);
      setIncorrectList(prev => 
        prev.map(item => item.word === word ? { ...item, is_learned: newStatus } : item)
      );
      onRefreshStats();
    } catch (e) {
      console.error(e);
    }
  };

  // Filter lists
  const filteredList = incorrectList.filter(item => {
    const matchesLearned = 
      filterLearned === 'all' ? true :
      filterLearned === 'mastered' ? item.is_learned === true :
      item.is_learned === false;
      
    const matchesLesson = 
      selectedLesson === 'all' ? true :
      item.lesson_id === selectedLesson;

    return matchesLearned && matchesLesson;
  });

  // Extract unique lesson list from incorrect notes for filter
  const uniqueLessons = Array.from(new Set(incorrectList.map(item => item.lesson_id))).sort();

  // TTS helper
  const speakWord = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  // Start Flashcard Practice
  const startFlashcards = () => {
    if (filteredList.length === 0) return;
    setPracticeMode('flashcard');
    setPracticeIndex(0);
    setPracticeFlipped(false);
  };

  // Start Quiz Practice (Spelling)
  const startQuiz = () => {
    if (filteredList.length === 0) return;
    // Shuffle filtered list
    const shuffled = [...filteredList].sort(() => 0.5 - Math.random());
    setQuizQuestions(shuffled);
    setPracticeMode('quiz');
    setPracticeIndex(0);
    setSpellingInput('');
    setHasAnswered(false);
    setQuizScore(0);
    setQuizFinished(false);
  };

  const handleQuizSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!spellingInput.trim() || hasAnswered) return;

    const currentQ = quizQuestions[practiceIndex];
    const isCorrect = spellingInput.toLowerCase().trim() === currentQ.word.toLowerCase().trim();
    
    speakWord(currentQ.word);
    setHasAnswered(true);

    if (isCorrect) {
      setQuizScore(prev => prev + 1);
      // Automatically mark as learned if got it right in review quiz!
      db.markAsLearned(userId, currentQ.word, true).then(() => {
        setIncorrectList(prev => 
          prev.map(item => item.word === currentQ.word ? { ...item, is_learned: true } : item)
        );
        onRefreshStats();
      });
    }
  };

  const handleNextQuiz = () => {
    setSpellingInput('');
    setHasAnswered(false);
    if (practiceIndex < quizQuestions.length - 1) {
      setPracticeIndex(prev => prev + 1);
    } else {
      setQuizFinished(true);
    }
  };

  if (loading) {
    return (
      <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center', margin: '2rem auto', maxWidth: '600px' }}>
        <div style={{ border: '4px solid rgba(255,255,255,0.1)', borderTop: '4px solid var(--primary)', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto 1.5rem' }}></div>
        <p>오답노트 정보를 Supabase에서 동기화 중입니다...</p>
      </div>
    );
  }

  // --- 1. PRACTICE FLASHCARD MODE ---
  if (practiceMode === 'flashcard' && filteredList.length > 0) {
    const currentItem = filteredList[practiceIndex];
    const progressPercent = Math.round(((practiceIndex + 1) / filteredList.length) * 100);

    return (
      <div className="container animate-fade-in" style={{ maxWidth: '800px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <button className="btn btn-secondary" onClick={() => setPracticeMode('list')}>
            <ArrowLeft size={16} /> 연습 종료
          </button>
          <span style={{ fontWeight: 'bold' }}>오답 카드 ({practiceIndex + 1} / {filteredList.length})</span>
          <span className="badge badge-warning">복습 학습</span>
        </div>

        <div className="progress-bar-container" style={{ marginBottom: '2rem' }}>
          <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
        </div>

        <div className="flip-card-container">
          <div className={`flip-card ${practiceFlipped ? 'flipped' : ''}`} onClick={() => setPracticeFlipped(!practiceFlipped)}>
            
            {/* Front */}
            <div className="flip-card-front">
              <span className="badge badge-danger" style={{ marginBottom: '1rem' }}>{currentItem.lesson_id} 오답</span>
              <h1 style={{ fontSize: '3.5rem', fontWeight: 800, marginBottom: '1rem' }}>{currentItem.word}</h1>
              <button 
                className="btn btn-secondary" 
                onClick={(e) => { e.stopPropagation(); speakWord(currentItem.word); }}
                style={{ borderRadius: '50%', padding: '0.5rem' }}
              >
                <Volume2 size={18} />
              </button>
            </div>

            {/* Back */}
            <div className="flip-card-back">
              <span className="badge badge-success" style={{ marginBottom: '1rem' }}>뜻 & 예문</span>
              <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.5rem' }}>{currentItem.word}</h1>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', margin: '0.5rem 0 1.5rem 0' }}>
                {currentItem.meanings.map((meaning, index) => (
                  <span key={index} className="badge badge-secondary" style={{ fontSize: '1rem', padding: '0.4rem 0.8rem' }}>{meaning}</span>
                ))}
              </div>

              {currentItem.examples && currentItem.examples.length > 0 && (
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: 'var(--radius-md)', width: '100%', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>EXAMPLE SENTENCE</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 500 }}>{currentItem.examples[0]}</div>
                </div>
              )}

              {/* Action within card */}
              <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem' }} onClick={e => e.stopPropagation()}>
                <button 
                  className={`btn ${currentItem.is_learned ? 'btn-secondary' : 'btn-success'}`}
                  onClick={() => handleToggleLearned(currentItem.word, currentItem.is_learned)}
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                >
                  <Check size={14} /> {currentItem.is_learned ? '미암기로 변경' : '외웠음! 완료 처리'}
                </button>
              </div>
            </div>

          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2.5rem' }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => { setPracticeFlipped(false); setPracticeIndex(prev => (prev - 1 + filteredList.length) % filteredList.length); }}
          >
            이전 단어
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={() => { setPracticeFlipped(false); setPracticeIndex(prev => (prev + 1) % filteredList.length); }}
          >
            다음 단어
          </button>
        </div>
      </div>
    );
  }

  // --- 2. PRACTICE QUIZ MODE ---
  if (practiceMode === 'quiz' && quizQuestions.length > 0) {
    if (quizFinished) {
      return (
        <div className="container animate-fade-in" style={{ maxWidth: '600px' }}>
          <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center' }}>
            <div style={{ background: 'var(--success-glow)', display: 'inline-flex', padding: '1rem', borderRadius: '50%', color: 'var(--success)', marginBottom: '1.5rem' }}>
              <Award size={48} />
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>오답 복습 퀴즈 완료!</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>맞춘 단어들은 자동으로 오답노트에서 '학습 완료' 상태로 변경됩니다.</p>
            <div style={{ fontSize: '3.5rem', fontWeight: 800, color: 'var(--success)', marginBottom: '2rem' }}>
              {quizScore} / {quizQuestions.length}
            </div>
            <button className="btn btn-primary" onClick={() => { setPracticeMode('list'); loadData(); }} style={{ width: '100%' }}>
              목록으로 돌아가기
            </button>
          </div>
        </div>
      );
    }

    const currentQ = quizQuestions[practiceIndex];
    const progressPercent = Math.round((practiceIndex / quizQuestions.length) * 100);
    const isAnswerCorrect = spellingInput.toLowerCase().trim() === currentQ.word.toLowerCase().trim();

    return (
      <div className="container animate-fade-in" style={{ maxWidth: '600px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <button className="btn btn-secondary" onClick={() => setPracticeMode('list')}>
            <ArrowLeft size={16} /> 연습 종료
          </button>
          <span style={{ fontWeight: 'bold' }}>오답 퀴즈 ({practiceIndex + 1} / {quizQuestions.length})</span>
          <span className="badge badge-danger">복습 테스트</span>
        </div>

        <div className="progress-bar-container" style={{ marginBottom: '2rem' }}>
          <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
        </div>

        <div className="glass-panel" style={{ padding: '2.5rem 2rem', marginBottom: '2rem', textAlign: 'center' }}>
          <span className="badge badge-primary" style={{ marginBottom: '1rem' }}>{currentQ.lesson_id}</span>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '1rem' }}>
            {currentQ.meanings.join(', ')}
          </h2>

          {currentQ.examples && currentQ.examples.length > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', margin: '1.5rem 0', fontSize: '1.05rem' }}>
              {currentQ.examples[0].split(' ').map((wordStr, index) => {
                const cleanedWord = wordStr.replace(/[^a-zA-Z]/g, '');
                if (cleanedWord.toLowerCase() === currentQ.word.toLowerCase()) {
                  return <span key={index} style={{ borderBottom: '2px solid var(--warning)', color: 'var(--warning)', fontWeight: 'bold', padding: '0 0.15rem' }}>{'_'.repeat(cleanedWord.length)}</span>;
                }
                return <span key={index}> {wordStr} </span>;
              })}
            </div>
          )}

          <form onSubmit={handleQuizSubmit} style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
            <input 
              type="text" 
              className="text-input" 
              placeholder="영단어 철자를 입력하세요..."
              value={spellingInput}
              onChange={(e) => setSpellingInput(e.target.value)}
              disabled={hasAnswered}
              autoFocus
            />
            {!hasAnswered && (
              <button type="submit" className="btn btn-primary" disabled={!spellingInput.trim()}>확인</button>
            )}
          </form>

          {hasAnswered && (
            <div 
              className="glass-panel animate-fade-in" 
              style={{ 
                marginTop: '1.5rem', 
                padding: '1rem', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '1rem', 
                textAlign: 'left',
                borderLeft: `4px solid ${isAnswerCorrect ? 'var(--success)' : 'var(--danger)'}` 
              }}
            >
              {isAnswerCorrect ? (
                <>
                  <CheckCircle size={24} style={{ color: 'var(--success)' }} />
                  <div>
                    <div style={{ fontWeight: 'bold', color: 'var(--success)' }}>정답입니다!</div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{currentQ.word} 가 오답노트에서 완료 처리됩니다.</div>
                  </div>
                </>
              ) : (
                <>
                  <Trash2 size={24} style={{ color: 'var(--danger)' }} />
                  <div>
                    <div style={{ fontWeight: 'bold', color: 'var(--danger)' }}>틀렸습니다!</div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>정답: <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{currentQ.word}</span></div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {hasAnswered && (
          <button className="btn btn-primary" onClick={handleNextQuiz} style={{ width: '100%', padding: '1rem' }}>
            {practiceIndex < quizQuestions.length - 1 ? '다음 질문으로' : '결과 확인'}
          </button>
        )}
      </div>
    );
  }

  // --- 3. STANDARD LIST VIEW ---
  return (
    <div className="animate-fade-in">
      {/* Header controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <button className="btn btn-secondary" onClick={onBack} style={{ padding: '0.5rem 1rem' }}>
          <ArrowLeft size={16} /> 대시보드
        </button>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>오답노트 관리 (Supabase)</h2>
        <button className="btn btn-outline" onClick={loadData} title="새로고침" style={{ padding: '0.5rem 1rem' }}>
          <RefreshCcw size={16} /> 동기화
        </button>
      </div>

      {/* Filter panel */}
      <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '2rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
          {/* Status filter */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 700, marginBottom: '0.25rem' }}>상태 필터</label>
            <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: '0.2rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
              <button 
                className="btn" 
                onClick={() => setFilterLearned('learning')}
                style={{ 
                  padding: '0.3rem 0.8rem', 
                  fontSize: '0.85rem', 
                  borderRadius: 'var(--radius-sm)',
                  background: filterLearned === 'learning' ? 'var(--primary)' : 'transparent',
                  color: filterLearned === 'learning' ? 'white' : 'var(--text-secondary)'
                }}
              >
                학습 중 ({incorrectList.filter(i => !i.is_learned).length})
              </button>
              <button 
                className="btn" 
                onClick={() => setFilterLearned('mastered')}
                style={{ 
                  padding: '0.3rem 0.8rem', 
                  fontSize: '0.85rem', 
                  borderRadius: 'var(--radius-sm)',
                  background: filterLearned === 'mastered' ? 'var(--primary)' : 'transparent',
                  color: filterLearned === 'mastered' ? 'white' : 'var(--text-secondary)'
                }}
              >
                완료 ({incorrectList.filter(i => i.is_learned).length})
              </button>
              <button 
                className="btn" 
                onClick={() => setFilterLearned('all')}
                style={{ 
                  padding: '0.3rem 0.8rem', 
                  fontSize: '0.85rem', 
                  borderRadius: 'var(--radius-sm)',
                  background: filterLearned === 'all' ? 'var(--primary)' : 'transparent',
                  color: filterLearned === 'all' ? 'white' : 'var(--text-secondary)'
                }}
              >
                전체 ({incorrectList.length})
              </button>
            </div>
          </div>

          {/* Lesson Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 700, marginBottom: '0.25rem' }}>강의 필터</label>
            <select 
              value={selectedLesson} 
              onChange={(e) => setSelectedLesson(e.target.value)}
              className="text-input"
              style={{ padding: '0.4rem 1.5rem 0.4rem 1rem', fontSize: '0.85rem', borderRadius: 'var(--radius-md)', width: '130px' }}
            >
              <option value="all">전체 강의</option>
              {uniqueLessons.map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Practice triggers */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className="btn btn-secondary" 
            onClick={startFlashcards}
            disabled={filteredList.length === 0}
            style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', opacity: filteredList.length === 0 ? 0.5 : 1 }}
          >
            <BookOpen size={16} /> 카드 복습 ({filteredList.length})
          </button>
          <button 
            className="btn btn-primary" 
            onClick={startQuiz}
            disabled={filteredList.length === 0}
            style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', opacity: filteredList.length === 0 ? 0.5 : 1 }}
          >
            <Award size={16} /> 복습 퀴즈 ({filteredList.length})
          </button>
        </div>
      </div>

      {error && (
        <div className="glass-panel" style={{ padding: '1rem', color: 'var(--danger)', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>
      )}

      {/* Word List Table */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-light)' }}>
              <th style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>상태</th>
              <th style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>단어</th>
              <th style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>뜻</th>
              <th style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>강의</th>
              <th style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>틀린 횟수</th>
              <th style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'right' }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {filteredList.map((item) => (
              <tr 
                key={item.word} 
                style={{ 
                  borderBottom: '1px solid var(--border-light)', 
                  opacity: item.is_learned ? 0.6 : 1,
                  background: item.is_learned ? 'rgba(0,0,0,0.1)' : 'transparent',
                  transition: 'all var(--transition-fast)'
                }}
              >
                {/* State toggle */}
                <td style={{ padding: '0.75rem 1rem' }}>
                  <button 
                    onClick={() => handleToggleLearned(item.word, item.is_learned)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: item.is_learned ? 'var(--success)' : 'var(--text-tertiary)' }}
                    title={item.is_learned ? '미완료로 표시' : '완료로 표시'}
                  >
                    <CheckCircle size={20} />
                  </button>
                </td>
                
                {/* Word */}
                <td style={{ padding: '0.75rem 1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>{item.word}</span>
                    <button 
                      onClick={() => speakWord(item.word)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}
                    >
                      <Volume2 size={14} />
                    </button>
                  </div>
                </td>

                {/* Meanings */}
                <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                  {item.meanings.join(', ')}
                </td>

                {/* Lesson ID */}
                <td style={{ padding: '0.75rem 1rem' }}>
                  <span className="badge badge-secondary">{item.lesson_id}</span>
                </td>

                {/* Incorrect Count */}
                <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>
                  <span style={{ color: item.incorrect_count > 2 ? 'var(--danger)' : 'var(--warning)' }}>
                    {item.incorrect_count}회
                  </span>
                </td>

                {/* Actions */}
                <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                  <button 
                    onClick={() => handleDelete(item.word)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', opacity: 0.8 }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '0.8'}
                    title="오답노트에서 삭제"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}

            {filteredList.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '4rem 1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  오답노트에 해당하는 단어가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
