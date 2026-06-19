import { Dumbbell, Zap, Heart, BookOpen, Compass, Crown } from "lucide-react";

export const ABILITY_DETAILS: Record<
  string,
  {
    Icon: React.ComponentType<{ size?: number; className?: string }>;
    colorClass: string;
    borderClass: string;
    bgClass: string;
    glowClass: string;
    hoverGlowClass: string;
  }
> = {
  STR: {
    Icon: Dumbbell,
    colorClass: "text-stat-str",
    borderClass: "border-stat-str/20",
    bgClass: "bg-stat-str/5",
    glowClass: "shadow-stat-str/5",
    hoverGlowClass: "hover:shadow-stat-str/15 hover:border-stat-str/40 hover:bg-stat-str/10",
  },
  DEX: {
    Icon: Zap,
    colorClass: "text-stat-dex",
    borderClass: "border-stat-dex/20",
    bgClass: "bg-stat-dex/5",
    glowClass: "shadow-stat-dex/5",
    hoverGlowClass: "hover:shadow-stat-dex/15 hover:border-stat-dex/40 hover:bg-stat-dex/10",
  },
  CON: {
    Icon: Heart,
    colorClass: "text-stat-con",
    borderClass: "border-stat-con/20",
    bgClass: "bg-stat-con/5",
    glowClass: "shadow-stat-con/5",
    hoverGlowClass: "hover:shadow-stat-con/15 hover:border-stat-con/40 hover:bg-stat-con/10",
  },
  INT: {
    Icon: BookOpen,
    colorClass: "text-stat-int",
    borderClass: "border-stat-int/20",
    bgClass: "bg-stat-int/5",
    glowClass: "shadow-stat-int/5",
    hoverGlowClass: "hover:shadow-stat-int/15 hover:border-stat-int/40 hover:bg-stat-int/10",
  },
  WIS: {
    Icon: Compass,
    colorClass: "text-stat-wis",
    borderClass: "border-stat-wis/20",
    bgClass: "bg-stat-wis/5",
    glowClass: "shadow-stat-wis/5",
    hoverGlowClass: "hover:shadow-stat-wis/15 hover:border-stat-wis/40 hover:bg-stat-wis/10",
  },
  CHA: {
    Icon: Crown,
    colorClass: "text-stat-cha",
    borderClass: "border-stat-cha/20",
    bgClass: "bg-stat-cha/5",
    glowClass: "shadow-stat-cha/5",
    hoverGlowClass: "hover:shadow-stat-cha/15 hover:border-stat-cha/40 hover:bg-stat-cha/10",
  },
};
