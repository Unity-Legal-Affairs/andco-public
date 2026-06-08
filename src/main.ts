import "./styles.css";
import type {
  CaseRecord,
  ChecklistStatus,
  EvidenceCategory,
  EvidenceStatus,
  FirmProfile,
  IntakeInput,
  TimelineCategory,
  WorkupChannel,
  WorkupStatus
} from "./models";
import {
  addEvidenceItem,
  addTimelineEvent,
  allChannels,
  blankFirmProfile,
  calculateCaseProgress,
  checklistStatuses,
  createCaseFromIntake,
  createDemoWorkspace,
  evidenceCategories,
  evidenceStatuses,
  generateCaseDraft,
  getNextActions,
  saveDraft,
  setChecklistStatus,
  setTaskStatus,
  summarizeDashboard,
  timelineCategories,
  workupStatuses
} from "./workup";

interface AppState {
  firm: FirmProfile;
  cases: CaseRecord[];
  selectedCaseId: string;
}

const STORAGE_KEY = "public-pi-workup-demo-state-v1";
const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Missing app root");
}

const root = app;

let state = loadState();
render();

function loadState(): AppState {
  const fallback: AppState = {
    firm: blankFirmProfile(),
    cases: [],
    selectedCaseId: ""
  };

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return fallback;
    }
    const parsed = JSON.parse(stored) as AppState;
    if (!parsed.firm || !Array.isArray(parsed.cases)) {
      return fallback;
    }

    return parsed;
  } catch {
    return fallback;
  }
}

function persist(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function resetToDemo(): void {
  const demo = createDemoWorkspace();
  state = {
    firm: demo.firm,
    cases: demo.cases,
    selectedCaseId: demo.cases[0]?.id ?? ""
  };
  persist();
  render();
}

function render(): void {
  if (!state.firm.onboarded) {
    root.innerHTML = renderOnboarding();
    bindOnboarding();
    return;
  }

  root.innerHTML = renderWorkspace();
  bindWorkspace();
}

function renderOnboarding(): string {
  return `
    <main class="onboarding-shell">
      <section class="hero-card">
        <p class="eyebrow">Clean-room public implementation</p>
        <h1>Personal Injury Workup Studio</h1>
        <p class="lede">
          A synthetic case workspace for intake, document chasing, records work, task status, audit history,
          and deterministic draft assistance. No real integrations are contacted.
        </p>
        <div class="notice-card">
          <strong>Legal demo disclaimer:</strong> This app is not legal advice, does not create an attorney-client
          relationship, and must use synthetic or user-provided demo data only.
        </div>
      </section>
      <form id="onboarding-form" class="panel onboarding-form">
        <h2>Start A Demo Workspace</h2>
        <label>
          Firm name
          <input name="firmName" value="Riverside Injury Group (Synthetic)" required />
        </label>
        <label>
          Practice region
          <input name="practiceRegion" value="California demo docket" required />
        </label>
        <label>
          Intake lead
          <input name="intakeLead" value="Nina Paralegal" required />
        </label>
        <label>
          Default workup owner
          <input name="defaultOwner" value="Workup team" required />
        </label>
        <fieldset>
          <legend>Mock channels</legend>
          <div class="channel-grid">
            ${allChannels
              .filter((channel) => channel !== "internal")
              .map(
                (channel) => `
                  <label class="check-chip">
                    <input type="checkbox" name="mockChannels" value="${channel}" checked />
                    ${label(channel)}
                  </label>
                `
              )
              .join("")}
          </div>
        </fieldset>
        <button class="primary-button" type="submit">Launch Synthetic Workspace</button>
      </form>
    </main>
  `;
}

function bindOnboarding(): void {
  document.querySelector<HTMLFormElement>("#onboarding-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const demo = createDemoWorkspace();
    const selectedChannels = data.getAll("mockChannels").map(String) as WorkupChannel[];

    state = {
      firm: {
        firmName: field(data, "firmName"),
        practiceRegion: field(data, "practiceRegion"),
        intakeLead: field(data, "intakeLead"),
        defaultOwner: field(data, "defaultOwner"),
        mockChannels: selectedChannels.length > 0 ? [...selectedChannels, "internal"] : demo.firm.mockChannels,
        onboarded: true
      },
      cases: demo.cases,
      selectedCaseId: demo.cases[0]?.id ?? ""
    };
    persist();
    render();
  });
}

