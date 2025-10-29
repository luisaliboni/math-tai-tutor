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

      // Convert newlines to <br> tags
      processed = processed.replace(/\n/g, '<br/>');

      setRenderedContent(processed);
    };

    renderLatex();
  }, [content]);

  return (
    <div
      className="prose prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: renderedContent }}
    />
  );
}
