import { describe, expect, it } from "vitest";
import {
  calculateCaseProgress,
  createCaseFromIntake,
  generateCaseDraft,
  getNextActions,
  setChecklistStatus,
  setTaskStatus,
  summarizeDashboard,
  validateIntakeInput
} from "./workup";
import type { IntakeInput } from "./models";

const intake: IntakeInput = {
  claimantName: "Alex Rivera",
  contactPhone: "(555) 010-4400",
  incidentDate: "2026-05-20",
  incidentLocation: "Demo Avenue and 1st Street",
  caseType: "Parking lot collision",
  primaryInjury: "Lumbar strain with therapy referral",
  liabilitySummary: "Synthetic adverse driver reversed into the claimant's vehicle while claimant was stopped.",
  opposingInsurer: "Fictional Indemnity"
};

describe("workup domain", () => {
  it("validates required intake fields", () => {
    expect(validateIntakeInput({ ...intake, claimantName: "", opposingInsurer: "" })).toEqual([
      "claimant name",
      "opposing insurer"
    ]);
  });

  it("creates a synthetic case with default workup artifacts", () => {
    const caseRecord = createCaseFromIntake(intake, new Date("2026-06-08T10:00:00.000Z"));

    expect(caseRecord.claimant.name).toBe("Alex Rivera");
    expect(caseRecord.checklist.length).toBeGreaterThanOrEqual(8);
    expect(caseRecord.tasks.some((task) => task.title === "Request medical records")).toBe(true);
    expect(caseRecord.audit[0]?.action).toBe("Case intake created");
  });

  it("updates checklist and task completion progress", () => {
    const caseRecord = createCaseFromIntake(intake, new Date("2026-06-08T10:00:00.000Z"));
    const withChecklist = setChecklistStatus(caseRecord, "retainer-and-representation-agreement", "reviewed");
    const withTask = setTaskStatus(withChecklist, "open-third-party-insurance-claim", "done");
    const progress = calculateCaseProgress(withTask);

    expect(progress.checklistPercent).toBe(10);
    expect(progress.taskPercent).toBe(13);
    expect(withTask.audit[0]?.action).toBe("Task status changed");
  });

  it("generates a deterministic demo draft and next actions", () => {
    const caseRecord = createCaseFromIntake(intake, new Date("2026-06-08T10:00:00.000Z"));
    const draft = generateCaseDraft(caseRecord);

    expect(draft).toContain("DEMO DRAFT - NOT LEGAL ADVICE");
    expect(draft).toContain("Alex Rivera");
    expect(draft).toContain("Fictional Indemnity");
    expect(getNextActions(caseRecord)[0]).toContain("Follow up");
  });

  it("summarizes dashboard metrics across cases", () => {
    const first = createCaseFromIntake(intake, new Date("2026-06-08T10:00:00.000Z"));
    const second = setTaskStatus(
      createCaseFromIntake({ ...intake, claimantName: "Morgan Patel" }, new Date("2026-06-08T10:00:00.000Z")),
      "request-medical-records",
      "blocked"
    );
    const summary = summarizeDashboard([first, second], new Date("2026-06-08T10:00:00.000Z"));

    expect(summary.openCases).toBe(2);
    expect(summary.blockedTasks).toBe(1);
    expect(summary.estimatedHoursSaved).toBeGreaterThan(15);
  });
});
