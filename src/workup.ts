import type {
  AuditEvent,
  CaseProgress,
  CaseRecord,
  ChecklistStatus,
  DashboardSummary,
  DocumentChecklistItem,
  EvidenceCategory,
  EvidenceItem,
  EvidenceStatus,
  FirmProfile,
  IntakeInput,
  TimelineCategory,
  TimelineEvent,
  WorkupChannel,
  WorkupStatus,
  WorkupTask
} from "./models";

const REQUIRED_INTAKE_FIELDS: Array<keyof IntakeInput> = [
  "claimantName",
  "contactPhone",
  "incidentDate",
  "incidentLocation",
  "caseType",
  "primaryInjury",
  "liabilitySummary",
  "opposingInsurer"
];

export const allChannels: WorkupChannel[] = [
  "web",
  "email",
  "fax",
  "sms",
  "voice",
  "mail",
  "portal",
  "internal"
];

export const checklistStatuses: ChecklistStatus[] = ["missing", "requested", "received", "reviewed"];
export const evidenceStatuses: EvidenceStatus[] = ["needed", "requested", "received", "analyzed"];
export const workupStatuses: WorkupStatus[] = ["queued", "active", "blocked", "review", "done"];
export const evidenceCategories: EvidenceCategory[] = [
  "report",
  "medical",
  "billing",
  "photo",
  "insurance",
  "correspondence",
  "other"
];
export const timelineCategories: TimelineCategory[] = [
  "intake",
  "liability",
  "medical",
  "insurance",
  "client",
  "workup"
];

export function blankFirmProfile(): FirmProfile {
  return {
    firmName: "",
    practiceRegion: "",
    intakeLead: "",
    defaultOwner: "",
    mockChannels: ["web", "email", "fax", "sms", "voice"],
    onboarded: false
  };
}

export function validateIntakeInput(input: IntakeInput): string[] {
  const errors = REQUIRED_INTAKE_FIELDS.filter((field) => !input[field]?.trim()).map((field) =>
    field.replace(/([A-Z])/g, " $1").toLowerCase()
  );

  if (input.incidentDate && Number.isNaN(Date.parse(input.incidentDate))) {
    errors.push("valid incident date");
  }

  return errors;
}

export function createCaseFromIntake(input: IntakeInput, now = new Date()): CaseRecord {
  const errors = validateIntakeInput(input);

  if (errors.length > 0) {
    throw new Error(`Missing intake fields: ${errors.join(", ")}`);
  }

  const createdAt = now.toISOString();
  const caseId = stableId("case", input.claimantName, input.incidentDate);
  const owner = "Workup team";

  const caseRecord: CaseRecord = {
    id: caseId,
    matterNumber: createMatterNumber(input.claimantName, input.incidentDate),
    status: "workup",
    createdAt,
    updatedAt: createdAt,
    claimant: {
      name: input.claimantName.trim(),
      phone: input.contactPhone.trim()
    },
    incident: {
      date: input.incidentDate,
      location: input.incidentLocation.trim(),
      caseType: input.caseType.trim(),
      primaryInjury: input.primaryInjury.trim(),
      liabilitySummary: input.liabilitySummary.trim(),
      opposingInsurer: input.opposingInsurer.trim()
    },
    timeline: [
      {
        id: stableId("timeline", caseId, "incident"),
        date: input.incidentDate,
        title: "Incident reported by claimant",
        category: "intake",
        channel: "internal",
        summary: input.liabilitySummary.trim()
      },
      {
        id: stableId("timeline", caseId, "client-auth"),
        date: toDateInput(now),
        title: "Digital intake packet prepared",
        category: "client",
        channel: "sms",
        summary: "Mock authorization packet queued for claimant review."
      }
    ],
    evidence: [
      {
        id: stableId("evidence", caseId, "client-statement"),
        title: "Initial claimant statement",
        category: "correspondence",
        status: "received",
        source: "Synthetic intake form",
        channel: "internal",
        notes: "Demo-only statement captured during intake."
      }
    ],
    checklist: createDefaultChecklist(owner),
    tasks: createDefaultTasks(now, owner),
    audit: [createAudit("Case intake created", `${input.claimantName.trim()} added as a synthetic workup matter.`, now)],
    draft: ""
  };

  return caseRecord;
}

export function createDefaultChecklist(owner: string): DocumentChecklistItem[] {
  return [
    checklistItem("Retainer and representation agreement", owner, "sms", true, 1),
    checklistItem("HIPAA and medical authorizations", owner, "sms", true, 1),
    checklistItem("Accident or incident report", owner, "web", true, 7),
    checklistItem("Insurance claim number", owner, "web", true, 2),
    checklistItem("Policy declarations and UM/UIM review", owner, "email", true, 5),
    checklistItem("Medical records packet", owner, "fax", true, 14),
    checklistItem("Itemized billing ledger", owner, "email", true, 14),
    checklistItem("Lien and subrogation review", owner, "mail", true, 18),
    checklistItem("Scene or vehicle photos", owner, "sms", false, 3),
    checklistItem("Lost wage support", owner, "email", false, 10)
  ];
}

