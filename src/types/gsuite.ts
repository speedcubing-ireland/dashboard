export interface GoogleUser {
  id: string;
  primaryEmail: string;
  name: {
    givenName: string;
    familyName: string;
    fullName: string;
  };
  isAdmin: boolean;
  isDelegatedAdmin: boolean;
  suspended: boolean;
  thumbnailPhotoUrl?: string;
  creationTime: string;
  lastLoginTime: string;
  orgUnitPath: string;
}

export interface Group {
  id: string;
  email: string;
  name: string;
  description: string;
  directMembersCount: string;
  adminCreated: boolean;
  aliases?: string[];
  nonEditableAliases?: string[];
  etag?: string;
}

export interface GroupMember {
  id: string;
  email: string;
  role: "OWNER" | "MANAGER" | "MEMBER";
  type: "USER" | "GROUP" | "CUSTOMER";
  status: string;
  delivery_settings?: "ALL_MAIL" | "DAILY" | "DIGEST" | "DISABLED" | "NONE";
}

export interface GroupListResponse {
  kind: string;
  etag: string;
  groups: Group[];
  nextPageToken?: string;
}

export interface MemberListResponse {
  kind: string;
  etag: string;
  members: GroupMember[];
  nextPageToken?: string;
}

export interface TeamConfig {
  teamName: string;
  shortName: string;
  leaderTitle: string;
  directorContact: string;
  groups: string[];
}

export interface RoleAssignment {
  person: string;
  email?: string;
  role: string;
  status: "Active" | "Inactive";
  startDate?: string;
  finishDate?: string;
}

export interface ComputedMembership {
  groupEmail: string;
  memberEmail: string;
  role: "OWNER" | "MANAGER" | "MEMBER";
  source: string;
}

export interface MembershipChange {
  groupEmail: string;
  memberEmail: string;
  action: "add" | "remove" | "update";
  currentRole?: "OWNER" | "MANAGER" | "MEMBER";
  newRole?: "OWNER" | "MANAGER" | "MEMBER";
  source?: string;
}

export interface SyncPreview {
  additions: MembershipChange[];
  removals: MembershipChange[];
  updates: MembershipChange[];
  unchanged: number;
  errors: string[];
}

export interface SyncResult {
  success: boolean;
  added: number;
  removed: number;
  updated: number;
  errors: string[];
}

export interface TextFormatRun {
  startIndex?: number;
  format?: {
    link?: {
      uri?: string;
    };
  };
}

export interface ChipRun {
  startIndex?: number;
  chip?: {
    personProperties?: {
      email?: string;
      displayFormat?: string;
    };
  };
}

export interface CellData {
  formattedValue?: string;
  hyperlink?: string;
  textFormatRuns?: TextFormatRun[];
  chipRuns?: ChipRun[];
  userEnteredValue?: {
    stringValue?: string;
    numberValue?: number;
    boolValue?: boolean;
    formulaValue?: string;
  };
}

export interface GridData {
  startRow?: number;
  startColumn?: number;
  rowData?: {
    values?: CellData[];
  }[];
}

export interface SheetWithData {
  properties: {
    sheetId: number;
    title: string;
    index: number;
  };
  data?: GridData[];
}

export interface SpreadsheetWithGridData {
  spreadsheetId: string;
  properties: {
    title: string;
  };
  sheets: SheetWithData[];
}
