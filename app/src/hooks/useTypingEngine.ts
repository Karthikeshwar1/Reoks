import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store/useStore';

export const useTypingEngine = (paragraph: string) => {
  const { settings, updateStats, nextParagraph } = useStore();

  const [typed, setTyped] = useState('');
  const [errors, setErrors] = useState<number[]>([]);
  const [cursorIndex, setCursorIndex] = useState(0);

  // WPM tracking
  const [startTime, setStartTime] = useState<number | null>(null);
  const [totalKeystrokes, setTotalKeystrokes] = useState(0);
  const [correctKeystrokes, setCorrectKeystrokes] = useState(0);

  // Track words completed for animation
  const [completedWordIndices, setCompletedWordIndices] = useState<number[]>([]);

  // Reset when paragraph changes
  useEffect(() => {
    setTyped('');
    setErrors([]);
    setCursorIndex(0);
    setStartTime(null);
    setTotalKeystrokes(0);
    setCorrectKeystrokes(0);
    setCompletedWordIndices([]);
  }, [paragraph]);

  // Determine word boundaries based on current cursor index
  const updateCompletedWords = (newCursorIndex: number) => {
    if (!paragraph) return;

    // Find all spaces up to the new cursor index
    const wordsCompletedCount = paragraph.slice(0, newCursorIndex).split(' ').length - 1;

    // If the cursor is at the very end of the paragraph, count the last word
    const isAtEnd = newCursorIndex >= paragraph.length;
    const finalCount = isAtEnd ? wordsCompletedCount + 1 : wordsCompletedCount;

    setCompletedWordIndices(prev => {
      const updated = new Set(prev);
      for (let i = 0; i < finalCount; i++) updated.add(i);
      return Array.from(updated);
    });
  };

  // WPM calculation
  useEffect(() => {
    if (startTime && totalKeystrokes > 0) {
      const timeElapsedMins = (Date.now() - startTime) / 60000;
      if (timeElapsedMins > 0) {
        const wordsTyped = typed.length / 5; // Standard 5 chars per word
        const wpm = Math.max(0, Math.round(wordsTyped / timeElapsedMins));
        const accuracy = Math.max(0, Math.round((correctKeystrokes / totalKeystrokes) * 100));

        updateStats(wpm, accuracy);
      }
    }
  }, [typed, startTime, totalKeystrokes, correctKeystrokes, updateStats]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // If paragraph is undefined, wait. If at end, wait for auto-advance.
    if (!paragraph || cursorIndex >= paragraph.length) return;

    // Ignore meta keys
    if (e.ctrlKey || e.metaKey || e.altKey || (e.key.length > 1 && e.key !== 'Backspace' && e.key !== ' ')) {
      return;
    }

    if (!startTime) setStartTime(Date.now());

    e.preventDefault();

    const expectedChar = paragraph[cursorIndex];

    const advanceCursor = (steps: number) => {
      setCursorIndex(prev => {
        const next = prev + steps;
        updateCompletedWords(next);

        if (next >= paragraph.length) {
          // Delay transition so they see the final explosion
          setTimeout(nextParagraph, 600);
        }
        return next;
      });
    };

    // Backspace handling
    if (e.key === 'Backspace') {
      if (settings.difficulty === 'normal' || settings.difficulty === 'lazy') {
        if (cursorIndex > 0) {
          setTyped(prev => prev.slice(0, -1));
          setCursorIndex(prev => {
            const next = prev - 1;
            // When going backward, we don't 'un-explode' words for simplicity,
            // but we could remove from completedWordIndices here if desired.
            return next;
          });
          setErrors(prev => prev.filter(i => i !== cursorIndex - 1));
        }
      }
      return;
    }

    // Difficulty: Zen (Spacebar)
    if (settings.difficulty === 'zen') {
      if (e.key === ' ') {
        const nextSpace = paragraph.indexOf(' ', cursorIndex);
        const nextIndex = nextSpace === -1 ? paragraph.length : nextSpace + 1;
        const chunk = paragraph.substring(cursorIndex, nextIndex);

        setTyped(prev => prev + chunk);
        setTotalKeystrokes(prev => prev + 1);
        setCorrectKeystrokes(prev => prev + 1);
        advanceCursor(nextIndex - cursorIndex);
      }
      return;
    }

    // Difficulty: Lazy (First Letter)
    if (settings.difficulty === 'lazy') {
      const isStartOfWord = cursorIndex === 0 || paragraph[cursorIndex - 1] === ' ';

      if (isStartOfWord) {
        if (e.key.toLowerCase() === expectedChar.toLowerCase()) {
          const nextSpace = paragraph.indexOf(' ', cursorIndex);
          const nextIndex = nextSpace === -1 ? paragraph.length : nextSpace + 1;
          const chunk = paragraph.substring(cursorIndex, nextIndex);

          setTyped(prev => prev + chunk);
          setTotalKeystrokes(prev => prev + 1);
          setCorrectKeystrokes(prev => prev + 1);
          advanceCursor(nextIndex - cursorIndex);
        } else {
          setTotalKeystrokes(prev => prev + 1);
          setErrors(prev => [...prev, cursorIndex]);
        }
      } else if (expectedChar === ' ') {
        setTyped(prev => prev + ' ');
        setTotalKeystrokes(prev => prev + 1);
        setCorrectKeystrokes(prev => prev + 1);
        advanceCursor(1);
      } else {
         setTyped(prev => prev + expectedChar);
         setTotalKeystrokes(prev => prev + 1);
         setCorrectKeystrokes(prev => prev + 1);
         advanceCursor(1);
      }
      return;
    }

    // Difficulty: Normal
    if (settings.difficulty === 'normal') {
      setTotalKeystrokes(prev => prev + 1);

      if (e.key === expectedChar) {
        setCorrectKeystrokes(prev => prev + 1);
      } else {
        setErrors(prev => [...prev, cursorIndex]);
      }

      setTyped(prev => prev + e.key);
      advanceCursor(1);
      return;
    }

    // Difficulty: Strict
    if (settings.difficulty === 'strict') {
      setTotalKeystrokes(prev => prev + 1);

      if (e.key === expectedChar) {
        setCorrectKeystrokes(prev => prev + 1);
        setTyped(prev => prev + e.key);
        advanceCursor(1);
      } else {
        if (!errors.includes(cursorIndex)) {
          setErrors(prev => [...prev, cursorIndex]);
        }
      }
      return;
    }

  }, [paragraph, cursorIndex, startTime, settings.difficulty, nextParagraph, errors]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    typed,
    errors,
    cursorIndex,
    completedWordIndices
  };
};
