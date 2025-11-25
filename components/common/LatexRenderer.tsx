'use client';

import React from 'react';

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

      // Handle sandbox:// URLs (should have been replaced, but show as simple link if not)
      processed = processed.replace(/\[([^\]]+)\]\(sandbox:\/\/?([^\)]+)\)/g, (match, text, path) => {
        console.warn('[LatexRenderer] ⚠️ Sandbox URL not replaced on backend, showing as simple link:', match);
        // Show as plain text to avoid confusion (backend should replace these)
        return `<span class="text-mathtai-green underline">${text}</span>`;
      });

      // Handle Markdown images ![alt](url) - support absolute or relative URLs
      processed = processed.replace(/!\[([^\]]*)\]\((https?:\/\/[^\)\s]+|\/[^\)\s]+)\)/g, (match, alt, url) => {
        console.log('[LatexRenderer] 🖼️ Rendering image:', alt, url);
        return `<div class="my-4">
          <img src="${url}" alt="${alt}" class="max-w-full h-auto rounded-lg shadow-md mx-auto" style="max-height: 400px;" />
        </div>`;
      });

      // Handle markdown links - simple file download links (absolute or relative URLs)
      processed = processed.replace(/\[([^\]]+)\]\((https?:\/\/[^\)\s]+|\/[^\)\s]+)\)/g, (match, text, url) => {
        // Check if this is a file download link from Supabase storage
        if (url.includes('/api/files/serve')) {
          console.log('[LatexRenderer] ✅ Rendering download link for:', text);
          // Ensure URL has all necessary parts, especially if it was somehow truncated
          return `<a href="${url}" download="${text}" class="text-mathtai-green hover:text-mathtai-chalkboard underline font-semibold cursor-pointer">${text}</a>`;
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
