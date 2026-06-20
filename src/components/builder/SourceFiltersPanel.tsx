import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ForgeSourcePolicy, ForgeContentToggles } from "../../lib/forge/source-policy";
import { BookOpen } from "lucide-react";

interface SourceFiltersPanelProps {
  policy: ForgeSourcePolicy;
  toggles: ForgeContentToggles;
  onChangePolicy: (policy: ForgeSourcePolicy) => void;
  onChangeToggles: (toggles: ForgeContentToggles) => void;
}

export function SourceFiltersPanel({
  policy,
  toggles,
  onChangePolicy,
  onChangeToggles,
}: SourceFiltersPanelProps) {
  const toggleTier = (tier: string) => {
    const isEnabled = policy.allowedTiers.includes(tier);
    onChangePolicy({
      ...policy,
      allowedTiers: isEnabled
        ? policy.allowedTiers.filter((t) => t !== tier)
        : [...policy.allowedTiers, tier],
    });
  };

  return (
    <Card className="bg-secondary/10 border-border/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          Source Materials
        </CardTitle>
        <CardDescription>
          Configure which books and content rules are allowed for this character.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground border-b border-border/20 pb-2">
            Official Books
          </h4>

          <div className="flex items-center justify-between">
            <Label htmlFor="tier-core" className="flex flex-col gap-1 cursor-pointer">
              <span>Core Rulebooks</span>
              <span className="text-xs text-muted-foreground font-normal">
                Player's Handbook, Monster Manual, Dungeon Master's Guide
              </span>
            </Label>
            <Switch
              id="tier-core"
              checked={policy.allowedTiers.includes("core")}
              onCheckedChange={() => toggleTier("core")}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="tier-supplements" className="flex flex-col gap-1 cursor-pointer">
              <span>Supplements</span>
              <span className="text-xs text-muted-foreground font-normal">
                Xanathar's, Tasha's, Monsters of the Multiverse, etc.
              </span>
            </Label>
            <Switch
              id="tier-supplements"
              checked={policy.allowedTiers.includes("supplements")}
              onCheckedChange={() => toggleTier("supplements")}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="tier-settings" className="flex flex-col gap-1 cursor-pointer">
              <span>Setting Books</span>
              <span className="text-xs text-muted-foreground font-normal">
                Eberron, Ravnica, Spelljammer, Ravenloft, etc.
              </span>
            </Label>
            <Switch
              id="tier-settings"
              checked={policy.allowedTiers.includes("settings")}
              onCheckedChange={() => toggleTier("settings")}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground border-b border-border/20 pb-2">
            Additional Content
          </h4>

          <div className="flex items-center justify-between">
            <Label htmlFor="allow-partner" className="flex flex-col gap-1 cursor-pointer">
              <span>Partner Content</span>
              <span className="text-xs text-muted-foreground font-normal">
                Critical Role (Tal'Dorei), Grim Hollow, etc.
              </span>
            </Label>
            <Switch
              id="allow-partner"
              checked={policy.allowPartner}
              onCheckedChange={(checked) => onChangePolicy({ ...policy, allowPartner: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="allow-prerelease" className="flex flex-col gap-1 cursor-pointer">
              <span>Unearthed Arcana</span>
              <span className="text-xs text-muted-foreground font-normal">
                Playtest and preview materials
              </span>
            </Label>
            <Switch
              id="allow-prerelease"
              checked={policy.allowPrerelease}
              onCheckedChange={(checked) => onChangePolicy({ ...policy, allowPrerelease: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="allow-homebrew" className="flex flex-col gap-1 cursor-pointer">
              <span>Homebrew Excluded</span>
              <span className="text-xs text-muted-foreground font-normal">
                Community and custom homebrew content is always blocked.
              </span>
            </Label>
            <Switch id="allow-homebrew" checked={false} disabled />
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground border-b border-border/20 pb-2">
            Rules Preferences
          </h4>

          <div className="flex items-center justify-between">
            <Label htmlFor="prefer-2024" className="flex flex-col gap-1 cursor-pointer">
              <span>Prefer 2024 Rules</span>
              <span className="text-xs text-muted-foreground font-normal">
                Default to 2024 updated versions when available
              </span>
            </Label>
            <Switch
              id="prefer-2024"
              checked={toggles.prefer2024Rules}
              onCheckedChange={(checked) =>
                onChangeToggles({ ...toggles, prefer2024Rules: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="allow-legacy" className="flex flex-col gap-1 cursor-pointer">
              <span>Show Legacy Versions</span>
              <span className="text-xs text-muted-foreground font-normal">
                Display old versions alongside 2024 updates
              </span>
            </Label>
            <Switch
              id="allow-legacy"
              checked={toggles.allowLegacyContent}
              onCheckedChange={(checked) =>
                onChangeToggles({ ...toggles, allowLegacyContent: checked })
              }
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
