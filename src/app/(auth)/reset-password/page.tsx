"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Trophy } from "lucide-react";
import { useTranslations } from "next-intl";

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const t = useTranslations("ResetPassword");
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validSession, setValidSession] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setValidSession(!!data.user);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }
    toast.success(t("success"));
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <div className="bg-brand-gradient pointer-events-none absolute -top-24 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full opacity-20 blur-3xl" />
      <Card className="relative w-full max-w-md shadow-lg">
        <CardHeader className="items-center text-center">
          <span className="bg-brand-gradient mb-2 flex h-16 w-16 items-center justify-center rounded-2xl text-brand-foreground shadow-md">
            <Trophy className="h-8 w-8" />
          </span>
          <CardTitle className="font-heading text-3xl font-bold uppercase tracking-wide">
            {t("title")}
          </CardTitle>
          <CardDescription>{t("subtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {validSession === false ? (
            <div className="space-y-3 text-center">
              <p className="text-sm text-destructive">{t("invalidLink")}</p>
              <Button
                className="w-full"
                size="lg"
                onClick={() => router.push("/login")}
              >
                {t("backToLogin")}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="password">{t("newPassword")}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={loading || validSession === null}
              >
                {loading ? t("saving") : t("submit")}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
