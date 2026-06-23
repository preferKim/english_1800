import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, XCircle, Award, RotateCcw } from 'lucide-react';
import type { LessonData, WordItem, QuizQuestion } from '../types';
import { db } from '../lib/supabaseClient';
import { useSpeech } from '../hooks/useSpeech';

interface QuizModeProps {
  lessonId: string;
  userId: string;
  onBack: () => void;
  onSaveScore: (lessonId: string, score: number, total: number) => void;
}

export const QuizMode: React.FC<QuizModeProps> = ({
  lessonId,
  userId,
  onBack,
  onSaveScore,
}) => {
  const speak = useSpeech();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [spellingInput, setSpellingInput] = useState('');
  const [hasAnswered, setHasAnswered] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);
  const [score, setScore] = useState(0);

  // Load lesson and generate quiz questions
  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/lessons/${lessonId}.json`)
      .then(res => {
        if (!res.ok) throw new Error(`강의 정보를 불러오지 못했습니다 (${res.status})`);
        return res.json();
      })
      .then((data: LessonData) => {
        generateQuiz(data.items);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  }, [lessonId]);

  // Generate random questions of mixed types for all words in the lesson
  const generateQuiz = (items: WordItem[]) => {
    if (items.length < 1) {
      setError('퀴즈를 생성하기에 단어 수가 부족합니다.');
      return;
    }

    // Shuffle all words
    const selectedWords = [...items].sort(() => 0.5 - Math.random());

    const generatedQuestions: QuizQuestion[] = selectedWords.map((wordItem, idx) => {
      // Pick random question type
      const types: Array<'en-to-ko' | 'ko-to-en' | 'spelling'> = ['en-to-ko', 'ko-to-en', 'spelling'];
      const qType = types[Math.floor(Math.random() * types.length)];

      if (qType === 'spelling') {
        return {
          id: `q-${idx}`,
          type: 'spelling',
          word: wordItem,
          correctAnswer: wordItem.word.toLowerCase().trim()
        };
      }

      // Generate multiple choice options (1 correct + 3 incorrect)
      const options: string[] = [];
      
      if (qType === 'en-to-ko') {
        const correct = wordItem.meanings[0];
        options.push(correct);

        // Find 3 incorrect meanings from other words
        const standardMeanings = items
          .filter(item => item.word !== wordItem.word)
          .map(item => item.meanings[0]);
        const shuffledMeanings = standardMeanings.sort(() => 0.5 - Math.random());
        
        // Add unique incorrect options
        let added = 0;
        for (const m of shuffledMeanings) {
          if (added >= 3) break;
          if (!options.includes(m)) {
            options.push(m);
            added++;
          }
        }
        
        // Fill up if somehow not enough
        while (options.length < 4) {
          options.push("임의의 의미");
        }

        return {
          id: `q-${idx}`,
          type: 'en-to-ko',
          word: wordItem,
          options: options.sort(() => 0.5 - Math.random()),
          correctAnswer: correct
        };
      } else {
        // ko-to-en
        const correct = wordItem.word;
        options.push(correct);

        const standardWords = items
          .filter(item => item.word !== wordItem.word)
          .map(item => item.word);
        const shuffledWords = standardWords.sort(() => 0.5 - Math.random());

        let added = 0;
        for (const w of shuffledWords) {
          if (added >= 3) break;
          if (!options.includes(w)) {
            options.push(w);
            added++;
          }
        }

        while (options.length < 4) {
          options.push("word");
        }

        return {
          id: `q-${idx}`,
          type: 'ko-to-en',
          word: wordItem,
          options: options.sort(() => 0.5 - Math.random()),
          correctAnswer: correct
        };
      }
    });

    setQuestions(generatedQuestions);
    setCurrentIndex(0);
    setScore(0);
    setHasAnswered(false);
    setSelectedOption(null);
    setSpellingInput('');
    setQuizFinished(false);
  };

  const speakWord = (text: string) => {
    speak(text);
  };

  const handleAnswerSubmit = (answer: string) => {
    if (hasAnswered) return;

    const currentQuestion = questions[currentIndex];
    const isCorrect = answer.toLowerCase().trim() === currentQuestion.correctAnswer.toLowerCase().trim();
    
    // Play pronunciation if english word is the answer or prompt
    if (currentQuestion.type === 'en-to-ko' || currentQuestion.type === 'spelling') {
      speakWord(currentQuestion.word.word);
    } else {
      speakWord(answer);
    }

    currentQuestion.userAnswer = answer;
    currentQuestion.isCorrect = isCorrect;

    if (isCorrect) {
      setScore(prev => prev + 1);
    } else {
      // Sync incorrect answer to Supabase DB (or localStorage fallback)
      db.addIncorrectAnswer(
        userId,
        lessonId,
        currentQuestion.word.word,
        currentQuestion.word.meanings,
        currentQuestion.word.examples
      ).catch(e => console.error('Failed to log incorrect word to DB', e));
    }

    setHasAnswered(true);
  };

  const handleNextQuestion = () => {
    setSelectedOption(null);
    setSpellingInput('');
    setHasAnswered(false);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Finished!
      setQuizFinished(true);
      onSaveScore(lessonId, score + (questions[currentIndex].isCorrect ? 1 : 0), questions.length);
    }
  };

  if (loading) {
    return (
      <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center', margin: '2rem auto', maxWidth: '600px' }}>
        <div style={{ border: '4px solid rgba(255,255,255,0.1)', borderTop: '4px solid var(--primary)', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto 1.5rem' }}></div>
        <p>퀴즈 질문을 구성하는 중입니다...</p>
      </div>
    );
  }

  if (error || questions.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '3rem 2rem', textAlign: 'center', margin: '2rem auto', maxWidth: '600px' }}>
        <p style={{ color: 'var(--danger)', marginBottom: '1.5rem' }}>오류가 발생했습니다: {error || '질문 없음'}</p>
        <button className="btn btn-secondary" onClick={onBack}><ArrowLeft size={16} /> 돌아가기</button>
      </div>
    );
  }

  if (quizFinished) {
    const finalScore = score;
    const totalQuestions = questions.length;
    const percentage = Math.round((finalScore / totalQuestions) * 100);

    return (
      <div className="container animate-fade-in" style={{ maxWidth: '600px' }}>
        <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ background: 'var(--primary-glow)', display: 'inline-flex', padding: '1rem', borderRadius: '50%', color: 'var(--primary)', marginBottom: '1rem' }}>
            <Award size={48} />
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>퀴즈를 마쳤습니다!</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            {lessonId.startsWith('D') ? `Day ${lessonId.substring(1)}` : `Unit ${lessonId.substring(1)}`}
          </p>

          <div style={{ fontSize: '3.5rem', fontWeight: 800, color: percentage >= 80 ? 'var(--success)' : percentage >= 50 ? 'var(--warning)' : 'var(--danger)', marginBottom: '0.25rem' }}>
            {finalScore} / {totalQuestions}
          </div>
          <p style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '2rem' }}>
            정답률: {percentage}%
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <button className="btn btn-secondary" onClick={() => generateQuiz(questions.map(q => q.word))}>
              <RotateCcw size={16} /> 다시 도전
            </button>
            <button className="btn btn-primary" onClick={onBack}>
              대시보드로 가기
            </button>
          </div>
        </div>

        {/* Incorrect Answer Log Summary */}
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>결과 검토</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {questions.map((q) => (
            <div 
              key={q.id} 
              className="glass-panel" 
              style={{ 
                padding: '1rem 1.25rem', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                borderLeft: `4px solid ${q.isCorrect ? 'var(--success)' : 'var(--danger)'}` 
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{q.word.word}</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>({q.word.meanings.join(', ')})</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  내 답변: <span style={{ color: q.isCorrect ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>{q.userAnswer}</span>
                  {!q.isCorrect && ` | 정답: ${q.correctAnswer}`}
                </div>
              </div>
              <div>
                {q.isCorrect ? (
                  <CheckCircle size={20} style={{ color: 'var(--success)' }} />
                ) : (
                  <XCircle size={20} style={{ color: 'var(--danger)' }} />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const questionNumber = currentIndex + 1;
  const progressPercent = Math.round(((currentIndex) / questions.length) * 100);

  return (
    <div className="container animate-fade-in" style={{ maxWidth: '650px', padding: '1rem 1.5rem' }}>
      
      {/* Quiz Progress header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <button className="btn btn-secondary" onClick={onBack} style={{ padding: '0.5rem 1rem' }}>
          <ArrowLeft size={16} /> 나가기
        </button>
        <span style={{ fontWeight: 700 }}>
          질문 {questionNumber} / {questions.length}
        </span>
        <span className="badge badge-primary">퀴즈 진행 중</span>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <div className="progress-bar-container">
          <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
        </div>
      </div>

      {/* Question Card */}
      <div className="glass-panel" style={{ padding: '2.5rem 2rem', marginBottom: '2rem', textAlign: 'center' }}>
        
        {/* EN TO KO Question */}
        {currentQuestion.type === 'en-to-ko' && (
          <div>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>단어의 뜻을 고르세요</span>
            <h1 style={{ fontSize: '3rem', fontWeight: 800, margin: '1rem 0', color: 'var(--text-primary)' }}>
              {currentQuestion.word.word}
            </h1>
          </div>
        )}

        {/* KO TO EN Question */}
        {currentQuestion.type === 'ko-to-en' && (
          <div>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>다음 뜻에 맞는 영단어를 고르세요</span>
            <h1 style={{ fontSize: '2.25rem', fontWeight: 800, margin: '1rem 0', color: 'var(--primary)' }}>
              {currentQuestion.word.meanings.join(', ')}
            </h1>
          </div>
        )}

        {/* SPELLING Question */}
        {currentQuestion.type === 'spelling' && (
          <div>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>알맞은 철자를 입력하여 예문을 완성하세요</span>
            
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '1rem 0', color: 'var(--warning)' }}>
              {currentQuestion.word.meanings.join(', ')}
            </h2>

            {currentQuestion.word.examples && currentQuestion.word.examples.length > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', margin: '1.5rem 0', fontSize: '1.1rem', fontWeight: 500 }}>
                {/* Generate masked example (e.g. "life" -> "l___") */}
                {currentQuestion.word.examples[0].split(' ').map((wordStr, index) => {
                  const cleanedWord = wordStr.replace(/[^a-zA-Z]/g, '');
                  if (cleanedWord.toLowerCase() === currentQuestion.word.word.toLowerCase()) {
                    const firstChar = cleanedWord.charAt(0);
                    const blanks = '_'.repeat(cleanedWord.length - 1);
                    return <span key={index} style={{ borderBottom: '2px solid var(--warning)', padding: '0 0.2rem', fontWeight: 'bold', color: 'var(--warning)' }}>{firstChar}{blanks}</span>;
                  }
                  return <span key={index}> {wordStr} </span>;
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Answer Inputs / Choices */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
        
        {/* Multiple Choice layouts */}
        {currentQuestion.options && currentQuestion.options.map((option, idx) => {
          const isSelected = selectedOption === option;
          const isCorrectAnswer = option === currentQuestion.correctAnswer;
          
          let btnClass = '';
          if (hasAnswered) {
            if (isCorrectAnswer) btnClass = 'correct';
            else if (isSelected) btnClass = 'incorrect';
          }

          return (
            <button
              key={idx}
              className={`option-btn ${btnClass}`}
              onClick={() => {
                if (hasAnswered) return;
                setSelectedOption(option);
                handleAnswerSubmit(option);
              }}
              disabled={hasAnswered}
            >
              <span>{idx + 1}. {option}</span>
              {hasAnswered && isCorrectAnswer && <CheckCircle size={18} />}
              {hasAnswered && isSelected && !isCorrectAnswer && <XCircle size={18} />}
            </button>
          );
        })}

        {/* Spelling Input layout */}
        {currentQuestion.type === 'spelling' && (
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (!spellingInput.trim() || hasAnswered) return;
              handleAnswerSubmit(spellingInput.trim());
            }}
            style={{ display: 'flex', gap: '0.75rem' }}
          >
            <input
              type="text"
              placeholder="여기에 철자를 입력하세요..."
              className="text-input"
              value={spellingInput}
              onChange={(e) => setSpellingInput(e.target.value)}
              disabled={hasAnswered}
              autoFocus
              style={{ fontSize: '1.2rem' }}
            />
            {!hasAnswered ? (
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={!spellingInput.trim()}
              >
                제출
              </button>
            ) : null}
          </form>
        )}

        {/* Feedback for Spelling answer */}
        {currentQuestion.type === 'spelling' && hasAnswered && (
          <div 
            className="glass-panel" 
            style={{ 
              padding: '1.25rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '1rem',
              borderLeft: `4px solid ${currentQuestion.isCorrect ? 'var(--success)' : 'var(--danger)'}` 
            }}
          >
            {currentQuestion.isCorrect ? (
              <>
                <CheckCircle size={24} style={{ color: 'var(--success)' }} />
                <div>
                  <div style={{ fontWeight: 'bold', color: 'var(--success)' }}>정답입니다!</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{currentQuestion.word.word} : {currentQuestion.word.meanings.join(', ')}</div>
                </div>
              </>
            ) : (
              <>
                <XCircle size={24} style={{ color: 'var(--danger)' }} />
                <div>
                  <div style={{ fontWeight: 'bold', color: 'var(--danger)' }}>틀렸습니다!</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>정답: <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{currentQuestion.correctAnswer}</span> | {currentQuestion.word.meanings.join(', ')}</div>
                </div>
              </>
            )}
          </div>
        )}

      </div>

      {/* Next Question Trigger */}
      {hasAnswered && (
        <button className="btn btn-primary animate-fade-in" onClick={handleNextQuestion} style={{ width: '100%', padding: '1rem' }}>
          {currentIndex < questions.length - 1 ? '다음 질문으로' : '결과 보기'}
        </button>
      )}

    </div>
  );
};
