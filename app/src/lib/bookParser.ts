import JSZip from 'jszip';
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
  const rawParagraphs = text.split(/\n\s*\n/)
    .map(p => p.trim().replace(/\s+/g, ' '))
    .filter(p => p.length > 20);

  const chapters: Chapter[] = [];
  const chunkSize = 20;

  for (let i = 0; i < rawParagraphs.length; i += chunkSize) {
    const chunk = rawParagraphs.slice(i, i + chunkSize);
    chapters.push({
      id: `chapter-${i / chunkSize}`,
      title: `Part ${Math.floor(i / chunkSize) + 1}`,
      content: chunk.join('\n\n'),
      paragraphs: chunk
    });
  }

  const titleLine = fileName.replace('.txt', '').replace(/[-_]/g, ' ');
  const title = titleLine.charAt(0).toUpperCase() + titleLine.slice(1);

  return {
    id: `txt-${Date.now()}`,
    title,
    author: 'Unknown',
    chapters
  };
};

export const parseEpub = async (file: File | Blob): Promise<Book> => {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(file);

  // Find container.xml to locate the .opf file
  const containerXml = await loadedZip.file('META-INF/container.xml')?.async('text');
  if (!containerXml) throw new Error('Not a valid EPUB: Missing META-INF/container.xml');

  // Regex to extract the .opf path
  const opfMatch = containerXml.match(/full-path="([^"]+)"/);
  if (!opfMatch) throw new Error('Not a valid EPUB: Cannot find .opf file path');

  const opfPath = opfMatch[1];
  const opfXml = await loadedZip.file(opfPath)?.async('text');
  if (!opfXml) throw new Error('Not a valid EPUB: Cannot read .opf file');

  const basePath = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';

  // Extract Metadata (Title & Author)
  const titleMatch = opfXml.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/i);
  const authorMatch = opfXml.match(/<dc:creator[^>]*>([^<]+)<\/dc:creator>/i);

  const title = titleMatch ? titleMatch[1].trim() : 'Unknown Title';
  const author = authorMatch ? authorMatch[1].trim() : 'Unknown Author';

  // Extract manifest to map id to href
  const manifestItems: Record<string, string> = {};
  const manifestRegex = /<item [^>]*id="([^"]+)"[^>]*href="([^"]+)"[^>]*\/>/gi;
  let mMatch;
  while ((mMatch = manifestRegex.exec(opfXml)) !== null) {
    manifestItems[mMatch[1]] = mMatch[2];
  }

  // Extract spine to get reading order
  const spineRegex = /<itemref [^>]*idref="([^"]+)"[^>]*\/>/gi;
  const spineItems: string[] = [];
  let sMatch;
  while ((sMatch = spineRegex.exec(opfXml)) !== null) {
    if (manifestItems[sMatch[1]]) {
      spineItems.push(manifestItems[sMatch[1]]);
    }
  }

  const chapters: Chapter[] = [];

  // Parse HTML content from spine
  for (let i = 0; i < spineItems.length; i++) {
    const href = spineItems[i];
    // Resolve relative path
    const filePath = basePath + href;
    const fileObj = loadedZip.file(filePath) || loadedZip.file(decodeURIComponent(filePath));

    if (fileObj) {
      const htmlText = await fileObj.async('text');

      // Basic HTML parser using Regex
      // Remove head and styles
      let bodyText = htmlText.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '');
      bodyText = bodyText.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

      // Extract paragraphs
      const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
      const rawParagraphs: string[] = [];
      let pMatch;
      while ((pMatch = pRegex.exec(bodyText)) !== null) {
        // Strip HTML tags from paragraph content and decode basic entities
        let text = pMatch[1].replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .replace(/\s+/g, ' ')
          .trim();

        if (text.length > 20) {
          rawParagraphs.push(text);
        }
      }

      if (rawParagraphs.length > 0) {
        // Attempt to extract a chapter title from h1, h2, h3
        const hRegex = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i;
        const hMatch = hRegex.exec(bodyText);
        let chapterTitle = `Chapter ${chapters.length + 1}`;
        if (hMatch) {
          chapterTitle = hMatch[1].replace(/<[^>]+>/g, '').trim() || chapterTitle;
        }

        chapters.push({
          id: `chapter-${chapters.length}`,
          title: chapterTitle,
          content: rawParagraphs.join('\n\n'),
          paragraphs: rawParagraphs
        });
      }
    }
  }

  if (chapters.length === 0) {
    throw new Error("Could not extract any readable text from this EPUB.");
  }

  return {
    id: `epub-${Date.now()}`,
    title,
    author,
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
