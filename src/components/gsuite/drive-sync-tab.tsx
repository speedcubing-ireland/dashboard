import {
  AlertCircleIcon,
  CheckmarkCircle01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ChangesTable,
  ConfigRow,
  ResultStat,
  StatsCard,
  StepIndicator,
} from "@/components/gsuite/shared";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAllSharedDrives } from "@/services/gsuite/drive";
import {
  calculateUserChangesFromGroups,
  type DriveGroupsPreview,
  type DriveSyncPreview,
  executeDriveSync,
  generateDriveGroupsPreview,
  previewRemoveAllIndividualPermissions,
  removeAllIndividualPermissions,
} from "@/services/gsuite/drive-sync-service";
import { useGSuiteAuthStore } from "@/stores/gsuite-auth";
import { getErrorMessage } from "@/utils/error";

type SyncStep = "configure" | "preview" | "confirm" | "result";
const STEPS: SyncStep[] = ["configure", "preview", "confirm", "result"];

interface DriveSelection {
  driveId: string;
  selectedDriveId: string;
  syncAllDrives: boolean;
  availableDrives: Array<{ id: string; name: string }>;
  isLoadingDrives: boolean;
}

interface PreviewState {
  groupsPreview: DriveGroupsPreview | null;
  calculatedPreview: DriveSyncPreview | null;
  isLoading: boolean;
  isCalculatingPreview: boolean;
}

interface ResetState {
  resetPreview: DriveSyncPreview | null;
  isLoadingResetPreview: boolean;
  isResettingPermissions: boolean;
}

interface SyncState {
  isSyncing: boolean;
  result: {
    success: boolean;
    added: number;
    removed: number;
    updated: number;
    errors: string[];
  } | null;
  syncOpts: { additions: boolean; removals: boolean; updates: boolean };
}