function renderWorkspace(): string {
  const selected = getSelectedCase();
  const summary = summarizeDashboard(state.cases);

  return `
    <header class="topbar">
      <div>
        <p class="eyebrow">Synthetic plaintiff workflow</p>
        <h1>Personal Injury Workup Studio</h1>
      </div>
      <div class="topbar-actions">
        <span class="firm-pill">${escapeHtml(state.firm.firmName)}</span>
        <button id="reset-demo" class="ghost-button" type="button">Reset Demo Data</button>
      </div>
    </header>
    <div class="legal-banner">
      <strong>Demo only.</strong> Uses synthetic cases and deterministic mock logic. No real fax, email, SMS, voice,
      portal, insurer, provider, court, or AI service is contacted.
    </div>
    <main class="app-shell">
      <section class="dashboard-grid" aria-label="Dashboard metrics">
        ${metricCard("Open cases", String(summary.openCases), "Active synthetic matters")}
        ${metricCard("Avg. workup", `${summary.averageCompletion}%`, "Checklist, tasks, evidence")}
        ${metricCard("Blocked tasks", String(summary.blockedTasks), "Needs staff attention")}
        ${metricCard("Overdue tasks", String(summary.overdueTasks), "Past mock due date")}
        ${metricCard("Hours modeled", `${summary.estimatedHoursSaved}h`, "Rule-based estimate")}
      </section>
      <section class="workspace-grid">
        <aside class="left-rail">
          ${renderCaseRoster()}
          ${renderIntakeForm()}
        </aside>
        <section class="case-workspace">
          ${selected ? renderCaseWorkspace(selected) : renderEmptyCaseState()}
        </section>
      </section>
    </main>
  `;
}

function renderCaseRoster(): string {
  return `
    <section class="panel">
      <div class="panel-header">
        <h2>Case Roster</h2>
        <span>${state.cases.length} matters</span>
      </div>
      <div class="case-list">
        ${state.cases
          .map((caseRecord) => {
            const progress = calculateCaseProgress(caseRecord);
            const active = caseRecord.id === state.selectedCaseId ? "active" : "";
            return `
              <button class="case-button ${active}" type="button" data-select-case="${caseRecord.id}">
                <span>
                  <strong>${escapeHtml(caseRecord.claimant.name)}</strong>
                  <small>${escapeHtml(caseRecord.matterNumber)} · ${escapeHtml(caseRecord.incident.caseType)}</small>
                </span>
                <span class="progress-ring" aria-label="${progress.overallPercent}% complete">${progress.overallPercent}%</span>
              </button>
            `;
          })
          .join("")}
      </div>
    </section>
  `;
}

function renderIntakeForm(): string {
  return `
    <section class="panel">
      <div class="panel-header">
        <h2>Synthetic Intake</h2>
        <span>Validated</span>
      </div>
      <form id="intake-form" class="stacked-form">
        <label>Claimant name<input name="claimantName" placeholder="Jordan Lee" required /></label>
        <label>Phone<input name="contactPhone" placeholder="(555) 010-2000" required /></label>
        <label>Incident date<input name="incidentDate" type="date" required /></label>
        <label>Incident location<input name="incidentLocation" placeholder="Intersection or venue" required /></label>
        <label>Case type<input name="caseType" placeholder="Rear-end collision" required /></label>
        <label>Primary injury<input name="primaryInjury" placeholder="Lumbar strain" required /></label>
        <label>Opposing insurer<input name="opposingInsurer" placeholder="Fictional carrier" required /></label>
        <label>Liability summary<textarea name="liabilitySummary" rows="4" placeholder="Synthetic facts only" required></textarea></label>
        <button class="primary-button" type="submit">Create Case</button>
      </form>
    </section>
  `;
}

