import { BookOpen, Flame, Moon, Skull, RefreshCw, Shield, Layers, Eye, Heart } from "lucide-react";

const SCHOOL_THEMES: Record<
  string,
  {
    color: string;
    bg: string;
    text: string;
    border: string;
    glow: string;
    icon: any;
  }
> = {
  abjuration: {
    color: "ui-cyan",
    bg: "bg-ui-cyan/10",
    text: "text-ui-cyan",
    border: "border-ui-cyan/30",
    glow: "shadow-ui-cyan/20",
    icon: Shield,
  },
  conjuration: {
    color: "ui-orange",
    bg: "bg-ui-orange/10",
    text: "text-ui-orange",
    border: "border-ui-orange/30",
    glow: "shadow-ui-orange/20",
    icon: Layers,
  },
  divination: {
    color: "ui-indigo",
    bg: "bg-ui-indigo/10",
    text: "text-ui-indigo",
    border: "border-ui-indigo/30",
    glow: "shadow-ui-indigo/20",
    icon: Eye,
  },
  enchantment: {
    color: "ui-pink",
    bg: "bg-ui-pink/10",
    text: "text-ui-pink",
    border: "border-ui-pink/30",
    glow: "shadow-ui-pink/20",
    icon: Heart,
  },
  evocation: {
    color: "ui-red",
    bg: "bg-ui-red/10",
    text: "text-ui-red",
    border: "border-ui-red/30",
    glow: "shadow-ui-red/20",
    icon: Flame,
  },
  illusion: {
    color: "ui-purple",
    bg: "bg-ui-purple/10",
    text: "text-ui-purple",
    border: "border-ui-purple/30",
    glow: "shadow-ui-purple/20",
    icon: Moon,
  },
  necromancy: {
    color: "ui-emerald",
    bg: "bg-ui-emerald/10",
    text: "text-ui-emerald",
    border: "border-ui-emerald/30",
    glow: "shadow-ui-emerald/20",
    icon: Skull,
  },
  transmutation: {
    color: "ui-amber",
    bg: "bg-ui-amber/10",
    text: "text-ui-amber",
    border: "border-ui-amber/30",
    glow: "shadow-ui-amber/20",
    icon: RefreshCw,
  },
};

const getSchoolTheme = (schoolName?: string) => {
  const normalized = schoolName?.toLowerCase() || "";
  return (
    SCHOOL_THEMES[normalized] || {
      color: "muted",
      bg: "bg-muted/30",
      text: "text-muted-foreground",
      border: "border-border/50",
      glow: "shadow-border/10",
      icon: BookOpen,
    }
  );
};

