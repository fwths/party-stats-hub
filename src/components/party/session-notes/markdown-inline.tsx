import React from "react";
import { FileText } from "lucide-react";
import { PartyMember } from "@/lib/dndbeyond.types";

export function highlightMatch(text: string, query: string, members?: PartyMember[]) {
  if (!query || !query.trim() || !text) return parseInlineStyles(text, undefined, members);

  const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
  const regex = new RegExp(`(${escapedQuery})`, "gi");
  const parts = text.split(regex);

  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-gold/30 text-gold font-bold rounded px-0.5 select-all">
        {part}
      </mark>
    ) : (
      <React.Fragment key={i}>{parseInlineStyles(part, undefined, members)}</React.Fragment>
    ),
  );
}

export function parseInlineStyles(
  text: string,
  onSelectPage?: (id: string, title: string) => void,
  members?: PartyMember[],
): React.ReactNode {
  if (!text) return "";

  // Clean up punctuation spacing bugs (e.g. "Westruun , where" -> "Westruun, where")
  const cleanedText = text.replace(/\s+([,.?!;])/g, "$1");

  // 1. Regex for standard markdown images: ![alt](url)
  const imgRegex = /!\[(.*?)\]\((.*?)\)/g;
  const imgParts = cleanedText.split(imgRegex);

  if (imgParts.length === 1) {
    return parseLinksAndStyles(cleanedText, onSelectPage, members);
  }

  const elements: React.ReactNode[] = [];
  for (let i = 0; i < imgParts.length; i += 3) {
    if (imgParts[i]) {
      elements.push(
        <React.Fragment key={`text-${i}`}>
          {parseLinksAndStyles(imgParts[i], onSelectPage, members)}
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

function parseBoldItalic(text: string): React.ReactNode[] {
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

function parseBoldItalicStrikethrough(text: string): React.ReactNode {
  const strikeParts = text.split(/~~([^~]+)~~/g);
  const elements = strikeParts.map((part, index) => {
    if (index % 2 === 1) {
      return (
        <span key={`strike-${index}`} className="line-through text-muted-foreground">
          {parseBoldItalic(part)}
        </span>
      );
    }
    return parseBoldItalic(part);
  });
  return <>{elements}</>;
}

function parseUnderlines(text: string): React.ReactNode {
  const parts = text.split(/<u>(.*?)<\/u>/gi);
  const elements = parts.map((part, index) => {
    if (index % 2 === 1) {
      return (
        <span key={`u-${index}`} className="underline decoration-gold/60 text-gold font-semibold">
          {parseBoldItalicStrikethrough(part)}
        </span>
      );
    }
    return parseBoldItalicStrikethrough(part);
  });
  return <>{elements}</>;
}

function parseInlineCode(text: string): React.ReactNode {
  const parts = text.split(/`([^`]+)`/g);
  const elements = parts.map((part, index) => {
    if (index % 2 === 1) {
      return (
        <code
          key={`code-${index}`}
          className="px-1.5 py-0.5 rounded bg-black/45 border border-border/40 font-mono text-[11px] text-emerald-400 select-all align-middle"
        >
          {part}
        </code>
      );
    }
    return parseUnderlines(part);
  });
  return <>{elements}</>;
}

function parseLinksAndStyles(
  text: string,
  onSelectPage?: (id: string, title: string) => void,
  members?: PartyMember[],
): React.ReactNode {
  // Matches:
  // 1. [Title](pageId:ID)
  // 2. [Title](URL)
  const linkRegex = /\[(.*?)\]\((pageId:|https?:\/\/)(.*?)\)/g;
  const parts = text.split(linkRegex);

  if (parts.length === 1) {
    return parseInlineCode(text);
  }

  const elements: React.ReactNode[] = [];
  for (let i = 0; i < parts.length; i += 4) {
    if (parts[i]) {
      elements.push(<span key={`text-${i}`}>{parseInlineCode(parts[i])}</span>);
    }

    if (i + 3 < parts.length) {
      const linkTitle = parts[i + 1];
      const linkType = parts[i + 2];
      const linkTarget = parts[i + 3];

      if (linkType === "pageId:") {
        const normalize = (val: string) =>
          val
            .toLowerCase()
            .replace(/[“”"']/g, "")
            .replace(/\s+/g, " ")
            .trim();

        const getCleanName = (name: string) => {
          return name.replace(/["'“‘”’].*?["'“‘”’]/g, "");
        };

        const normalizedLinkTitle = normalize(linkTitle);
        const matchMember = members?.find((m) => {
          const normalizedMemberName = normalize(m.name);
          if (
            normalizedLinkTitle.includes(normalizedMemberName) ||
            normalizedMemberName.includes(normalizedLinkTitle)
          ) {
            return true;
          }

          const mClean = normalize(getCleanName(m.name));
          const lClean = normalize(getCleanName(linkTitle));
          if (mClean && lClean && (mClean.includes(lClean) || lClean.includes(mClean))) {
            return true;
          }

          const mWords = normalizedMemberName.split(/\s+/).filter((w) => w.length > 2);
          const lWords = normalizedLinkTitle.split(/\s+/).filter((w) => w.length > 2);
          const commonWords = mWords.filter((w) => lWords.includes(w));
          if (commonWords.length >= 2) {
            return true;
          }

          return false;
        });

        if (onSelectPage) {
          elements.push(
            <button
              key={`link-${i}`}
              onClick={() => onSelectPage(linkTarget, linkTitle)}
              className={`${
                matchMember
                  ? "text-gold hover:text-yellow-300 inline-flex items-center gap-1.5 align-middle"
                  : "text-purple-400 hover:text-purple-300 inline"
              } font-bold hover:underline bg-transparent border-none p-0 cursor-pointer text-left mx-0.5`}
            >
              {matchMember?.avatarUrl && (
                <img
                  src={matchMember.avatarUrl}
                  alt={matchMember.name}
                  className="h-[22px] w-[22px] rounded-full object-cover border border-border/50 shadow-sm flex-shrink-0"
                />
              )}
              <span>{linkTitle}</span>
            </button>,
          );
        } else {
          elements.push(
            <span
              key={`link-${i}`}
              className={`${
                matchMember
                  ? "text-gold inline-flex items-center gap-1.5 align-middle"
                  : "text-purple-400 inline"
              } font-semibold mx-0.5`}
            >
              {matchMember?.avatarUrl && (
                <img
                  src={matchMember.avatarUrl}
                  alt={matchMember.name}
                  className="h-[22px] w-[22px] rounded-full object-cover border border-border/50 shadow-sm flex-shrink-0"
                />
              )}
              <span>{linkTitle}</span>
            </span>,
          );
        }
      } else {
        const fullUrl = linkType + linkTarget;
        elements.push(
          <a
            key={`link-${i}`}
            href={fullUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gold hover:text-yellow-300 font-bold hover:underline mx-0.5 inline-flex items-center gap-0.5 align-baseline"
          >
            {linkTitle}
          </a>,
        );
      }
    }
  }

  return <>{elements}</>;
}