function renderCaseWorkspace(caseRecord: CaseRecord): string {
  const progress = calculateCaseProgress(caseRecord);
  const nextActions = getNextActions(caseRecord);

  return `
    <article class="case-hero panel">
      <div>
        <p class="eyebrow">${escapeHtml(caseRecord.matterNumber)}</p>
        <h2>${escapeHtml(caseRecord.claimant.name)}</h2>
        <p>${escapeHtml(caseRecord.incident.caseType)} · ${escapeHtml(caseRecord.incident.location)}</p>
      </div>
      <div class="completion-card">
        <strong>${progress.overallPercent}%</strong>
        <span>overall workup</span>
      </div>
    </article>
    <section class="case-grid">
      <div class="panel profile-panel">
        <div class="panel-header"><h3>Claimant & Facts</h3><span>${escapeHtml(caseRecord.status)}</span></div>
        <dl class="fact-list">
          <dt>Phone</dt><dd>${escapeHtml(caseRecord.claimant.phone)}</dd>
          <dt>Incident</dt><dd>${escapeHtml(caseRecord.incident.date)}</dd>
          <dt>Injury</dt><dd>${escapeHtml(caseRecord.incident.primaryInjury)}</dd>
          <dt>Insurer</dt><dd>${escapeHtml(caseRecord.incident.opposingInsurer)}</dd>
          <dt>Liability</dt><dd>${escapeHtml(caseRecord.incident.liabilitySummary)}</dd>
        </dl>
      </div>
      <div class="panel">
        <div class="panel-header"><h3>Next Best Actions</h3><span>Mock logic</span></div>
        <ul class="action-list">
          ${nextActions.map((action) => `<li>${escapeHtml(action)}</li>`).join("")}
        </ul>
      </div>
      <div class="panel span-two">
        <div class="panel-header"><h3>Mock Channel Map</h3><span>${state.firm.practiceRegion}</span></div>
        <div class="channel-row">
          ${state.firm.mockChannels.map((channel) => `<span class="channel-chip ${channel}">${label(channel)}</span>`).join("")}
        </div>
      </div>
    </section>
    <section class="two-column">
      ${renderTimeline(caseRecord)}
      ${renderEvidence(caseRecord)}
    </section>
    <section class="two-column">
      ${renderChecklist(caseRecord)}
      ${renderTasks(caseRecord)}
    </section>
    <section class="two-column">
      ${renderDraftHelper(caseRecord)}
      ${renderAudit(caseRecord)}
    </section>
  `;
}

function renderTimeline(caseRecord: CaseRecord): string {
  return `
    <section class="panel">
      <div class="panel-header"><h3>Timeline</h3><span>${caseRecord.timeline.length} events</span></div>
      <ol class="timeline-list">
        ${caseRecord.timeline
          .map(
            (event) => `
              <li>
                <time>${escapeHtml(event.date)}</time>
                <div>
                  <strong>${escapeHtml(event.title)}</strong>
                  <p>${escapeHtml(event.summary)}</p>
                  <span class="mini-chip">${label(event.channel)} · ${label(event.category)}</span>
                </div>
              </li>
            `
          )
          .join("")}
      </ol>
      <form id="timeline-form" class="stacked-form compact-form">
        <h4>Add timeline event</h4>
        <label>Date<input name="date" type="date" required /></label>
        <label>Title<input name="title" required /></label>
        <div class="form-row">
          <label>Category${selectHtml("category", timelineCategories, "workup")}</label>
          <label>Channel${selectHtml("channel", allChannels, "email")}</label>
        </div>
        <label>Summary<textarea name="summary" rows="3" required></textarea></label>
        <button class="secondary-button" type="submit">Add Event</button>
      </form>
    </section>
  `;
}