export function MagicalSealWatermark({ school }: { school?: string }) {
  const normalized = school?.toLowerCase() || "";

  const renderGeometry = () => {
    switch (normalized) {
      case "abjuration":
        return (
          <>
            <circle cx="100" cy="100" r="90" stroke="currentColor" strokeWidth="1" fill="none" />
            <circle
              cx="100"
              cy="100"
              r="70"
              stroke="currentColor"
              strokeWidth="0.5"
              fill="none"
              strokeDasharray="3 3"
            />
            <polygon
              points="100,20 180,60 180,140 100,180 20,140 20,60"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
            />
            <polygon
              points="100,35 160,65 160,135 100,165 40,135 40,65"
              stroke="currentColor"
              strokeWidth="0.75"
              fill="none"
              strokeDasharray="5 2"
            />
            <circle cx="100" cy="100" r="25" stroke="currentColor" strokeWidth="1" fill="none" />
            <path
              d="M 100 10 L 100 190 M 10 100 L 190 100"
              stroke="currentColor"
              strokeWidth="0.5"
              opacity="0.5"
            />
          </>
        );
      case "evocation":
        return (
          <>
            <circle cx="100" cy="100" r="90" stroke="currentColor" strokeWidth="1" fill="none" />
            <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="0.5" fill="none" />
            <polygon
              points="100,15 173,142 27,142"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
            />
            <polygon
              points="100,185 27,58 173,58"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
            />
            <line
              x1="100"
              y1="10"
              x2="100"
              y2="190"
              stroke="currentColor"
              strokeWidth="0.75"
              strokeDasharray="4 4"
            />
            <line
              x1="10"
              y1="100"
              x2="190"
              y2="100"
              stroke="currentColor"
              strokeWidth="0.75"
              strokeDasharray="4 4"
            />
            <line x1="36" y1="36" x2="164" y2="164" stroke="currentColor" strokeWidth="0.75" />
            <line x1="164" y1="36" x2="36" y2="164" stroke="currentColor" strokeWidth="0.75" />
            <circle cx="100" cy="100" r="30" stroke="currentColor" strokeWidth="1" fill="none" />
          </>
        );
      case "divination":
        return (
          <>
            <circle cx="100" cy="100" r="90" stroke="currentColor" strokeWidth="1" fill="none" />
            <circle
              cx="100"
              cy="100"
              r="85"
              stroke="currentColor"
              strokeWidth="0.5"
              fill="none"
              strokeDasharray="10 5 2 5"
            />
            <circle cx="100" cy="100" r="65" stroke="currentColor" strokeWidth="0.75" fill="none" />
            <circle
              cx="100"
              cy="100"
              r="45"
              stroke="currentColor"
              strokeWidth="0.5"
              fill="none"
              strokeDasharray="2 2"
            />
            <path
              d="M 50 100 Q 100 60 150 100 Q 100 140 50 100 Z"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
            />
            <circle cx="100" cy="100" r="20" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <circle cx="100" cy="100" r="8" fill="currentColor" />
            <path
              d="M 100 10 L 100 45 M 100 155 L 100 190 M 10 100 L 45 100 M 155 100 L 190 100"
              stroke="currentColor"
              strokeWidth="1"
            />
          </>
        );
      case "enchantment":
        return (
          <>
            <circle cx="100" cy="100" r="90" stroke="currentColor" strokeWidth="1" fill="none" />
            <circle cx="100" cy="100" r="75" stroke="currentColor" strokeWidth="0.5" fill="none" />
            <path
              d="M 100 20 C 140 20, 180 60, 180 100 C 180 140, 140 180, 100 180 C 60 180, 20 140, 20 100 C 20 60, 60 20, 100 20 Z"
              stroke="currentColor"
              strokeWidth="0.75"
              fill="none"
              transform="rotate(15 100 100)"
            />
            <path
              d="M 100 20 C 140 20, 180 60, 180 100 C 180 140, 140 180, 100 180 C 60 180, 20 140, 20 100 C 20 60, 60 20, 100 20 Z"
              stroke="currentColor"
              strokeWidth="0.75"
              fill="none"
              transform="rotate(45 100 100)"
            />
            <path
              d="M 100 20 C 140 20, 180 60, 180 100 C 180 140, 140 180, 100 180 C 60 180, 20 140, 20 100 C 20 60, 60 20, 100 20 Z"
              stroke="currentColor"
              strokeWidth="0.75"
              fill="none"
              transform="rotate(75 100 100)"
            />
            <circle
              cx="100"
              cy="100"
              r="35"
              stroke="currentColor"
              strokeWidth="1"
              fill="none"
              strokeDasharray="3 1"
            />
            <circle cx="100" cy="100" r="15" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </>
        );
      case "illusion":
        return (
          <>
            <circle cx="100" cy="100" r="90" stroke="currentColor" strokeWidth="1" fill="none" />
            <circle
              cx="100"
              cy="100"
              r="82"
              stroke="currentColor"
              strokeWidth="0.5"
              fill="none"
              strokeDasharray="15 3 3 3"
            />
            <path
              d="M 80 40 A 60 60 0 0 0 80 160 A 50 50 0 0 1 80 40"
              stroke="currentColor"
              strokeWidth="1.25"
              fill="none"
            />
            <path
              d="M 120 40 A 60 60 0 0 1 120 160 A 50 50 0 0 0 120 40"
              stroke="currentColor"
              strokeWidth="1.25"
              fill="none"
            />
            <circle cx="100" cy="100" r="40" stroke="currentColor" strokeWidth="0.75" fill="none" />
            <circle
              cx="100"
              cy="100"
              r="20"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
              strokeDasharray="2 4"
            />
            <polygon
              points="100,60 110,80 130,80 115,95 120,115 100,105 80,115 85,95 70,80 90,80"
              stroke="currentColor"
              strokeWidth="0.75"
              fill="none"
            />
          </>
        );
      case "necromancy":
        return (
          <>
            <circle cx="100" cy="100" r="90" stroke="currentColor" strokeWidth="1.25" fill="none" />
            <circle
              cx="100"
              cy="100"
              r="75"
              stroke="currentColor"
              strokeWidth="0.5"
              fill="none"
              strokeDasharray="1 5"
            />
            <polygon
              points="100,25 165,138 35,138"
              stroke="currentColor"
              strokeWidth="1"
              fill="none"
            />
            <polygon
              points="100,175 35,62 165,62"
              stroke="currentColor"
              strokeWidth="1"
              fill="none"
            />
            <circle cx="100" cy="25" r="4" fill="currentColor" />
            <circle cx="165" cy="138" r="4" fill="currentColor" />
            <circle cx="35" cy="138" r="4" fill="currentColor" />
            <circle cx="100" cy="175" r="4" fill="currentColor" />
            <circle cx="35" cy="62" r="4" fill="currentColor" />
            <circle cx="165" cy="62" r="4" fill="currentColor" />
            <path
              d="M 100 55 L 135 120 L 65 120 Z"
              stroke="currentColor"
              strokeWidth="0.75"
              fill="none"
            />
            <circle cx="100" cy="100" r="15" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </>
        );
      case "transmutation":
        return (
          <>
            <circle cx="100" cy="100" r="90" stroke="currentColor" strokeWidth="1" fill="none" />
            <circle cx="100" cy="100" r="78" stroke="currentColor" strokeWidth="0.5" fill="none" />
            {Array.from({ length: 12 }).map((_, i) => (
              <path
                key={i}
                d="M 95 10 L 105 10 L 103 22 L 97 22 Z"
                stroke="currentColor"
                strokeWidth="1"
                fill="none"
                transform={`rotate(${i * 30} 100 100)`}
              />
            ))}
            <circle cx="100" cy="100" r="60" stroke="currentColor" strokeWidth="0.75" fill="none" />
            <path
              d="M 75 100 C 75 85, 90 85, 100 100 C 110 115, 125 115, 125 100 C 125 85, 110 85, 100 100 C 90 115, 75 115, 75 100 Z"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
            />
            <circle cx="100" cy="100" r="10" stroke="currentColor" strokeWidth="0.5" fill="none" />
          </>
        );
      case "conjuration":
      default:
        return (
          <>
            <circle cx="100" cy="100" r="90" stroke="currentColor" strokeWidth="1" fill="none" />
            <circle
              cx="100"
              cy="100"
              r="85"
              stroke="currentColor"
              strokeWidth="0.5"
              fill="none"
              strokeDasharray="4 4"
            />
            <circle cx="100" cy="100" r="70" stroke="currentColor" strokeWidth="0.75" fill="none" />
            <polygon
              points="100,20 120,80 180,100 120,120 100,180 80,120 20,100 80,80"
              stroke="currentColor"
              strokeWidth="1.25"
              fill="none"
            />
            <polygon
              points="100,20 120,80 180,100 120,120 100,180 80,120 20,100 80,80"
              stroke="currentColor"
              strokeWidth="0.5"
              fill="none"
              transform="rotate(45 100 100)"
            />
            <circle cx="100" cy="100" r="30" stroke="currentColor" strokeWidth="1" fill="none" />
            <circle
              cx="100"
              cy="100"
              r="15"
              stroke="currentColor"
              strokeWidth="0.5"
              fill="none"
              strokeDasharray="1 1"
            />
          </>
        );
    }
  };

  const theme = getSchoolTheme(school);

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden select-none opacity-[0.05] dark:opacity-[0.07] z-0">
      <svg
        width="380"
        height="380"
        viewBox="0 0 200 200"
        className={`w-[380px] h-[380px] ${theme.text} animate-[spin_60s_linear_infinite]`}
      >
        {renderGeometry()}
      </svg>
    </div>
  );
}
