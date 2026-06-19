import React from "react";

export function highlightMatch(text: string, query: string) {
  if (!query || !query.trim() || !text) return parseInlineStyles(text);

  const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
  const regex = new RegExp(`(${escapedQuery})`, "gi");
  const parts = text.split(regex);

  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-gold/30 text-gold font-bold rounded px-0.5 select-all">
        {part}
      </mark>
    ) : (
      <React.Fragment key={i}>{parseInlineStyles(part)}</React.Fragment>
    ),
  );
}

export function parseInlineStyles(
  text: string,
  onSelectPage?: (id: string, title: string) => void,
): React.ReactNode {
  if (!text) return "";

  // 1. Regex for standard markdown images: ![alt](url)
  const imgRegex = /!\[(.*?)\]\((.*?)\)/g;
  const imgParts = text.split(imgRegex);

  if (imgParts.length === 1) {
    return parseLinksAndStyles(text, onSelectPage);
  }

  const elements: React.ReactNode[] = [];
  for (let i = 0; i < imgParts.length; i += 3) {
    if (imgParts[i]) {
      elements.push(
        <React.Fragment key={`text-${i}`}>
          {parseLinksAndStyles(imgParts[i], onSelectPage)}
        </React.Fragment>,
      );
    }

    if (i + 2 < imgParts.length) {
      const alt = imgParts[i + 1];
      const url = imgParts[i + 2];
      elements.push(
        <img
          key={`img-${i}`}
          src={url}
          alt={alt}
          className="h-8 w-8 rounded-full inline-block object-cover border border-border align-middle mx-1 shadow-sm hover:scale-110 transition-transform duration-200"
        />,
      );
    }
  }

  return <>{elements}</>;
}

function parseLinksAndStyles(
  text: string,
  onSelectPage?: (id: string, title: string) => void,
): React.ReactNode {
  const linkRegex = /\[(.*?)\]\(pageId:(.*?)\)/g;
  const parts = text.split(linkRegex);

  if (parts.length === 1) {
    return parseBoldItalic(text);
  }

  const elements: React.ReactNode[] = [];
  for (let i = 0; i < parts.length; i += 3) {
    if (parts[i]) {
      elements.push(<span key={`text-${i}`}>{parseBoldItalic(parts[i])}</span>);
    }

    if (i + 2 < parts.length) {
      const linkTitle = parts[i + 1];
      const linkId = parts[i + 2];
      if (onSelectPage) {
        elements.push(
          <button
            key={`link-${i}`}
            onClick={() => onSelectPage(linkId, linkTitle)}
            className="text-purple-400 hover:text-purple-300 font-bold hover:underline bg-transparent border-none p-0 cursor-pointer text-left inline mx-0.5"
          >
            {linkTitle}
          </button>,
        );
      } else {
        elements.push(
          <span key={`link-${i}`} className="text-purple-400 font-semibold mx-0.5">
            {linkTitle}
          </span>,
        );
      }
    }
  }

  return <>{elements}</>;
}

function parseBoldItalic(text: string): React.ReactNode {
  const boldParts = text.split(/\*\*([^*]+)\*\*/g);
  return boldParts.map((part, index) => {
    if (index % 2 === 1) {
      return (
        <strong key={index} className="text-gold font-bold">
          {part}
        </strong>
      );
    }
    const italicParts = part.split(/\*([^*]+)\*/g);
    return italicParts.map((subPart, subIndex) => {
      if (subIndex % 2 === 1) {
        return (
          <em key={subIndex} className="italic text-foreground/90">
            {subPart}
          </em>
        );
      }
      return subPart;
    });
  });
}
