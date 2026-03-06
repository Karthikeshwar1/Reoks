import React, { useEffect } from 'react';
import { BookOpen, Settings, ChevronLeft, ChevronRight, Upload } from 'lucide-react';
import { useStore } from '../store/useStore';
import { loadPreloadedBook, parseTxt } from '../lib/bookParser';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [leftOpen, setLeftOpen] = React.useState(false);
  const [rightOpen, setRightOpen] = React.useState(false);

  const { books, progress, settings, wpm, accuracy, updateSettings, addBook, setCurrentBook, setChapterIndex } = useStore();

  const currentBook = progress.bookId ? books[progress.bookId] : null;

  // Load preloaded books on mount
  useEffect(() => {
    const initPreloaded = async () => {
      if (!books['alice.txt']) {
        const alice = await loadPreloadedBook('alice.txt', 'Alice in Wonderland');
        addBook(alice);
      }
      if (!books['meditations.txt']) {
        const meditations = await loadPreloadedBook('meditations.txt', 'Meditations');
        addBook(meditations);
      }
    };
    initPreloaded();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith('.txt')) {
      const txt = await file.text();
      const book = await parseTxt(txt, file.name);
      addBook(book);
      setCurrentBook(book.id);
    } else {
      alert('Only .txt is supported currently. .epub support coming soon!');
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30">
      {/* LEFT SIDEBAR - Books & Chapters */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-80 bg-zinc-900 border-r border-zinc-800 transition-transform duration-300 ease-in-out flex flex-col ${
          leftOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-400" /> Library
          </h2>
          <button onClick={() => setLeftOpen(false)} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          <label className="w-full flex items-center gap-3 p-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors text-left border border-zinc-700 cursor-pointer">
            <Upload className="w-4 h-4 text-zinc-400" />
            <span className="text-sm font-medium">Upload Book (.txt)</span>
            <input type="file" accept=".txt" className="hidden" onChange={handleFileUpload} />
          </label>

          <div className="mt-4">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 px-2">Your Books</h3>
            {Object.values(books).map(book => (
              <button
                key={book.id}
                onClick={() => setCurrentBook(book.id)}
                className={`w-full text-left p-2 px-3 rounded-md text-sm transition-colors ${
                  progress.bookId === book.id
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    : 'hover:bg-zinc-800/50 text-zinc-300'
                }`}
              >
                {book.title}
              </button>
            ))}
          </div>

          <div className="mt-4">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 px-2">Chapters</h3>
            {!currentBook && <div className="text-sm text-zinc-500 italic px-2">Select a book first.</div>}
            {currentBook && (
              <div className="flex flex-col gap-1 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                {currentBook.chapters.map((chapter, index) => (
                  <button
                    key={chapter.id}
                    onClick={() => setChapterIndex(index)}
                    className={`w-full text-left p-1.5 px-3 rounded-md text-xs transition-colors ${
                      progress.chapterIndex === index
                        ? 'bg-zinc-800 text-zinc-200 border-l-2 border-indigo-500'
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30'
                    }`}
                  >
                    {chapter.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* LEFT TOGGLE BUTTON */}
      {!leftOpen && (
        <button
          onClick={() => setLeftOpen(true)}
          className="fixed left-0 top-1/2 -translate-y-1/2 z-30 p-2 bg-zinc-900/80 hover:bg-zinc-800 backdrop-blur-md rounded-r-xl border border-l-0 border-zinc-800 transition-colors shadow-lg"
        >
          <ChevronRight className="w-5 h-5 text-zinc-400" />
        </button>
      )}

      {/* MAIN CONTENT */}
      <main className="flex-1 h-full relative overflow-y-auto flex flex-col" onClick={() => { setLeftOpen(false); setRightOpen(false); }}>
        <div className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto w-full px-8 py-12">
          {children}
        </div>

        {/* Footer Stats */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-zinc-900/80 backdrop-blur-md px-6 py-2 rounded-full border border-zinc-800 flex items-center gap-6 text-sm shadow-xl z-20">
          <div className="flex flex-col items-center">
            <span className="text-zinc-500 text-xs uppercase font-bold tracking-wider">WPM</span>
            <span className="font-mono text-lg font-bold text-indigo-400">{wpm}</span>
          </div>
          <div className="w-px h-8 bg-zinc-800"></div>
          <div className="flex flex-col items-center">
            <span className="text-zinc-500 text-xs uppercase font-bold tracking-wider">Acc</span>
            <span className="font-mono text-lg font-bold text-emerald-400">{accuracy}%</span>
          </div>
        </div>
      </main>

      {/* RIGHT SIDEBAR - Themes & Settings */}
      <aside
        className={`fixed inset-y-0 right-0 z-40 w-80 bg-zinc-900 border-l border-zinc-800 transition-transform duration-300 ease-in-out flex flex-col ${
          rightOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <button onClick={() => setRightOpen(false)} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold flex items-center gap-2">
            Settings <Settings className="w-5 h-5 text-zinc-400" />
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8">
          <div>
            <h3 className="text-sm font-semibold text-zinc-400 mb-3">Typing Difficulty</h3>
            <div className="flex flex-col gap-2">
              {[
                { id: 'zen', name: 'Zen (Spacebar)', desc: 'Just press space to read.' },
                { id: 'lazy', name: 'Lazy (First Letter)', desc: 'Type first letter to auto-complete.' },
                { id: 'normal', name: 'Normal', desc: 'Standard forgiving typing.' },
                { id: 'strict', name: 'Strict', desc: 'No mistakes allowed.' }
              ].map(diff => (
                <label key={diff.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  settings.difficulty === diff.id
                    ? 'border-indigo-500/50 bg-indigo-500/10 hover:bg-zinc-800'
                    : 'border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800'
                }`}>
                  <input
                    type="radio"
                    name="difficulty"
                    checked={settings.difficulty === diff.id}
                    onChange={() => updateSettings({ difficulty: diff.id as any })}
                    className="text-indigo-500 bg-zinc-950 border-zinc-700"
                  />
                  <div>
                    <div className="text-sm font-medium">{diff.name}</div>
                    <div className="text-xs text-zinc-500">{diff.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-zinc-400 mb-3">Themes</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => updateSettings({ theme: 'minimal' })}
                className={`py-3 px-4 rounded-lg border text-sm font-medium transition-colors ${
                  settings.theme === 'minimal'
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50'
                    : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700'
                }`}
              >
                Minimal
              </button>
              <button
                onClick={() => updateSettings({ theme: 'explosive' })}
                className={`py-3 px-4 rounded-lg border text-sm font-medium transition-colors ${
                  settings.theme === 'explosive'
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50'
                    : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700'
                }`}
              >
                Explosive
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* RIGHT TOGGLE BUTTON */}
      {!rightOpen && (
        <button
          onClick={() => setRightOpen(true)}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-30 p-2 bg-zinc-900/80 hover:bg-zinc-800 backdrop-blur-md rounded-l-xl border border-r-0 border-zinc-800 transition-colors shadow-lg"
        >
          <Settings className="w-5 h-5 text-zinc-400" />
        </button>
      )}
    </div>
  );
};

export default Layout;
