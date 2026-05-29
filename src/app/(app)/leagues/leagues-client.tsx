"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { createLeague, joinLeague } from "../actions";
import { Plus, LogIn, Trophy, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";

interface League {
  id: string;
  name: string;
  inviteCode: string;
  ownerId: string;
  status: string | null;
}

export function LeaguesClient({ leagues }: { leagues: League[] }) {
  const t = useTranslations("Leagues");
  const router = useRouter();
  const [newLeagueName, setNewLeagueName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  const handleCreate = async () => {
    if (!newLeagueName.trim()) return;
    setCreating(true);
    try {
      await createLeague(newLeagueName.trim());
      toast.success(t("leagueCreated"));
      setNewLeagueName("");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("failedCreate")
      );
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) return;
    setJoining(true);
    try {
      await joinLeague(inviteCode.trim());
      toast.success(t("leagueJoined"));
      setInviteCode("");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("failedJoin")
      );
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("createLeague")}</CardTitle>
            <CardDescription>{t("createDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="league-name">{t("leagueName")}</Label>
              <Input
                id="league-name"
                value={newLeagueName}
                onChange={(e) => setNewLeagueName(e.target.value)}
                placeholder={t("leagueNamePlaceholder")}
              />
            </div>
            <Button onClick={handleCreate} disabled={creating || !newLeagueName.trim()} className="gap-2">
              <Plus className="h-4 w-4" />
              {creating ? t("creating") : t("createBtn")}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("joinLeague")}</CardTitle>
            <CardDescription>{t("joinDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="invite-code">{t("inviteCode")}</Label>
              <Input
                id="invite-code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder={t("inviteCodePlaceholder")}
              />
            </div>
            <Button onClick={handleJoin} disabled={joining || !inviteCode.trim()} className="gap-2">
              <LogIn className="h-4 w-4" />
              {joining ? t("joining") : t("joinBtn")}
            </Button>
          </CardContent>
        </Card>
      </div>

      {leagues.length > 0 && (
        <div>
          <h2 className="mb-3 text-xl font-semibold">{t("yourLeagues")}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {leagues.map((league) => (
              <Link key={league.id} href={`/leagues/${league.id}`} className="group">
                <Card className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <span className="bg-brand-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-brand-foreground shadow-sm">
                        <Trophy className="h-5 w-5" />
                      </span>
                      <CardTitle className="flex-1 truncate text-lg">
                        {league.name}
                      </CardTitle>
                      <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {t("code")}
                      </span>
                      <Badge variant="outline" className="font-mono">
                        {league.inviteCode}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
