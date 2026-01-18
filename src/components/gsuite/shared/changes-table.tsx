import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ChangeWithAction = {
  action: "add" | "remove" | "update";
  currentRole?: string;
  newRole?: string;
};

type MembershipChangeRow = ChangeWithAction & {
  memberEmail: string;
  groupEmail: string;
  source?: string;
};

type DrivePermissionChangeRow = ChangeWithAction & {
  userEmail: string;
  driveName: string;
  driveId: string;
  sourceGroups: string[];
};

type ChangeRow = MembershipChangeRow | DrivePermissionChangeRow;

function isDrivePermissionChange(
  change: ChangeRow,
): change is DrivePermissionChangeRow {
  return "driveName" in change && "sourceGroups" in change;
}

export function ChangesTable({
  changes,
  emptyMsg,
}: {
  changes: ChangeRow[];
  emptyMsg: string;
}) {
  if (!changes.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {emptyMsg}
        </CardContent>
      </Card>
    );
  }

  const isDriveType = isDrivePermissionChange(changes[0]);

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            {isDriveType ? (
              <>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>User</TableHead>
                <TableHead>Drive</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Source Groups</TableHead>
              </>
            ) : (
              <>
                <TableHead>Member</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Source</TableHead>
              </>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {changes.map((change, i) => {
            const isDrive = isDrivePermissionChange(change);
            const email = isDrive ? change.userEmail : change.memberEmail;
            const key = isDrive ? `${change.driveId}-${email}-${i}` : i;

            return (
              <TableRow key={key}>
                {isDrive && <TableCell />}
                <TableCell className="font-medium">{email}</TableCell>
                {isDrive ? (
                  <>
                    <TableCell>{change.driveName}</TableCell>
                    <TableCell>
                      {change.action === "add" && change.newRole && (
                        <Badge className="bg-green-500/10 text-green-600">
                          {change.newRole}
                        </Badge>
                      )}
                      {change.action === "remove" && (
                        <Badge variant="secondary">{change.currentRole}</Badge>
                      )}
                      {change.action === "update" && change.newRole && (
                        <span className="flex gap-2">
                          <Badge variant="secondary">
                            {change.currentRole}
                          </Badge>
                          →
                          <Badge className="bg-blue-500/10 text-blue-600">
                            {change.newRole}
                          </Badge>
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {change.sourceGroups.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {change.sourceGroups.map((g: string) => (
                            <Badge
                              key={g}
                              variant="outline"
                              className="text-xs"
                            >
                              {g}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell>{change.groupEmail}</TableCell>
                    <TableCell>
                      {change.action === "add" && change.newRole && (
                        <Badge className="bg-green-500/10 text-green-600">
                          {change.newRole}
                        </Badge>
                      )}
                      {change.action === "remove" && (
                        <Badge variant="secondary">{change.currentRole}</Badge>
                      )}
                      {change.action === "update" && change.newRole && (
                        <span className="flex gap-2">
                          <Badge variant="secondary">
                            {change.currentRole}
                          </Badge>
                          →
                          <Badge className="bg-blue-500/10 text-blue-600">
                            {change.newRole}
                          </Badge>
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {change.source || "—"}
                    </TableCell>
                  </>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