export function createDefaultTasks(now: Date, owner: string): WorkupTask[] {
  return [
    taskItem("Request incident report", "Reports", owner, "web", 7, now, "queued"),
    taskItem("Open third-party insurance claim", "Insurance", owner, "web", 2, now, "queued"),
    taskItem("Verify coverage and limits", "Insurance", owner, "email", 5, now, "queued"),
    taskItem("Identify treatment providers", "Provider discovery", owner, "sms", 2, now, "active"),
    taskItem("Request medical records", "Records", owner, "fax", 14, now, "queued"),
    taskItem("Request billing ledger", "Billing", owner, "email", 14, now, "queued"),
    taskItem("Monitor ongoing treatment", "Treatment", owner, "voice", 21, now, "queued"),
    taskItem("Prepare demand review packet", "Demand prep", owner, "internal", 30, now, "queued")
  ];
}

export function calculateCaseProgress(caseRecord: CaseRecord): CaseProgress {
  const checklistPercent = percentComplete(
    caseRecord.checklist,
    (item) => item.status === "received" || item.status === "reviewed"
  );
  const taskPercent = percentComplete(caseRecord.tasks, (task) => task.status === "done");
  const evidencePercent = percentComplete(
    caseRecord.evidence,
    (item) => item.status === "received" || item.status === "analyzed"
  );
  const overallPercent = Math.round(checklistPercent * 0.35 + taskPercent * 0.45 + evidencePercent * 0.2);

  return { checklistPercent, taskPercent, evidencePercent, overallPercent };
}

export function summarizeDashboard(cases: CaseRecord[], now = new Date()): DashboardSummary {
  const openCases = cases.filter((caseRecord) => caseRecord.status !== "closed").length;
  const averageCompletion = cases.length
    ? Math.round(cases.reduce((sum, caseRecord) => sum + calculateCaseProgress(caseRecord).overallPercent, 0) / cases.length)
    : 0;
  const blockedTasks = cases.flatMap((caseRecord) => caseRecord.tasks).filter((task) => task.status === "blocked").length;
  const overdueTasks = cases
    .flatMap((caseRecord) => caseRecord.tasks)
    .filter((task) => task.status !== "done" && new Date(task.dueDate).getTime() < startOfDay(now).getTime()).length;

  return {
    openCases,
    averageCompletion,
    blockedTasks,
    overdueTasks,
    estimatedHoursSaved: openCases * 8 + Math.round(averageCompletion / 8)
  };
}

export function getNextActions(caseRecord: CaseRecord): string[] {
  const missingRequired = caseRecord.checklist.filter(
    (item) => item.required && (item.status === "missing" || item.status === "requested")
  );
  const blockedTasks = caseRecord.tasks.filter((task) => task.status === "blocked");
  const activeTasks = caseRecord.tasks.filter((task) => task.status === "active" || task.status === "review");
  const actions = [
    ...blockedTasks.map((task) => `Resolve blocked task: ${task.title}`),
    ...missingRequired.slice(0, 3).map((item) => `Follow up on ${item.title.toLowerCase()} via ${item.channel}`),
    ...activeTasks.slice(0, 2).map((task) => `Advance ${task.title.toLowerCase()} to the next status`)
  ];

  return actions.length > 0 ? actions : ["Review the demand packet for attorney approval."];
}

export function generateCaseDraft(caseRecord: CaseRecord): string {
  const progress = calculateCaseProgress(caseRecord);
  const receivedEvidence = caseRecord.evidence.filter(
    (item) => item.status === "received" || item.status === "analyzed"
  );
  const gaps = getNextActions(caseRecord);
  const band = estimateDemandBand(caseRecord);

  return [
    "DEMO DRAFT - NOT LEGAL ADVICE",
    "",
    `Matter: ${caseRecord.matterNumber}`,
    `Claimant: ${caseRecord.claimant.name}`,
    `Incident: ${caseRecord.incident.caseType} on ${caseRecord.incident.date} at ${caseRecord.incident.location}`,
    `Primary injury: ${caseRecord.incident.primaryInjury}`,
    `Opposing insurer: ${caseRecord.incident.opposingInsurer}`,
    "",
    "Liability Theory",
    caseRecord.incident.liabilitySummary,
    "",
    "Workup Snapshot",
    `Overall completion is ${progress.overallPercent}% with ${progress.checklistPercent}% of documents received or reviewed and ${progress.taskPercent}% of workup tasks done.`,
    receivedEvidence.length > 0
      ? `Evidence currently ready for review: ${receivedEvidence.map((item) => item.title).join("; ")}.`
      : "No evidence has been marked received yet.",
    "",
    "Mock Demand Outline",
    `A deterministic demo range of ${band} is suggested for scenario planning only. This uses simple rules based on injury keywords, evidence readiness, and workup completeness.`,
    "",
    "Open Workup Gaps",
    ...gaps.map((gap) => `- ${gap}`),
    "",
    "Disclaimer: This rule-based draft is generated from synthetic demo data. It is not legal advice and should not be used for real claims."
  ].join("\n");
}

