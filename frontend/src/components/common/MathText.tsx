import React from 'react';
import katex from 'katex';

interface MathTextProps {
  content: string;
  className?: string;
}

export const MathText: React.FC<MathTextProps> = ({ content, className = '' }) => {
  // Split content by LaTeX blocks and inline math
  const renderFormatted = (text: string) => {
    // 1. Process block math: $$ ... $$
    const blockRegex = /\$\$([\s\S]*?)\$\$/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = blockRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(...renderInlineMathAndMarkdown(text.slice(lastIndex, match.index), `sub-${lastIndex}`));
      }
      const mathExpr = match[1].trim();
      let renderedMath = mathExpr;
      try {
        renderedMath = katex.renderToString(mathExpr, { displayMode: true, throwOnError: false });
      } catch (err) {
        // fallback
      }
      parts.push(
        <div
          key={`block-math-${match.index}`}
          className="my-3 py-2 px-3 overflow-x-auto bg-slate-900/60 border border-slate-800 rounded-lg text-blue-200"
          dangerouslySetInnerHTML={{ __html: renderedMath }}
        />
      );
      lastIndex = blockRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(...renderInlineMathAndMarkdown(text.slice(lastIndex), `sub-${lastIndex}`));
    }

    return parts;
  };

  const renderInlineMathAndMarkdown = (str: string, keyPrefix: string): React.ReactNode[] => {
    // Split lines to handle markdown headings, lists, quotes
    const lines = str.split('\n');
    return lines.map((line, idx) => {
      const lineKey = `${keyPrefix}-l-${idx}`;
      const trimmed = line.trim();

      if (!trimmed) {
        return <div key={lineKey} className="h-2" />;
      }

      // Headings
      if (line.startsWith('### ')) {
        return (
          <h3 key={lineKey} className="text-base font-semibold text-slate-100 mt-4 mb-1.5 flex items-center gap-1.5">
            {renderInlineSpans(line.replace('### ', ''), lineKey)}
          </h3>
        );
      }
      if (line.startsWith('## ')) {
        return (
          <h2 key={lineKey} className="text-lg font-bold text-blue-300 mt-5 mb-2 border-b border-slate-800 pb-1 flex items-center gap-2">
            {renderInlineSpans(line.replace('## ', ''), lineKey)}
          </h2>
        );
      }
      if (line.startsWith('# ')) {
        return (
          <h1 key={lineKey} className="text-xl font-extrabold text-blue-400 mt-6 mb-2">
            {renderInlineSpans(line.replace('# ', ''), lineKey)}
          </h1>
        );
      }

      // Blockquotes
      if (line.startsWith('> ')) {
        return (
          <blockquote key={lineKey} className="border-l-2 border-amber-500/80 bg-amber-500/5 px-3 py-1.5 my-2 rounded-r text-amber-200/90 text-sm italic">
            {renderInlineSpans(line.replace('> ', ''), lineKey)}
          </blockquote>
        );
      }

      // Bullet lists
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return (
          <div key={lineKey} className="flex items-start gap-2 text-sm text-slate-300 my-1 pl-2">
            <span className="text-blue-400 font-bold leading-5">•</span>
            <div className="flex-1 leading-relaxed">
              {renderInlineSpans(line.substring(2), lineKey)}
            </div>
          </div>
        );
      }

      // Regular paragraph
      return (
        <p key={lineKey} className="text-sm text-slate-300 leading-relaxed my-1.5">
          {renderInlineSpans(line, lineKey)}
        </p>
      );
    });
  };

  const renderInlineSpans = (text: string, prefix: string): React.ReactNode[] => {
    // Process inline math: $ ... $
    const inlineRegex = /\$([^\$]+?)\$/g;
    const elements: React.ReactNode[] = [];
    let lastIdx = 0;
    let match;

    while ((match = inlineRegex.exec(text)) !== null) {
      if (match.index > lastIdx) {
        elements.push(parseMarkdownSpans(text.slice(lastIdx, match.index), `${prefix}-txt-${lastIdx}`));
      }
      const mathCode = match[1].trim();
      let html = mathCode;
      try {
        html = katex.renderToString(mathCode, { displayMode: false, throwOnError: false });
      } catch (e) {
        // fallback
      }
      elements.push(
        <span
          key={`${prefix}-math-${match.index}`}
          className="inline-block px-1 py-0.5 text-blue-300 font-medium align-baseline"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
      lastIdx = inlineRegex.lastIndex;
    }

    if (lastIdx < text.length) {
      elements.push(parseMarkdownSpans(text.slice(lastIdx), `${prefix}-txt-${lastIdx}`));
    }

    return elements;
  };

  const parseMarkdownSpans = (plain: string, key: string): React.ReactNode => {
    // Basic bold and code rendering
    const boldParts = plain.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    return (
      <span key={key}>
        {boldParts.map((sub, sIdx) => {
          if (sub.startsWith('**') && sub.endsWith('**')) {
            return (
              <strong key={sIdx} className="font-semibold text-slate-100">
                {sub.slice(2, -2)}
              </strong>
            );
          }
          if (sub.startsWith('`') && sub.endsWith('`')) {
            return (
              <code key={sIdx} className="bg-slate-800 text-sky-300 px-1 py-0.5 rounded text-xs font-mono border border-slate-700/60">
                {sub.slice(1, -1)}
              </code>
            );
          }
          return sub;
        })}
      </span>
    );
  };

  return <div className={`math-content ${className}`}>{renderFormatted(content)}</div>;
};
