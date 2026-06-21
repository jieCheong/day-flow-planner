import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { signIn, signUp, getUser } from "@/lib/auth";
import { syncFromApi } from "@/lib/dayflow/sync";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — DayFlow" },
      {
        name: "description",
        content: "Sign in or create an account to save your DayFlow plan.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getUser()) navigate({ to: "/" });
  }, [navigate]);

  const submit = async (e: SubmitEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await signUp(email, password);
        if (error) throw new Error(error);
        toast.success("Account created! You can now sign in.");
        setMode("signin");
      } else {
        const result = await signIn(email, password);
        if (result.error) throw new Error(result.error);
        await syncFromApi();
        toast.success("Welcome back!");
        navigate({ to: "/" });
      }
    } catch (err: unknown) {
      toast.error((err as Error).message ?? "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center p-4 bg-background">
      <div className="w-full max-w-sm bg-card rounded-2xl ring-1 ring-border p-6 space-y-5">
        <div className="text-center">
          <div className="size-11 rounded-xl bg-primary text-primary-foreground grid place-items-center font-bold text-lg mx-auto mb-3">
            D
          </div>
          <h1 className="text-xl font-semibold">
            {mode === "signin" ? "Sign in to DayFlow" : "Create your account"}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Save your plan, goals, and progress.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm outline-none focus:ring-2 focus:ring-ring/30"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Password (min 6 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm outline-none focus:ring-2 focus:ring-ring/30"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60"
          >
            {loading ? "…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="text-xs text-center text-muted-foreground">
          {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
          <button
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="text-primary font-medium hover:underline"
          >
            {mode === "signin" ? "Create one" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
