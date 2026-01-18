"use client";

import { ArrowLeft02Icon, Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { GSuiteProtected } from "@/components/gsuite/protected-route";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useGroup } from "@/hooks/use-groups";
import { useMembers } from "@/hooks/use-members";
import type { GroupMember } from "@/types/gsuite";
import { getErrorMessage } from "@/utils/error";

export default function GSuiteGroupDetailsPage() {
  const params = useParams();
  const groupId = (params?.groupId as string) || "";
  const { data: group, isLoading: isGroupLoading } = useGroup(groupId);
  const {
    data: members,
    isLoading: isMembersLoading,
    addMember,
    removeMember,
    updateMember,
  } = useMembers(groupId);

  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<
    "MEMBER" | "MANAGER" | "OWNER"
  >("MEMBER");
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<GroupMember | null>(
    null,
  );
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);

  const handleAddMember = async () => {
    if (!newMemberEmail) return;
    try {
      await addMember.mutateAsync({
        email: newMemberEmail,
        role: newMemberRole,
      });
      setNewMemberEmail("");
      setNewMemberRole("MEMBER");
      setMemberDialogOpen(false);
      toast.success("Member added successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add member",
      );
    }
  };

  const handleUpdateMemberRole = async (
    memberEmail: string,
    newRole: "MEMBER" | "MANAGER" | "OWNER",
  ) => {
    try {
      await updateMember.mutateAsync({ memberEmail, role: newRole });
      toast.success("Member role updated");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to update role"));
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    try {
      await removeMember.mutateAsync(memberToRemove.email);
      toast.success("Member removed successfully");
      setRemoveDialogOpen(false);
      setMemberToRemove(null);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to remove member"));
    }
  };

  if (isGroupLoading) {
    return (
      <GSuiteProtected>
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="grid gap-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </GSuiteProtected>
    );
  }

  if (!group) {
    return (
      <GSuiteProtected>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Group not found</p>
          <Button variant="link" asChild>
            <Link href="/gsuite">Back to Groups</Link>
          </Button>
        </div>
      </GSuiteProtected>
    );
  }

  return (
    <GSuiteProtected>
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/gsuite" aria-label="Back to groups">
                <HugeiconsIcon icon={ArrowLeft02Icon} className="h-4 w-4" />
              </Link>
            </Button>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary text-lg font-medium">
              {group.name?.[0]?.toUpperCase() || "G"}
            </div>
            <div className="grid gap-1">
              <h1 className="text-2xl font-bold">{group.name}</h1>
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                {group.email}
              </div>
            </div>
          </div>
        </div>

        {group.description && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {group.description}
              </p>
            </CardContent>
          </Card>
        )}

        {group.aliases?.length || group.nonEditableAliases?.length ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Email Aliases</CardTitle>
              <CardDescription>
                Alternative email addresses for this group
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {group.aliases?.map((alias) => (
                  <Badge key={alias} variant="secondary">
                    {alias}
                  </Badge>
                ))}
                {group.nonEditableAliases?.map((alias) => (
                  <Badge key={alias} variant="outline">
                    {alias}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="grid gap-1">
                <CardTitle>Members</CardTitle>
                <CardDescription>
                  {members?.length || 0} member(s) in this group
                </CardDescription>
              </div>
              <Dialog
                open={memberDialogOpen}
                onOpenChange={setMemberDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button>Add Member</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Member</DialogTitle>
                    <DialogDescription>
                      Add a new member to {group.name}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="memberEmail">Email Address</Label>
                      <Input
                        id="memberEmail"
                        placeholder="user@domain.com"
                        value={newMemberEmail}
                        onChange={(e) => setNewMemberEmail(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="memberRole">Role</Label>
                      <Select
                        value={newMemberRole}
                        onValueChange={(v) =>
                          setNewMemberRole(v as "MEMBER" | "MANAGER" | "OWNER")
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MEMBER">Member</SelectItem>
                          <SelectItem value="MANAGER">Manager</SelectItem>
                          <SelectItem value="OWNER">Owner</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setMemberDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddMember}
                      disabled={addMember.isPending}
                    >
                      {addMember.isPending && (
                        <HugeiconsIcon
                          icon={Loading03Icon}
                          className="mr-2 h-4 w-4 animate-spin"
                        />
                      )}
                      Add
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isMembersLoading ? (
                    ["one", "two", "three"].map((key) => (
                      <TableRow key={key}>
                        <TableCell>
                          <Skeleton className="h-4 w-48" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-20" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-16" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-8 w-20" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : members?.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-muted-foreground py-8"
                      >
                        No members in this group
                      </TableCell>
                    </TableRow>
                  ) : (
                    members?.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">
                          {member.email}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={member.role}
                            onValueChange={(v) =>
                              handleUpdateMemberRole(
                                member.email,
                                v as "OWNER" | "MANAGER" | "MEMBER",
                              )
                            }
                          >
                            <SelectTrigger className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MEMBER">Member</SelectItem>
                              <SelectItem value="MANAGER">Manager</SelectItem>
                              <SelectItem value="OWNER">Owner</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{member.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              setMemberToRemove(member);
                              setRemoveDialogOpen(true);
                            }}
                          >
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Member</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove{" "}
                <strong>{memberToRemove?.email}</strong> from this group?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRemoveMember}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {removeMember.isPending && (
                  <HugeiconsIcon
                    icon={Loading03Icon}
                    className="mr-2 h-4 w-4 animate-spin"
                  />
                )}
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </GSuiteProtected>
  );
}
