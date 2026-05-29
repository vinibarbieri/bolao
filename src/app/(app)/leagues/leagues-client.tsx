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

interface League {
  id: string;
  name: string;
  inviteCode: string;
  ownerId: string;
  status: string | null;
}

export function LeaguesClient({ leagues }: { leagues: League[] }) {
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
      toast.success("League created!");
      setNewLeagueName("");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create league"
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
      toast.success("Joined league!");
      setInviteCode("");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to join league"
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
            <CardTitle>Create League</CardTitle>
            <CardDescription>
              Start a new league and invite friends
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="league-name">League Name</Label>
              <Input
                id="league-name"
                value={newLeagueName}
                onChange={(e) => setNewLeagueName(e.target.value)}
                placeholder="My World Cup League"
              />
            </div>
            <Button onClick={handleCreate} disabled={creating || !newLeagueName.trim()} className="gap-2">
              <Plus className="h-4 w-4" />
              {creating ? "Creating..." : "Create League"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Join League</CardTitle>
            <CardDescription>
              Enter an invite code from a friend
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="invite-code">Invite Code</Label>
              <Input
                id="invite-code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="abc12345"
              />
            </div>
            <Button onClick={handleJoin} disabled={joining || !inviteCode.trim()} className="gap-2">
              <LogIn className="h-4 w-4" />
              {joining ? "Joining..." : "Join League"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {leagues.length > 0 && (
        <div>
          <h2 className="mb-3 text-xl font-semibold">Your Leagues</h2>
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
                        Code:
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