export function addTimelineEvent(
  caseRecord: CaseRecord,
  input: Omit<TimelineEvent, "id">,
  now = new Date()
): CaseRecord {
  const nextEvent: TimelineEvent = {
    ...input,
    id: stableId("timeline", caseRecord.id, input.date, input.title, String(caseRecord.timeline.length + 1))
  };

  return withAudit(
    {
      ...caseRecord,
      timeline: [...caseRecord.timeline, nextEvent].sort((a, b) => a.date.localeCompare(b.date)),
      updatedAt: now.toISOString()
    },
    "Timeline event added",
    `${input.title} added to ${caseRecord.claimant.name}.`,
    now
  );
}

export function addEvidenceItem(
  caseRecord: CaseRecord,
  input: Omit<EvidenceItem, "id">,
  now = new Date()
): CaseRecord {
  const nextEvidence: EvidenceItem = {
    ...input,
    id: stableId("evidence", caseRecord.id, input.title, String(caseRecord.evidence.length + 1))
  };

  return withAudit(
    {
      ...caseRecord,
      evidence: [...caseRecord.evidence, nextEvidence],
      updatedAt: now.toISOString()
    },
    "Evidence item added",
    `${input.title} added from ${input.source}.`,
    now
  );
}

export function setChecklistStatus(
  caseRecord: CaseRecord,
  itemId: string,
  status: ChecklistStatus,
  now = new Date()
): CaseRecord {
  const item = caseRecord.checklist.find((candidate) => candidate.id === itemId);

  if (!item) {
    return caseRecord;
  }

  return withAudit(
    {
      ...caseRecord,
      checklist: caseRecord.checklist.map((candidate) =>
        candidate.id === itemId ? { ...candidate, status } : candidate
      ),
      updatedAt: now.toISOString()
    },
    "Checklist status changed",
    `${item.title} marked ${status}.`,
    now
  );
}

export function setTaskStatus(
  caseRecord: CaseRecord,
  taskId: string,
  status: WorkupStatus,
  now = new Date()
): CaseRecord {
  const task = caseRecord.tasks.find((candidate) => candidate.id === taskId);

  if (!task) {
    return caseRecord;
  }

  return withAudit(
    {
      ...caseRecord,
      tasks: caseRecord.tasks.map((candidate) => (candidate.id === taskId ? { ...candidate, status } : candidate)),
      updatedAt: now.toISOString()
    },
    "Task status changed",
    `${task.title} moved to ${status}.`,
    now
  );
}

export function saveDraft(caseRecord: CaseRecord, draft: string, now = new Date()): CaseRecord {
  return withAudit(
    {
      ...caseRecord,
      draft,
      updatedAt: now.toISOString()
    },
    "Draft generated",
    "Deterministic demo summary and demand outline refreshed.",
    now
  );
}

