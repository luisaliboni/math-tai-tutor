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

      // Handle Markdown images ![alt](url) - MUST be processed BEFORE markdown formatting
      // This prevents underscores in filenames from being converted to <em> tags
      // Match both with and without query parameters, handle URLs with special characters
      processed = processed.replace(/!\[([^\]]*)\]\(([^\)]+)\)/g, (match, alt, url) => {
        console.log('[LatexRenderer] 🖼️ Rendering image:', alt, url);
        // Ensure image URLs are served inline (not as download)
        let imageUrl = url.trim();
        if (imageUrl.includes('/api/files/serve')) {
          // For images, remove download=true if present, or ensure it's not there
          imageUrl = imageUrl.replace(/[?&]download=true/, '');
          // If there's a trailing &, remove it
          imageUrl = imageUrl.replace(/&$/, '');
        }
        return `<div class="my-4">
          <img src="${imageUrl}" alt="${alt || 'Image'}" class="max-w-full h-auto rounded-lg shadow-md mx-auto" style="max-height: 400px;" onerror="this.style.display='none'; console.error('Failed to load image:', '${imageUrl}');" />
        </div>`;
      });

      // Handle markdown links - simple file download links (absolute or relative URLs)
      // Process AFTER images to avoid conflicts
      processed = processed.replace(/\[([^\]]+)\]\(([^\)\s]+)\)/g, (match, text, url) => {
        // Skip if this was already processed as an image (starts with !)
        // This shouldn't happen due to order, but just in case
        
        // Check if this is a file download link from Supabase storage
        if (url.includes('/api/files/serve')) {
          console.log('[LatexRenderer] ✅ Rendering download link for:', text);
          
          // For download links, ensure download=true is in the URL
          // This ensures old messages work correctly too
          let downloadUrl = url;
          if (!url.includes('download=true')) {
            downloadUrl = url.includes('?') ? `${url}&download=true` : `${url}?download=true`;
          }
          
          // Extract filename from text if it looks like a filename
          const filename = text.includes('.') ? text : url.split('/').pop()?.split('?')[0] || 'download';
          
          // Ensure URL has all necessary parts, especially if it was somehow truncated
          return `<a href="${downloadUrl}" download="${filename}" class="text-mathtai-green hover:text-mathtai-chalkboard underline font-semibold cursor-pointer">${text}</a>`;
        }
        // Regular links
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-mathtai-green hover:text-mathtai-chalkboard underline">${text}</a>`;
      });

      // Handle plain URLs (not in markdown format) - make them clickable
      // Do this after markdown links to avoid double-processing
      // Match URLs from http:// or https:// until whitespace or punctuation that's clearly not part of URL
      processed = processed.replace(/(?<!href=["'])(?<!href=)(https?:\/\/[^\s<>"',.!?;:)]+)/g, (match, url) => {
        // Remove trailing punctuation that's not part of the URL (but keep trailing slash)
        url = url.replace(/[.,!?;:)]+$/, '');
        
        // Don't process if already inside an HTML tag
        const urlIndex = processed.indexOf(match);
        const beforeMatch = processed.substring(0, urlIndex);
        const openTags = (beforeMatch.match(/<a[^>]*>/g) || []).length;
        const closeTags = (beforeMatch.match(/<\/a>/g) || []).length;
        if (openTags > closeTags) {
          return match;
        }
        
        // Check if the URL appears right after "href="
        const beforeUrl = processed.substring(Math.max(0, urlIndex - 10), urlIndex);
        if (beforeUrl.includes('href=')) {
          return match;
        }
        
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-mathtai-green hover:text-mathtai-chalkboard underline">${url}</a>`;
      });

      // Handle markdown bold (**text** or __text__)
      // Process bold after links to avoid conflicts
      // Use a more specific regex to avoid matching inside HTML tags
      processed = processed.replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>');
      processed = processed.replace(/__(?!_)([^_\n]+?)(?<!_)__/g, '<strong>$1</strong>');

      // Handle markdown italic (*text* or _text_) - but not if it's part of bold
      // Process italic after bold to avoid conflicts
      // CRITICAL: Don't process underscores that are inside HTML attributes (src=, href=, etc.)
      // This prevents URLs like weather_probability_tree.png from being converted to weather<em>probability</em>tree.png
      
      // Process asterisk-based italic first
      processed = processed.replace(/(?<!\*)\*(?!\*)([^*\n]+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
      
      // Process underscore-based italic, but skip if inside HTML tags/attributes
      // Split by HTML tags, process only the text parts
      const parts: string[] = [];
      let lastIndex = 0;
      const tagRegex = /<[^>]+>/g;
      let match;
      
      while ((match = tagRegex.exec(processed)) !== null) {
        // Add text before the tag
        if (match.index > lastIndex) {
          const textBefore = processed.substring(lastIndex, match.index);
          // Process italic in this text part
          const processedText = textBefore.replace(/(?<!_)_(?!_)([^_\n]+?)(?<!_)_(?!_)/g, '<em>$1</em>');
          parts.push(processedText);
        }
        // Add the tag as-is
        parts.push(match[0]);
        lastIndex = tagRegex.lastIndex;
      }
      
      // Add remaining text after last tag
      if (lastIndex < processed.length) {
        const textAfter = processed.substring(lastIndex);
        const processedText = textAfter.replace(/(?<!_)_(?!_)([^_\n]+?)(?<!_)_(?!_)/g, '<em>$1</em>');
        parts.push(processedText);
      }
      
      // If we found tags, reconstruct with processed text
      if (parts.length > 0) {
        processed = parts.join('');
      } else {
        // No HTML tags found, process normally
        processed = processed.replace(/(?<!_)_(?!_)([^_\n]+?)(?<!_)_(?!_)/g, '<em>$1</em>');
      }

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
