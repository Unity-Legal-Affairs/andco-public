export type WorkupChannel =
  | "web"
  | "email"
  | "fax"
  | "sms"
  | "voice"
  | "mail"
  | "portal"
  | "internal";

export type TimelineCategory =
  | "intake"
  | "liability"
  | "medical"
  | "insurance"
  | "client"
  | "workup";

export type EvidenceCategory =
  | "report"
  | "medical"
  | "billing"
  | "photo"
  | "insurance"
  | "correspondence"
  | "other";

export type EvidenceStatus = "needed" | "requested" | "received" | "analyzed";
export type ChecklistStatus = "missing" | "requested" | "received" | "reviewed";
export type WorkupStatus = "queued" | "active" | "blocked" | "review" | "done";

export interface FirmProfile {
  firmName: string;
  practiceRegion: string;
  intakeLead: string;
  defaultOwner: string;
  mockChannels: WorkupChannel[];
  onboarded: boolean;
}

export interface IntakeInput {
  claimantName: string;
  contactPhone: string;
  incidentDate: string;
  incidentLocation: string;
  caseType: string;
  primaryInjury: string;
  liabilitySummary: string;
  opposingInsurer: string;
}

export interface ClaimantProfile {
  name: string;
  phone: string;
}

export interface IncidentProfile {
  date: string;
  location: string;
  caseType: string;
  primaryInjury: string;
  liabilitySummary: string;
  opposingInsurer: string;
}

export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  category: TimelineCategory;
  channel: WorkupChannel;
  summary: string;
}

export interface EvidenceItem {
  id: string;
  title: string;
  category: EvidenceCategory;
  status: EvidenceStatus;
  source: string;
  channel: WorkupChannel;
  notes: string;
}

export interface DocumentChecklistItem {
  id: string;
  title: string;
  owner: string;
  status: ChecklistStatus;
  channel: WorkupChannel;
  required: boolean;
  dueInDays: number;
}

export interface WorkupTask {
  id: string;
  title: string;
  lane: string;
  owner: string;
  status: WorkupStatus;
  channel: WorkupChannel;
  dueDate: string;
  notes: string;
}

export interface AuditEvent {
  id: string;
  occurredAt: string;
  actor: string;
  action: string;
  detail: string;
}

export interface CaseRecord {
  id: string;
  matterNumber: string;
  status: "intake" | "workup" | "demand" | "closed";
  createdAt: string;
  updatedAt: string;
  claimant: ClaimantProfile;
  incident: IncidentProfile;
  timeline: TimelineEvent[];
  evidence: EvidenceItem[];
  checklist: DocumentChecklistItem[];
  tasks: WorkupTask[];
  audit: AuditEvent[];
  draft: string;
}

export interface DashboardSummary {
  openCases: number;
  averageCompletion: number;
  blockedTasks: number;
  overdueTasks: number;
  estimatedHoursSaved: number;
}

export interface CaseProgress {
  checklistPercent: number;
  taskPercent: number;
  evidencePercent: number;
  overallPercent: number;
}