function renderEvidence(caseRecord: CaseRecord): string {
  return `
    <section class="panel">
      <div class="panel-header"><h3>Evidence</h3><span>${caseRecord.evidence.length} items</span></div>
      <div class="evidence-list">
        ${caseRecord.evidence
          .map(
            (item) => `
              <article class="evidence-card">
                <div>
                  <strong>${escapeHtml(item.title)}</strong>
                  <p>${escapeHtml(item.notes)}</p>
                </div>
                <span class="status ${item.status}">${label(item.status)}</span>
                <small>${label(item.category)} · ${label(item.channel)} · ${escapeHtml(item.source)}</small>
              </article>
            `
          )
          .join("")}
      </div>
      <form id="evidence-form" class="stacked-form compact-form">
        <h4>Add evidence</h4>
        <label>Title<input name="title" required /></label>
        <div class="form-row">
          <label>Category${selectHtml("category", evidenceCategories, "medical")}</label>
          <label>Status${selectHtml("status", evidenceStatuses, "received")}</label>
        </div>
        <div class="form-row">
          <label>Channel${selectHtml("channel", allChannels, "fax")}</label>
          <label>Source<input name="source" placeholder="Fictional provider" required /></label>
        </div>
        <label>Notes<textarea name="notes" rows="3" required></textarea></label>
        <button class="secondary-button" type="submit">Add Evidence</button>
      </form>
    </section>
  `;
}

