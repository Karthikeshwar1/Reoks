import type { Book, Chapter } from '../types';

export const parseTxt = async (file: File | Blob | string, fileName: string): Promise<Book> => {
  let text = '';

  if (typeof file === 'string') {
    text = file; // Direct text content
  } else {
    text = await file.text();
  }

  // Clean up gutenberg headers/footers roughly if it's a gutenberg book
  const startMarker = '*** START OF THE PROJECT GUTENBERG EBOOK';
  const endMarker = '*** END OF THE PROJECT GUTENBERG EBOOK';

  let startIndex = text.indexOf(startMarker);
  if (startIndex !== -1) {
    const endOfLine = text.indexOf('\n', startIndex);
    text = text.slice(endOfLine + 1);
  }

  let endIndex = text.indexOf(endMarker);
  if (endIndex !== -1) {
    text = text.slice(0, endIndex);
  }

  // Split into chapters very roughly (by double line breaks or "Chapter" keywords)
  // For simplicity with generic TXTs, we will just split by double line breaks and group into chunks of paragraphs.

  const rawParagraphs = text.split(/\n\s*\n/)
    .map(p => p.trim().replace(/\s+/g, ' '))
    .filter(p => p.length > 20); // ignore very short lines/headers for now

  const chapters: Chapter[] = [];
  const chunkSize = 20; // Group 20 paragraphs into a "Chapter"

  for (let i = 0; i < rawParagraphs.length; i += chunkSize) {
    const chunk = rawParagraphs.slice(i, i + chunkSize);
    chapters.push({
      id: `chapter-${i / chunkSize}`,
      title: `Part ${Math.floor(i / chunkSize) + 1}`,
      content: chunk.join('\n\n'),
      paragraphs: chunk
    });
  }

  // Very basic title extraction
  const titleLine = fileName.replace('.txt', '').replace(/[-_]/g, ' ');
  const title = titleLine.charAt(0).toUpperCase() + titleLine.slice(1);

  return {
    id: `txt-${Date.now()}`,
    title,
    author: 'Unknown',
    chapters
  };
};

export const loadPreloadedBook = async (filename: string, title: string): Promise<Book> => {
  try {
    const response = await fetch(`/books/${filename}`);
    if (!response.ok) throw new Error('Failed to fetch book');
    const text = await response.text();
    const book = await parseTxt(text, filename);
    book.id = filename; // stable ID for preloaded books
    book.title = title;
    return book;
  } catch (err) {
    console.error('Error loading preloaded book:', err);
    throw err;
  }
};
