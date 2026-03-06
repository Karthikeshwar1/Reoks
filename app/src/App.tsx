
import Layout from './components/Layout';
import { useStore } from './store/useStore';
import { useTypingEngine } from './hooks/useTypingEngine';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
  const { books, progress, settings } = useStore();

  const currentBook = progress.bookId ? books[progress.bookId] : null;
  const currentChapter = currentBook ? currentBook.chapters[progress.chapterIndex] : null;
  const currentParagraph = currentChapter ? currentChapter.paragraphs[progress.paragraphIndex] : '';

  const { errors, cursorIndex, completedWordIndices } = useTypingEngine(currentParagraph);

  // Split paragraph into characters and group them by word
  const renderParagraph = () => {
    if (!currentParagraph) return null;

    let globalCharIndex = 0;

    // Split by spaces but preserve spaces in a way that we can iterate char by char
    const words = currentParagraph.split(/(\s+)/);

    // We only care about tracking actual words for the explosion effect, not spaces
    let wordCounter = -1;

    return (
      <div className="text-3xl leading-[2.2] font-medium max-w-4xl font-sans tracking-wide flex flex-wrap relative">
        <AnimatePresence>
          {words.map((chunk, wIdx) => {
            const isSpace = chunk.trim() === '';
            if (!isSpace) wordCounter++;

            const currentWordIndex = isSpace ? -1 : wordCounter;

            // Check if word is fully typed and space after it (or end of paragraph) is typed
            const isCompleted = currentWordIndex !== -1 && completedWordIndices.includes(currentWordIndex);
            const isExplosive = settings.theme === 'explosive';

            const chars = chunk.split('').map((char, cIdx) => {
              const charIdx = globalCharIndex++;

              let className = "transition-colors duration-100 ";

              if (charIdx < cursorIndex) {
                className += errors.includes(charIdx)
                  ? "text-red-500 border-b-2 border-red-500 bg-red-500/10 "
                  : (isExplosive ? "text-indigo-400 font-bold " : "text-zinc-100 ");
              } else if (charIdx === cursorIndex) {
                className += "text-zinc-500 bg-indigo-500/30 border-b-2 border-indigo-400 animate-pulse ";
              } else {
                className += "text-zinc-600 ";
              }

              if (char === ' ') {
                return <span key={cIdx} className={className + " whitespace-pre"}> </span>;
              }

              return (
                <span key={cIdx} className={className}>
                  {char}
                </span>
              );
            });

            if (isSpace) {
               // Render spaces immediately without motion wrapper to prevent flexbox wrapping bugs
               return <span key={`chunk-${wIdx}`}>{chars}</span>;
            }

            return (
              <motion.span
                key={`word-${wIdx}-${progress.paragraphIndex}`}
                className="inline-flex"
                initial={false}
                animate={isExplosive && isCompleted ? "exploded" : "visible"}
                variants={{
                  visible: { opacity: 1, scale: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.1 } },
                  exploded: {
                    opacity: 0,
                    scale: 1.5,
                    y: -50,
                    rotate: (Math.random() - 0.5) * 40,
                    filter: 'blur(10px)',
                    transition: { duration: 0.5, ease: "easeOut" }
                  }
                }}
              >
                {chars}
              </motion.span>
            );
          })}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <Layout>
      <div className="w-full text-left relative min-h-[50vh] flex flex-col justify-center">
        {!currentBook ? (
          <div className="text-center text-zinc-500 text-xl font-light">
            Select a book from the <span className="text-indigo-400">Library</span> to start reading.
          </div>
        ) : (
          <motion.div
            key={`${progress.chapterIndex}-${progress.paragraphIndex}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="absolute top-0 left-0 -mt-16 text-sm font-bold tracking-widest text-zinc-600 uppercase flex gap-4 items-center">
              <span className="text-indigo-400">{currentBook.title}</span>
              <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
              <span>{currentChapter?.title}</span>
              <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
              <span>Paragraph {progress.paragraphIndex + 1} / {currentChapter?.paragraphs.length}</span>
            </div>

            {renderParagraph()}

            {/* Instruction tooltip based on difficulty */}
            <div className="absolute bottom-0 left-0 -mb-16 text-sm text-zinc-600">
              {settings.difficulty === 'zen' && "Press Spacebar to reveal the next word."}
              {settings.difficulty === 'lazy' && "Type the first letter of each word."}
              {settings.difficulty === 'normal' && "Type normally. Mistakes are marked in red."}
              {settings.difficulty === 'strict' && "Type perfectly. No mistakes allowed."}
            </div>
          </motion.div>
        )}
      </div>
    </Layout>
  );
}

export default App;