function renderChecklist(caseRecord: CaseRecord): string {
  return `
    <section class="panel">
      <div class="panel-header"><h3>Document Checklist</h3><span>${calculateCaseProgress(caseRecord).checklistPercent}% ready</span></div>
      <div class="table-like">
        ${caseRecord.checklist
          .map(
            (item) => `
              <div class="table-row">
                <div>
                  <strong>${escapeHtml(item.title)}</strong>
                  <small>${item.required ? "Required" : "Optional"} · ${label(item.channel)} · due +${item.dueInDays}d</small>
                </div>
                ${selectHtml("checklistStatus", checklistStatuses, item.status, `data-checklist-status="${item.id}"`)}
              </div>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderTasks(caseRecord: CaseRecord): string {
  return `
    <section class="panel">
      <div class="panel-header"><h3>Workup Tasks</h3><span>${calculateCaseProgress(caseRecord).taskPercent}% done</span></div>
      <div class="task-board">
        ${caseRecord.tasks
          .map(
            (task) => `
              <article class="task-card ${task.status}">
                <div>
                  <strong>${escapeHtml(task.title)}</strong>
                  <p>${escapeHtml(task.notes)}</p>
                  <small>${escapeHtml(task.lane)} · ${label(task.channel)} · due ${escapeHtml(task.dueDate)}</small>
                </div>
                ${selectHtml("taskStatus", workupStatuses, task.status, `data-task-status="${task.id}"`)}
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderDraftHelper(caseRecord: CaseRecord): string {
  return `
    <section class="panel draft-panel">
      <div class="panel-header"><h3>AI-Style Draft Helper</h3><span>Deterministic</span></div>
      <p class="muted">Generates a rule-based workup summary and demand outline from the current synthetic case. No model or API call is used.</p>
      <button id="generate-draft" class="primary-button" type="button">Generate Draft</button>
      <pre class="draft-output">${escapeHtml(caseRecord.draft || "Generate a draft to see the case summary, demand outline, and open workup gaps.")}</pre>
    </section>
  `;
}

function renderAudit(caseRecord: CaseRecord): string {
  return `
    <section class="panel">
      <div class="panel-header"><h3>Audit History</h3><span>${caseRecord.audit.length} entries</span></div>
      <ol class="audit-list">
        ${caseRecord.audit
          .map(
            (event) => `
              <li>
                <time>${new Date(event.occurredAt).toLocaleString()}</time>
                <strong>${escapeHtml(event.action)}</strong>
                <p>${escapeHtml(event.detail)}</p>
                <small>${escapeHtml(event.actor)}</small>
              </li>
            `
          )
          .join("")}
      </ol>
    </section>
  `;
}

function renderEmptyCaseState(): string {
  return `
    <section class="panel empty-state">
      <h2>No case selected</h2>
      <p>Create a synthetic intake or choose a case from the roster.</p>
    </section>
  `;
}

function bindWorkspace(): void {
  document.querySelector<HTMLButtonElement>("#reset-demo")?.addEventListener("click", resetToDemo);

  document.querySelectorAll<HTMLButtonElement>("[data-select-case]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedCaseId = button.dataset.selectCase ?? "";
      persist();
      render();
    });
  });

  document.querySelector<HTMLFormElement>("#intake-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const input: IntakeInput = {
      claimantName: field(data, "claimantName"),
      contactPhone: field(data, "contactPhone"),
      incidentDate: field(data, "incidentDate"),
      incidentLocation: field(data, "incidentLocation"),
      caseType: field(data, "caseType"),
      primaryInjury: field(data, "primaryInjury"),
      liabilitySummary: field(data, "liabilitySummary"),
      opposingInsurer: field(data, "opposingInsurer")
    };

    try {
      const nextCase = createCaseFromIntake(input);
      state.cases = [nextCase, ...state.cases];
      state.selectedCaseId = nextCase.id;
      persist();
      render();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Unable to create case.");
    }
  });

  document.querySelector<HTMLFormElement>("#timeline-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    updateSelectedCase((caseRecord) =>
      addTimelineEvent(caseRecord, {
        date: field(data, "date"),
        title: field(data, "title"),
        category: field(data, "category") as TimelineCategory,
        channel: field(data, "channel") as WorkupChannel,
        summary: field(data, "summary")
      })
    );
  });

  document.querySelector<HTMLFormElement>("#evidence-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    updateSelectedCase((caseRecord) =>
      addEvidenceItem(caseRecord, {
        title: field(data, "title"),
        category: field(data, "category") as EvidenceCategory,
        status: field(data, "status") as EvidenceStatus,
        channel: field(data, "channel") as WorkupChannel,
        source: field(data, "source"),
        notes: field(data, "notes")
      })
    );
  });

  document.querySelectorAll<HTMLSelectElement>("[data-checklist-status]").forEach((select) => {
    select.addEventListener("change", () => {
      const itemId = select.dataset.checklistStatus;
      if (itemId) {
        updateSelectedCase((caseRecord) => setChecklistStatus(caseRecord, itemId, select.value as ChecklistStatus));
      }
    });
  });

  document.querySelectorAll<HTMLSelectElement>("[data-task-status]").forEach((select) => {
    select.addEventListener("change", () => {
      const taskId = select.dataset.taskStatus;
      if (taskId) {
        updateSelectedCase((caseRecord) => setTaskStatus(caseRecord, taskId, select.value as WorkupStatus));
      }
    });
  });

  document.querySelector<HTMLButtonElement>("#generate-draft")?.addEventListener("click", () => {
    updateSelectedCase((caseRecord) => saveDraft(caseRecord, generateCaseDraft(caseRecord)));
  });
}

function updateSelectedCase(mutator: (caseRecord: CaseRecord) => CaseRecord): void {
  state.cases = state.cases.map((caseRecord) =>
    caseRecord.id === state.selectedCaseId ? mutator(caseRecord) : caseRecord
  );
  persist();
  render();
}

function getSelectedCase(): CaseRecord | undefined {
  return state.cases.find((caseRecord) => caseRecord.id === state.selectedCaseId) ?? state.cases[0];
}

function metricCard(labelText: string, value: string, caption: string): string {
  return `
    <article class="metric-card">
      <span>${escapeHtml(labelText)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(caption)}</small>
    </article>
  `;
}

function selectHtml<T extends string>(name: string, options: T[], selected: T, extraAttributes = ""): string {
  return `
    <select name="${name}" ${extraAttributes}>
      ${options
        .map(
          (option) => `<option value="${option}" ${option === selected ? "selected" : ""}>${label(option)}</option>`
        )
        .join("")}
    </select>
  `;
}

function field(data: FormData, name: string): string {
  return String(data.get(name) ?? "").trim();
}

function label(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
