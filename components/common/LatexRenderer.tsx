'use client';

import React from 'react';
import 'katex/dist/katex.min.css';

interface LatexRendererProps {
  content: string;
}

export default function LatexRenderer({ content }: LatexRendererProps) {
  const [renderedContent, setRenderedContent] = React.useState<string>('');

  React.useEffect(() => {
    const renderLatex = async () => {
      const katex = (await import('katex')).default;

      // Process the content to render LaTeX
      let processed = content;

      // Handle display math ($$...$$)
      processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (match, latex) => {
        try {
          return `<div class="math-display">${katex.renderToString(latex.trim(), {
            displayMode: true,
            throwOnError: false,
          })}</div>`;
        } catch (e) {
          return match;
        }
      });

      // Handle inline math ($...$)
      processed = processed.replace(/\$([^\$\n]+?)\$/g, (match, latex) => {
        try {
          return katex.renderToString(latex.trim(), {
            displayMode: false,
            throwOnError: false,
          });
        } catch (e) {
          return match;
        }
      });

      // Handle LaTeX in square brackets \[...\]
      processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, (match, latex) => {
        try {
          return `<div class="math-display">${katex.renderToString(latex.trim(), {
            displayMode: true,
            throwOnError: false,
          })}</div>`;
        } catch (e) {
          return match;
        }
      });

      // Handle LaTeX in parentheses \(...\)
      processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, (match, latex) => {
        try {
          return katex.renderToString(latex.trim(), {
            displayMode: false,
            throwOnError: false,
          });
        } catch (e) {
          return match;
        }
      });

      // Handle sandbox:// URLs (should have been replaced, but handle as fallback)
      const sandboxMatches = processed.match(/\[([^\]]+)\]\(sandbox:\/\/?[^\)]+\)/g);
      if (sandboxMatches) {
        console.warn('[LatexRenderer] ⚠️ Found unreplaced sandbox:// URLs:', sandboxMatches.length);
        console.warn('[LatexRenderer] URLs:', sandboxMatches);
      }

      processed = processed.replace(/\[([^\]]+)\]\(sandbox:\/\/?([^\)]+)\)/g, (match, text) => {
        console.error('[LatexRenderer] ❌ Sandbox URL not replaced on backend:', match);
        return `<span class="inline-flex items-center gap-2 bg-red-100 text-red-800 px-4 py-2 rounded-lg my-2 border-2 border-red-300">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          ⚠️ File link error: ${text}
        </span>`;
      });

      // Handle markdown links - simple text hyperlinks for downloads
      processed = processed.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, (match, text, url) => {
        // Check if this is a file download link from Supabase storage
        if (url.includes('supabase') && url.includes('agent-files')) {
          console.log('[LatexRenderer] ✅ Rendering download link for:', text);
          // Simple underlined text link with download attribute
          return `<a href="${url}" download class="text-mathtai-green hover:text-mathtai-chalkboard underline font-medium">${text}</a>`;
        }
        // Regular links
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-mathtai-green hover:text-mathtai-chalkboard underline">${text}</a>`;
      });

      // Convert newlines to <br> tags
      processed = processed.replace(/\n/g, '<br/>');

      setRenderedContent(processed);
    };

    renderLatex();
  }, [content]);

  return (
    <div
      className="prose prose-sm max-w-none overflow-x-auto break-words"
      style={{
        wordBreak: 'break-word',
        overflowWrap: 'anywhere',
        wordWrap: 'break-word',
        maxWidth: '100%'
      }}
      dangerouslySetInnerHTML={{ __html: renderedContent }}
    />
  );
}