export function DriveSyncTab() {
  const { accessToken } = useGSuiteAuthStore();
  const [step, setStep] = useState<SyncStep>("configure");

  const [driveSelection, setDriveSelection] = useState<DriveSelection>({
    driveId: "",
    selectedDriveId: "",
    syncAllDrives: false,
    availableDrives: [],
    isLoadingDrives: false,
  });

  const [previewState, setPreviewState] = useState<PreviewState>({
    groupsPreview: null,
    calculatedPreview: null,
    isLoading: false,
    isCalculatingPreview: false,
  });

  const [resetState, setResetState] = useState<ResetState>({
    resetPreview: null,
    isLoadingResetPreview: false,
    isResettingPermissions: false,
  });

  const [syncState, setSyncState] = useState<SyncState>({
    isSyncing: false,
    result: null,
    syncOpts: { additions: true, removals: false, updates: true },
  });

  const loadDrives = useCallback(async () => {
    if (!accessToken) return;
    setDriveSelection((s) => ({ ...s, isLoadingDrives: true }));
    try {
      const drives = await getAllSharedDrives(accessToken);
      setDriveSelection((s) => ({
        ...s,
        availableDrives: drives.map((d) => ({ id: d.id, name: d.name })),
        isLoadingDrives: false,
      }));
    } catch (e) {
      toast.error(getErrorMessage(e, "Failed to load shared drives"));
      setDriveSelection((s) => ({ ...s, isLoadingDrives: false }));
    }
  }, [accessToken]);

  useEffect(() => {
    if (
      accessToken &&
      step === "configure" &&
      driveSelection.availableDrives.length === 0
    ) {
      loadDrives();
    }
  }, [accessToken, step, driveSelection.availableDrives.length, loadDrives]);

  const loadPreview = useCallback(async () => {
    if (
      !accessToken ||
      (!driveSelection.syncAllDrives && !driveSelection.selectedDriveId)
    )
      return;

    setPreviewState((s) => ({ ...s, isLoading: true }));
    try {
      const driveIds = driveSelection.syncAllDrives
        ? (await getAllSharedDrives(accessToken)).map((d) => d.id)
        : [driveSelection.selectedDriveId];

      const groupsPreviewData = await generateDriveGroupsPreview(
        accessToken,
        driveIds,
      );
      setPreviewState((s) => ({
        ...s,
        groupsPreview: groupsPreviewData,
        isCalculatingPreview: true,
      }));

      const calculated = await calculateUserChangesFromGroups(
        groupsPreviewData,
        accessToken,
      );
      setPreviewState((s) => ({ ...s, calculatedPreview: calculated }));

      if (driveSelection.syncAllDrives) {
        setSyncState((s) => ({
          ...s,
          syncOpts: { ...s.syncOpts, removals: true },
        }));
      }

      setStep("preview");
      toast.success(
        `Preview generated for ${driveSelection.syncAllDrives ? "all drives" : "selected drive"}`,
      );
    } catch (e) {
      toast.error(getErrorMessage(e, "Failed to load preview"));
    } finally {
      setPreviewState((s) => ({
        ...s,
        isLoading: false,
        isCalculatingPreview: false,
      }));
    }
  }, [
    accessToken,
    driveSelection.syncAllDrives,
    driveSelection.selectedDriveId,
  ]);

  const runSync = useCallback(async () => {
    if (!accessToken || !previewState.groupsPreview) return;
    setSyncState((s) => ({ ...s, isSyncing: true }));
    try {
      const res = await executeDriveSync(
        accessToken,
        previewState.groupsPreview,
        syncState.syncOpts,
      );
      setSyncState((s) => ({ ...s, result: res, isSyncing: false }));
      setStep("result");
      toast[res.success ? "success" : "warning"](
        res.success ? "Sync completed" : "Sync completed with errors",
      );
    } catch (e) {
      toast.error(getErrorMessage(e, "Sync failed"));
      setSyncState((s) => ({ ...s, isSyncing: false }));
    }
  }, [accessToken, previewState.groupsPreview, syncState.syncOpts]);

  const reset = useCallback(() => {
    setStep("configure");
    setPreviewState({
      groupsPreview: null,
      calculatedPreview: null,
      isLoading: false,
      isCalculatingPreview: false,
    });
    setResetState({
      resetPreview: null,
      isLoadingResetPreview: false,
      isResettingPermissions: false,
    });
    setSyncState({
      isSyncing: false,
      result: null,
      syncOpts: { additions: true, removals: false, updates: true },
    });
    setDriveSelection((s) => ({
      ...s,
      selectedDriveId: "",
      driveId: "",
      syncAllDrives: false,
    }));
  }, []);

  const loadResetPreview = useCallback(async () => {
    if (!accessToken || !previewState.groupsPreview) return;

    setResetState((s) => ({ ...s, isLoadingResetPreview: true }));
    try {
      const driveIds = previewState.groupsPreview.drives.map((d) => d.id);
      const preview = await previewRemoveAllIndividualPermissions(
        accessToken,
        driveIds,
      );
      setResetState((s) => ({
        ...s,
        resetPreview: preview,
        isLoadingResetPreview: false,
      }));
    } catch (e) {
      toast.error(getErrorMessage(e, "Failed to load reset preview"));
      setResetState((s) => ({ ...s, isLoadingResetPreview: false }));
    }
  }, [accessToken, previewState.groupsPreview]);

  const handleResetToGroupsOnly = useCallback(async () => {
    if (!accessToken || !previewState.groupsPreview) return;

    setResetState((s) => ({ ...s, isResettingPermissions: true }));
    try {
      const driveIds = previewState.groupsPreview.drives.map((d) => d.id);
      const result = await removeAllIndividualPermissions(
        accessToken,
        driveIds,
      );

      const message = result.success
        ? `Removed ${result.removed} individual permission${result.removed !== 1 ? "s" : ""}. Only group permissions remain.`
        : `Reset completed with ${result.errors.length} error${result.errors.length !== 1 ? "s" : ""}. ${result.removed} permission${result.removed !== 1 ? "s" : ""} removed.`;

      toast[result.success ? "success" : "warning"](message);
      await loadPreview();
      setResetState((s) => ({
        ...s,
        resetPreview: null,
        isResettingPermissions: false,
      }));
    } catch (e) {
      toast.error(getErrorMessage(e, "Failed to reset permissions"));
      setResetState((s) => ({ ...s, isResettingPermissions: false }));
    }
  }, [accessToken, previewState.groupsPreview, loadPreview]);

  const { additions, removals, updates, hasChanges } = useMemo(() => {
    const changes = previewState.calculatedPreview?.changes || [];
    return {
      additions: changes.filter((c) => c.action === "add"),
      removals: changes.filter((c) => c.action === "remove"),
      updates: changes.filter((c) => c.action === "update"),
      hasChanges: changes.filter((c) => c.enabled).length,
    };
  }, [previewState.calculatedPreview]);

  return (
    <div className="flex flex-col gap-6">
      <StepIndicator steps={STEPS} currentStep={step} />

      {step === "configure" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Drive Configuration</CardTitle>
              <CardDescription>
                Select a shared drive to sync permissions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Sync Scope</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sync-all"
                    checked={driveSelection.syncAllDrives}
                    onCheckedChange={(checked) => {
                      setDriveSelection((s) => ({
                        ...s,
                        syncAllDrives: checked === true,
                        selectedDriveId: checked ? "" : s.selectedDriveId,
                        driveId: checked ? "" : s.driveId,
                      }));
                    }}
                  />
                  <Label
                    htmlFor="sync-all"
                    className="font-normal cursor-pointer"
                  >
                    Sync all shared drives
                  </Label>
                </div>
              </div>
              {!driveSelection.syncAllDrives && (
                <>
                  <div className="space-y-2">
                    <Label>Shared Drive</Label>
                    <div className="flex gap-2">
                      <Select
                        value={driveSelection.selectedDriveId}
                        onValueChange={(value) =>
                          setDriveSelection((s) => ({
                            ...s,
                            selectedDriveId: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a drive..." />
                        </SelectTrigger>
                        <SelectContent>
                          {driveSelection.availableDrives.map((drive) => (
                            <SelectItem key={drive.id} value={drive.id}>
                              {drive.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        onClick={loadDrives}
                        disabled={driveSelection.isLoadingDrives}
                      >
                        {driveSelection.isLoadingDrives && (
                          <Spinner className="mr-2 h-4 w-4" />
                        )}
                        Refresh
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Or enter Drive ID</Label>
                    <Input
                      placeholder="0AAIDQ5C63gWbUk9PVA"
                      value={driveSelection.driveId}
                      onChange={(e) => {
                        const value = e.target.value;
                        setDriveSelection((s) => ({
                          ...s,
                          driveId: value,
                          selectedDriveId: value,
                        }));
                      }}
                    />
                  </div>
                </>
              )}
              {driveSelection.syncAllDrives && (
                <Alert>
                  <AlertDescription>
                    This will sync permissions for all shared drives. Users not
                    in any group will be removed (except
                    laptop@speedcubingireland.com).
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter>
              <Button
                onClick={loadPreview}
                disabled={
                  (!driveSelection.syncAllDrives &&
                    !driveSelection.selectedDriveId) ||
                  previewState.isLoading
                }
                className="w-full"
              >
                {previewState.isLoading && <Spinner className="mr-2 h-4 w-4" />}
                Load & Preview
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How It Works</CardTitle>
              <CardDescription>Drive permissions sync process</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="process">
                  <AccordionTrigger>Sync Process</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    <p className="mb-2">
                      The preview step shows all drives and their group
                      permissions. You can edit groups directly:
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>
                        <strong>Automatic calculation:</strong> User-level
                        changes are calculated automatically based on groups
                      </li>
                      <li>
                        <strong>Permission levels:</strong> Users get the
                        highest permission level from all their groups
                      </li>
                      <li>
                        <strong>Removals:</strong> Users not in any group will
                        be removed (except laptop@speedcubingireland.com)
                      </li>
                      <li>
                        <strong>Reset to Groups Only:</strong> Remove all
                        individual user permissions, leaving only group
                        permissions
                      </li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="roles">
                  <AccordionTrigger>Permission Levels</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    <p>Permission hierarchy (highest to lowest):</p>
                    <ul className="list-disc list-inside space-y-1 mt-2">
                      <li>Organizer (Manager)</li>
                      <li>File Organizer</li>
                      <li>Writer</li>
                      <li>Commenter</li>
                      <li>Reader</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </div>
      )}

      {step === "preview" && previewState.groupsPreview && (
        <div className="flex flex-col gap-6">
          <PreviewSummary
            preview={previewState.calculatedPreview}
            groupsPreview={previewState.groupsPreview}
            isCalculating={previewState.isCalculatingPreview}
          />

          {previewState.groupsPreview.errors.length > 0 && (
            <Alert variant="destructive">
              <AlertTitle>Errors Found</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside">
                  {previewState.groupsPreview.errors.map((e, i) => (
                    <li key={`${i}-${e}`}>{e}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {previewState.calculatedPreview &&
            previewState.calculatedPreview.changes.length > 0 && (
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="user-changes">
                  <AccordionTrigger>
                    View Affected Users (
                    {previewState.calculatedPreview.changes.length})
                  </AccordionTrigger>
                  <AccordionContent>
                    <Tabs defaultValue="additions">
                      <TabsList>
                        <TabsTrigger value="additions">
                          Additions{" "}
                          <Badge variant="secondary" className="ml-2">
                            {additions.length}
                          </Badge>
                        </TabsTrigger>
                        <TabsTrigger value="removals">
                          Removals{" "}
                          <Badge variant="secondary" className="ml-2">
                            {removals.length}
                          </Badge>
                        </TabsTrigger>
                        <TabsTrigger value="updates">
                          Updates{" "}
                          <Badge variant="secondary" className="ml-2">
                            {updates.length}
                          </Badge>
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="additions">
                        <ChangesTable
                          changes={additions}
                          emptyMsg="No users to add"
                        />
                      </TabsContent>
                      <TabsContent value="removals">
                        <ChangesTable
                          changes={removals}
                          emptyMsg="No users to remove"
                        />
                      </TabsContent>
                      <TabsContent value="updates">
                        <ChangesTable
                          changes={updates}
                          emptyMsg="No role updates"
                        />
                      </TabsContent>
                    </Tabs>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}

          <div className="flex gap-4">
            <Button variant="outline" onClick={reset}>
              Back
            </Button>
            <Button
              onClick={() => setStep("confirm")}
              disabled={
                previewState.isCalculatingPreview ||
                !previewState.calculatedPreview ||
                !hasChanges
              }
            >
              Add Individuals
            </Button>
            <Button
              variant="outline"
              onClick={loadResetPreview}
              disabled={
                resetState.isResettingPermissions ||
                resetState.isLoadingResetPreview ||
                previewState.isCalculatingPreview
              }
            >
              {resetState.isLoadingResetPreview && (
                <Spinner className="mr-2 h-4 w-4" />
              )}
              Preview Reset
            </Button>
          </div>

          {resetState.resetPreview && (
            <Card>
              <CardHeader>
                <CardTitle>Reset to Groups Only</CardTitle>
                <CardDescription>
                  {resetState.resetPreview.changes.length} individual permission
                  {resetState.resetPreview.changes.length !== 1 ? "s" : ""}{" "}
                  would be removed
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertDescription>
                    This will remove all individual user permissions, leaving
                    only group permissions. Users will still have access through
                    their group memberships.
                  </AlertDescription>
                </Alert>
                {resetState.resetPreview.changes.length > 0 ? (
                  <ChangesTable
                    changes={resetState.resetPreview.changes}
                    emptyMsg="No individual permissions to remove"
                  />
                ) : (
                  <Alert>
                    <AlertDescription>
                      No individual user permissions found to remove. All users
                      already only have group-based permissions.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
              <CardFooter>
                <Button
                  variant="destructive"
                  onClick={handleResetToGroupsOnly}
                  disabled={
                    resetState.isResettingPermissions ||
                    resetState.resetPreview.changes.length === 0
                  }
                  className="w-full"
                >
                  {resetState.isResettingPermissions && (
                    <Spinner className="mr-2 h-4 w-4" />
                  )}
                  Reset to Groups Only ({resetState.resetPreview.changes.length}{" "}
                  permission
                  {resetState.resetPreview.changes.length !== 1 ? "s" : ""})
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      )}

      {step === "confirm" && (
        <div className="grid gap-6">
          <Alert>
            <AlertTitle>Review Changes</AlertTitle>
            <AlertDescription>Select operations to perform.</AlertDescription>
          </Alert>
          <Card>
            <CardContent className="grid gap-4 pt-6">
              <ConfigRow
                label="Add users"
                count={additions.filter((c) => c.enabled).length}
                checked={syncState.syncOpts.additions}
                onChange={(c) =>
                  setSyncState((s) => ({
                    ...s,
                    syncOpts: { ...s.syncOpts, additions: c },
                  }))
                }
              />
              <ConfigRow
                label="Update roles"
                count={updates.filter((c) => c.enabled).length}
                checked={syncState.syncOpts.updates}
                onChange={(c) =>
                  setSyncState((s) => ({
                    ...s,
                    syncOpts: { ...s.syncOpts, updates: c },
                  }))
                }
              />
              <ConfigRow
                label="Remove users"
                count={removals.filter((c) => c.enabled).length}
                checked={syncState.syncOpts.removals}
                onChange={(c) =>
                  setSyncState((s) => ({
                    ...s,
                    syncOpts: { ...s.syncOpts, removals: c },
                  }))
                }
                destructive
              />
            </CardContent>
            <CardFooter className="flex gap-4">
              <Button variant="outline" onClick={() => setStep("preview")}>
                Back
              </Button>
              <Button
                onClick={runSync}
                disabled={
                  syncState.isSyncing ||
                  (!syncState.syncOpts.additions &&
                    !syncState.syncOpts.removals &&
                    !syncState.syncOpts.updates) ||
                  !previewState.calculatedPreview ||
                  !hasChanges
                }
                variant={
                  syncState.syncOpts.removals ? "destructive" : "default"
                }
              >
                {syncState.isSyncing && <Spinner className="mr-2 h-4 w-4" />}
                Apply Changes
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {step === "result" && syncState.result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HugeiconsIcon
                icon={
                  syncState.result.success
                    ? CheckmarkCircle01Icon
                    : AlertCircleIcon
                }
                className={`h-5 w-5 ${syncState.result.success ? "text-green-500" : "text-yellow-500"}`}
              />
              Sync Complete
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <ResultStat
                label="Added"
                value={syncState.result.added}
                color="text-green-600"
              />
              <ResultStat
                label="Updated"
                value={syncState.result.updated}
                color="text-blue-600"
              />
              <ResultStat
                label="Removed"
                value={syncState.result.removed}
                color="text-red-600"
              />
            </div>
            {syncState.result.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTitle>
                  Errors ({syncState.result.errors.length})
                </AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside max-h-40 overflow-y-auto">
                    {syncState.result.errors.map((e, i) => (
                      <li key={`${i}-${e}`}>{e}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter>
            <Button onClick={reset} className="w-full">
              Start New Sync
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}

function PreviewSummary({
  preview,
  groupsPreview,
  isCalculating,
}: {
  preview: DriveSyncPreview | null;
  groupsPreview: DriveGroupsPreview;
  isCalculating: boolean;
}) {
  const additions = preview?.changes.filter((c) => c.action === "add") || [];
  const updates = preview?.changes.filter((c) => c.action === "update") || [];
  const removals = preview?.changes.filter((c) => c.action === "remove") || [];
  const totalGroups = groupsPreview.drives.reduce(
    (sum, d) => sum + d.groups.length,
    0,
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <StatsCard title="Drives" value={groupsPreview.drives.length} />
      <StatsCard title="Groups" value={totalGroups} />
      <StatsCard
        title="Additions"
        value={isCalculating ? 0 : additions.length}
      />
      <StatsCard title="Updates" value={isCalculating ? 0 : updates.length} />
      <StatsCard title="Removals" value={isCalculating ? 0 : removals.length} />
      {isCalculating && (
        <div className="col-span-5 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Spinner className="h-4 w-4" />
          Calculating user changes...
        </div>
      )}
    </div>
  );
}