export function createDemoWorkspace(now = new Date("2026-06-08T12:00:00.000Z")): {
  firm: FirmProfile;
  cases: CaseRecord[];
} {
  const firm: FirmProfile = {
    firmName: "Riverside Injury Group (Synthetic)",
    practiceRegion: "California demo docket",
    intakeLead: "Nina Paralegal",
    defaultOwner: "Workup team",
    mockChannels: ["web", "email", "fax", "sms", "voice", "mail", "portal"],
    onboarded: true
  };

  const maya = createCaseFromIntake(
    {
      claimantName: "Maya Chen",
      contactPhone: "(415) 555-0188",
      incidentDate: "2026-05-17",
      incidentLocation: "Market Street and 5th Street, San Francisco",
      caseType: "Rideshare rear-end collision",
      primaryInjury: "Cervical strain with shoulder radiculopathy",
      liabilitySummary:
        "Synthetic facts indicate the adverse driver followed too closely and struck the claimant while traffic was stopped.",
      opposingInsurer: "Northstar Mutual"
    },
    now
  );
  const mayaReady = saveDraft(
    setTaskStatus(
      setTaskStatus(
        setChecklistStatus(
          setChecklistStatus(
            addEvidenceItem(
              addEvidenceItem(
                addTimelineEvent(maya, {
                  date: "2026-05-18",
                  title: "Mock claim opened with carrier portal",
                  category: "insurance",
                  channel: "web",
                  summary: "Synthetic third-party claim number assigned for demo tracking."
                }),
                {
                  title: "Vehicle scene photos",
                  category: "photo",
                  status: "analyzed",
                  source: "Claimant mobile upload",
                  channel: "sms",
                  notes: "Photos show rear bumper damage in this fictional scenario."
                },
                now
              ),
              {
                title: "Urgent care visit summary",
                category: "medical",
                status: "received",
                source: "Harbor Urgent Care (fictional)",
                channel: "fax",
                notes: "Demo record indicates conservative treatment and follow-up recommendation."
              },
              now
            ),
            "retainer-and-representation-agreement",
            "reviewed",
            now
          ),
          "insurance-claim-number",
          "received",
          now
        ),
        "open-third-party-insurance-claim",
        "done",
        now
      ),
      "identify-treatment-providers",
      "done",
      now
    ),
    generateCaseDraft(maya),
    now
  );

  const jalen = createCaseFromIntake(
    {
      claimantName: "Jalen Ortiz",
      contactPhone: "(510) 555-0114",
      incidentDate: "2026-05-29",
      incidentLocation: "I-880 southbound near Oak Street, Oakland",
      caseType: "Commercial vehicle lane-change collision",
      primaryInjury: "Lumbar disc injury with physical therapy referral",
      liabilitySummary:
        "Synthetic witness summary says a delivery van merged without clearing the lane and forced claimant into the barrier.",
      opposingInsurer: "Harbor Shield Casualty"
    },
    now
  );
  const jalenReady = setTaskStatus(
    setChecklistStatus(
      addTimelineEvent(jalen, {
        date: "2026-06-01",
        title: "Provider discovery call completed",
        category: "medical",
        channel: "voice",
        summary: "Fictional provider list confirmed for records and billing requests."
      }),
      "hipaa-and-medical-authorizations",
      "requested",
      now
    ),
    "request-medical-records",
    "blocked",
    now
  );

  return { firm, cases: [mayaReady, jalenReady] };
}

export function createAudit(action: string, detail: string, now = new Date(), actor = "Demo user"): AuditEvent {
  return {
    id: stableId("audit", action, detail, now.toISOString()),
    occurredAt: now.toISOString(),
    actor,
    action,
    detail
  };
}

function checklistItem(
  title: string,
  owner: string,
  channel: WorkupChannel,
  required: boolean,
  dueInDays: number
): DocumentChecklistItem {
  return {
    id: stableId(title),
    title,
    owner,
    status: "missing",
    channel,
    required,
    dueInDays
  };
}

function taskItem(
  title: string,
  lane: string,
  owner: string,
  channel: WorkupChannel,
  dueInDays: number,
  now: Date,
  status: WorkupStatus
): WorkupTask {
  return {
    id: stableId(title),
    title,
    lane,
    owner,
    status,
    channel,
    dueDate: addDays(now, dueInDays),
    notes: `Mock ${channel} workflow. No real external request is sent.`
  };
}

function withAudit(caseRecord: CaseRecord, action: string, detail: string, now: Date): CaseRecord {
  return {
    ...caseRecord,
    audit: [createAudit(action, detail, now), ...caseRecord.audit]
  };
}

function estimateDemandBand(caseRecord: CaseRecord): string {
  const injury = caseRecord.incident.primaryInjury.toLowerCase();
  const progress = calculateCaseProgress(caseRecord).overallPercent;
  const evidenceScore = caseRecord.evidence.filter((item) => item.status === "received" || item.status === "analyzed").length;
  const severity = injury.includes("surgery")
    ? 4
    : injury.includes("disc") || injury.includes("fracture")
      ? 3
      : injury.includes("radiculopathy") || injury.includes("therapy")
        ? 2
        : 1;
  const low = 15_000 + severity * 18_000 + evidenceScore * 4_000 + progress * 350;
  const high = Math.round(low * (1.65 + severity * 0.12));

  return `$${formatMoney(low)} to $${formatMoney(high)}`;
}

function percentComplete<T>(items: T[], predicate: (item: T) => boolean): number {
  if (items.length === 0) {
    return 0;
  }

  return Math.round((items.filter(predicate).length / items.length) * 100);
}

function createMatterNumber(claimantName: string, incidentDate: string): string {
  const initials = claimantName
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase())
    .join("")
    .slice(0, 3);
  const compactDate = incidentDate.replaceAll("-", "").slice(2);

  return `${initials || "PI"}-${compactDate}`;
}

function stableId(...parts: string[]): string {
  const id = parts
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return id || "item";
}

function addDays(date: Date, days: number): string {
  const next = new Date(date);
  next.setDate(next.getDate() + days);

  return toDateInput(next);
}

function toDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfDay(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  return start;
}

function formatMoney(amount: number): string {
  return Math.round(amount).toLocaleString("en-US");
}
