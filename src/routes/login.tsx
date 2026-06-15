import { createFileRoute, useRouter, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldAlert, Lock, ArrowRight, Dices, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Campaign Login — Mother of Bob" },
      { name: "description", content: "Authenticate to view the campaign dashboard." },
    ],
  }),
  loader: async () => {
    const { checkAuthFn } = await import("@/lib/auth-fns");
    const { authenticated } = await checkAuthFn();
    if (authenticated) {
      throw redirect({
        to: "/",
      });
    }
  },
  component: LoginComponent,
});

function LoginComponent() {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [showPasscode, setShowPasscode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { loginFn } = await import("@/lib/auth-fns");
      await loginFn({ data: { passcode } });
      // Invalidate all query data and redirect to dashboard
      await router.invalidate();
      window.location.href = "/";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Incorrect passcode. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(168,85,247,0.08),transparent_50%)]" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/5 rounded-full blur-[100px] animate-pulse" />
      <div
        className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/5 rounded-full blur-[100px] animate-pulse"
        style={{ animationDelay: "2s" }}
      />

      <div className="relative w-full max-w-md bg-card/65 backdrop-blur-md border border-border/60 rounded-2xl p-8 shadow-2xl relative z-10 animate-fade-in border-t-purple-500/30">
        <header className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4 relative">
            <div className="absolute inset-0 bg-purple-500/20 rounded-2xl blur-md scale-95" />
            <img
              src="/merged-logo.png?v=2"
              alt="Mother of Bob Logo"
              className="w-16 h-16 object-contain relative z-10 animate-fade-in hover:scale-105 transition-transform duration-300"
            />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground font-display bg-gradient-to-r from-foreground via-foreground to-purple-400 bg-clip-text text-transparent">
            Mother of Bob
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Enter the campaign passcode to access party statistics.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="passcode"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Campaign Passcode
            </label>
            <div className="relative">
              <input
                id="passcode"
                type={showPasscode ? "text" : "password"}
                required
                disabled={loading}
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-4 pr-20 py-3 bg-secondary/40 border border-border/80 focus:border-purple-500/70 focus:ring-1 focus:ring-purple-500/40 rounded-xl outline-none transition-all placeholder:text-muted-foreground/40 text-foreground"
              />
              <button
                type="button"
                onClick={() => setShowPasscode((prev) => !prev)}
                disabled={loading || !passcode}
                className="absolute right-10 top-2.5 p-1 text-muted-foreground hover:text-foreground disabled:text-muted-foreground/20 transition-colors cursor-pointer"
                title={showPasscode ? "Hide passcode" : "Show passcode"}
              >
                {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button
                type="submit"
                disabled={loading || !passcode}
                className="absolute right-2 top-2 p-1.5 bg-purple-500 hover:bg-purple-600 active:bg-purple-700 disabled:bg-muted/40 disabled:text-muted-foreground text-white rounded-lg transition-all shadow-[0_4px_10px_rgba(168,85,247,0.2)] disabled:shadow-none"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-3 p-3.5 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl animate-shake">
              <ShieldAlert className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2 text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
            <Dices className="w-3.5 h-3.5" />
            <span>Roll for initiative to enter the lobby.</span>
          </div>
        </form>
      </div>
    </main>
  );
}
