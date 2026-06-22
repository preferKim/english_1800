import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Volume2, Play, Pause, ArrowLeft, Check } from 'lucide-react';
import type { LessonData, WordItem } from '../types';

interface StudyModeProps {
  lessonId: string;
  onBack: () => void;
  onCompleteStudy: (lessonId: string) => void;
}

export const StudyMode: React.FC<StudyModeProps> = ({
  lessonId,
  onBack,
  onCompleteStudy,
}) => {
  const [lessonData, setLessonData] = useState<LessonData | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Auto Play States
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

  // Fetch lesson data
  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/lessons/${lessonId}.json`)
      .then(res => {
        if (!res.ok) throw new Error(`강의 정보를 불러오지 못했습니다 (${res.status})`);
        return res.json();
      })
      .then((data: LessonData) => {
        setLessonData(data);
        setCurrentIndex(0);
        setIsFlipped(false);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  }, [lessonId]);

  const currentWord: WordItem | undefined = lessonData?.items[currentIndex];

  // TTS Pronunciation helper
  const speakWord = useCallback((text: string, type: 'word' | 'example' = 'word') => {
    if ('speechSynthesis' in window) {
      // Cancel previous speaking
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = type === 'word' ? 0.85 : 0.95; // Slightly slower for primary word
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!lessonData) return;
      
      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped(prev => !prev);
      } else if (e.code === 'ArrowRight') {
        handleNext();
      } else if (e.code === 'ArrowLeft') {
        handlePrev();
      } else if (e.code === 'KeyV' || e.code === 'KeyS') {
        if (currentWord) {
          speakWord(currentWord.word, 'word');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lessonData, currentIndex, currentWord, speakWord]);

  // Navigate handlers
  const handleNext = () => {
    if (!lessonData) return;
    setIsFlipped(false);
    
    // Auto voice output on word switch if configured or manually triggered
    setTimeout(() => {
      setCurrentIndex(prev => (prev + 1) % lessonData.items.length);
    }, 150);
  };

  const handlePrev = () => {
    if (!lessonData) return;
    setIsFlipped(false);
    
    setTimeout(() => {
      setCurrentIndex(prev => (prev - 1 + lessonData.items.length) % lessonData.items.length);
    }, 150);
  };

  // Trigger speech when index updates
  useEffect(() => {
    if (currentWord && !loading && !isFlipped) {
      speakWord(currentWord.word, 'word');
    }
  }, [currentIndex, currentWord, loading, speakWord]);

  // Auto-play management
  useEffect(() => {
    if (isAutoPlaying) {
      // Auto Play cycle:
      // 1. Show word (flip = false) -> speak word -> wait 3s
      // 2. Flip word (flip = true) -> speak example (if exist) -> wait 4s
      // 3. Go to next word
      const interval = setInterval(() => {
        setIsFlipped(flipped => {
          if (!flipped) {
            // Speak example if visible
            if (currentWord && currentWord.examples.length > 0) {
              speakWord(currentWord.examples[0], 'example');
            }
            return true;
          } else {
            handleNext();
            return false;
          }
        });
      }, 4000);

      return () => clearInterval(interval);
    }
  }, [isAutoPlaying, currentIndex, currentWord, speakWord]);

  if (loading) {
    return (
      <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center', margin: '2rem auto', maxWidth: '600px' }}>
        <div style={{ border: '4px solid rgba(255,255,255,0.1)', borderTop: '4px solid var(--primary)', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto 1.5rem' }}></div>
        <p>단어 정보를 불러오는 중입니다...</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !lessonData || !currentWord) {
    return (
      <div className="glass-panel" style={{ padding: '3rem 2rem', textAlign: 'center', margin: '2rem auto', maxWidth: '600px' }}>
        <p style={{ color: 'var(--danger)', marginBottom: '1.5rem' }}>오류가 발생했습니다: {error || '데이터 없음'}</p>
        <button className="btn btn-secondary" onClick={onBack}><ArrowLeft size={16} /> 대시보드로 돌아가기</button>
      </div>
    );
  }

  const progressPercent = Math.round(((currentIndex + 1) / lessonData.items.length) * 100);

  return (
    <div className="container animate-fade-in" style={{ maxWidth: '800px', padding: '1rem 1.5rem' }}>
      
      {/* Top Header Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <button className="btn btn-secondary" onClick={onBack} style={{ padding: '0.5rem 1rem' }}>
          <ArrowLeft size={16} /> 대시보드
        </button>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
          {lessonId.startsWith('D') ? `Day ${lessonId.substring(1)}` : `Unit ${lessonId.substring(1)}`} 단어 학습
        </h2>
        <button 
          className="btn btn-success" 
          onClick={() => {
            onCompleteStudy(lessonId);
            onBack();
          }}
          style={{ padding: '0.5rem 1rem' }}
        >
          <Check size={16} /> 학습 완료
        </button>
      </div>

      {/* Progress Info */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
          <span>진행도: {currentIndex + 1} / {lessonData.items.length} 단어</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="progress-bar-container">
          <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
        </div>
      </div>

      {/* Flashcard Component */}
      <div className="flip-card-container">
        <div className={`flip-card ${isFlipped ? 'flipped' : ''}`} onClick={() => setIsFlipped(!isFlipped)}>
          
          {/* FRONT: English Word */}
          <div className="flip-card-front">
            <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.5rem' }}>영단어 (클릭하여 뜻 확인)</span>
            <h1 style={{ fontSize: '3.5rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--text-primary)', letterSpacing: '-0.02em', textAlign: 'center' }}>
              {currentWord.word}
            </h1>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button 
                className="btn btn-secondary" 
                onClick={(e) => {
                  e.stopPropagation(); // Avoid card flipping
                  speakWord(currentWord.word, 'word');
                }}
                style={{ borderRadius: 'var(--radius-full)', padding: '0.5rem' }}
                title="발음 듣기"
              >
                <Volume2 size={18} />
              </button>
            </div>
            <p style={{ marginTop: '2.5rem', fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>[스페이스바] 단어 뒤집기 / [좌우 방향키] 이전/다음 단어</p>
          </div>

          {/* BACK: Meanings & Examples */}
          <div className="flip-card-back">
            <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>뜻 & 예문</span>
            
            <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.5rem', textAlign: 'center' }}>
              {currentWord.word}
            </h1>

            {/* Meanings */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', margin: '0.75rem 0 1.5rem 0' }}>
              {currentWord.meanings.map((meaning, index) => (
                <span key={index} className="badge badge-secondary" style={{ fontSize: '1rem', padding: '0.4rem 0.8rem' }}>
                  {meaning}
                </span>
              ))}
            </div>

            {/* Example sentence */}
            {currentWord.examples && currentWord.examples.length > 0 && (
              <div 
                style={{ 
                  background: 'rgba(255,255,255,0.03)', 
                  border: '1px solid var(--border-light)', 
                  borderRadius: 'var(--radius-md)', 
                  padding: '1rem 1.25rem', 
                  width: '100%', 
                  textAlign: 'center',
                  position: 'relative'
                }}
                onClick={(e) => e.stopPropagation()} // Stop flip trigger
              >
                <div style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', marginBottom: '0.25rem', fontWeight: 'bold' }}>EXAMPLE SENTENCE</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 500, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  {currentWord.examples[0]}
                  <button 
                    className="btn btn-outline"
                    onClick={() => speakWord(currentWord.examples[0], 'example')}
                    style={{ padding: '0.25rem', borderRadius: '50%', border: 'none' }}
                  >
                    <Volume2 size={14} />
                  </button>
                </div>
              </div>
            )}
            
            <p style={{ marginTop: '2rem', fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>카드를 한번 더 클릭하면 앞면으로 돌아갑니다.</p>
          </div>

        </div>
      </div>

      {/* Control Buttons */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1.5rem', marginTop: '2.5rem' }}>
        <button className="btn btn-secondary" onClick={handlePrev} style={{ borderRadius: '50%', width: '50px', height: '50px', padding: 0 }}>
          <ChevronLeft size={24} />
        </button>

        {/* Auto Play toggle */}
        <button 
          className={`btn ${isAutoPlaying ? 'btn-warning' : 'btn-outline'}`} 
          onClick={() => setIsAutoPlaying(!isAutoPlaying)}
          style={{ gap: '0.5rem' }}
        >
          {isAutoPlaying ? (
            <>
              <Pause size={18} /> 자동 재생 중지
            </>
          ) : (
            <>
              <Play size={18} /> 자동 슬라이드 쇼
            </>
          )}
        </button>

        <button className="btn btn-secondary" onClick={handleNext} style={{ borderRadius: '50%', width: '50px', height: '50px', padding: 0 }}>
          <ChevronRight size={24} />
        </button>
      </div>

    </div>
  );
};
