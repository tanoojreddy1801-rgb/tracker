const storageKey = "dueguard.tasks.v1";

const state = {
  tasks: loadTasks(),
  view: "dashboard",
  search: "",
  category: "all",
  priority: "all",
};

const els = {
  taskList: document.querySelector("#taskList"),
  emptyState: document.querySelector("#emptyState"),
  searchInput: document.querySelector("#searchInput"),
  categoryFilter: document.querySelector("#categoryFilter"),
  priorityFilter: document.querySelector("#priorityFilter"),
  taskDialog: document.querySelector("#taskDialog"),
  taskForm: document.querySelector("#taskForm"),
  dialogTitle: document.querySelector("#dialogTitle"),
  deleteButton: document.querySelector("#deleteButton"),
  focusCopy: document.querySelector("#focusCopy"),
  viewEyebrow: document.querySelector("#viewEyebrow"),
  viewTitle: document.querySelector("#viewTitle"),
  aiBriefTitle: document.querySelector("#aiBriefTitle"),
  aiBriefCopy: document.querySelector("#aiBriefCopy"),
};

const fields = {
  id: document.querySelector("#taskId"),
  client: document.querySelector("#clientInput"),
  title: document.querySelector("#titleInput"),
  category: document.querySelector("#formCategory"),
  dueDate: document.querySelector("#dueInput"),
  priority: document.querySelector("#formPriority"),
  owner: document.querySelector("#ownerInput"),
  notes: document.querySelector("#notesInput"),
  remind7: document.querySelector("#remind7"),
  remind3: document.querySelector("#remind3"),
  remind1: document.querySelector("#remind1"),
};

document.querySelector("#newTaskButton").addEventListener("click", () => openTaskDialog());
document.querySelector("#seedButton").addEventListener("click", seedTasks);
document.querySelector("#exportButton").addEventListener("click", exportCsv);
document.querySelector("#notifyButton").addEventListener("click", requestNotifications);
document.querySelector("#copyBriefButton").addEventListener("click", copyBrief);
els.searchInput.addEventListener("input", (event) => {
  state.search = event.target.value.trim().toLowerCase();
  render();
});
els.categoryFilter.addEventListener("change", (event) => {
  state.category = event.target.value;
  render();
});
els.priorityFilter.addEventListener("change", (event) => {
  state.priority = event.target.value;
  render();
});
document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => {
    state.view = button.dataset.view;
    document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item === button));
    render();
  });
});
els.taskForm.addEventListener("submit", (event) => {
  if (event.submitter?.value === "cancel") return;
  event.preventDefault();
  saveTask();
});
els.deleteButton.addEventListener("click", deleteCurrentTask);

render();
showDueNotificationSummary();

function loadTasks() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) || [];
  } catch {
    return [];
  }
}

function persist() {
  localStorage.setItem(storageKey, JSON.stringify(state.tasks));
}

function todayDate() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

function parseDate(value) {
  const date = new Date(`${value}T00:00:00`);
  date.setHours(0, 0, 0, 0);
  return date;
}

function daysUntil(value) {
  const diff = parseDate(value) - todayDate();
  return Math.round(diff / 86400000);
}

function taskStatus(task) {
  if (task.done) return "done";
  const days = daysUntil(task.dueDate);
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  if (days <= 7) return "week";
  return "later";
}

function riskScore(task) {
  const priorityScore = { High: 50, Medium: 28, Low: 12 }[task.priority] || 20;
  const days = daysUntil(task.dueDate);
  const timeScore = days < 0 ? 60 : Math.max(0, 42 - days * 6);
  const categoryScore = ["Income Tax", "GST", "ROC"].includes(task.category) ? 12 : 6;
  return Math.min(100, priorityScore + timeScore + categoryScore);
}

function sortedTasks(tasks) {
  return [...tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return riskScore(b) - riskScore(a) || parseDate(a.dueDate) - parseDate(b.dueDate);
  });
}

function filteredTasks() {
  return sortedTasks(state.tasks).filter((task) => {
    const status = taskStatus(task);
    const text = `${task.client} ${task.title} ${task.category} ${task.owner} ${task.notes}`.toLowerCase();
    const matchesView =
      state.view === "dashboard" ||
      (state.view === "critical" && !task.done && (status === "overdue" || status === "today" || riskScore(task) >= 78)) ||
      (state.view === "upcoming" && !task.done && daysUntil(task.dueDate) >= 0 && daysUntil(task.dueDate) <= 7) ||
      (state.view === "completed" && task.done);
    const matchesSearch = !state.search || text.includes(state.search);
    const matchesCategory = state.category === "all" || task.category === state.category;
    const matchesPriority = state.priority === "all" || task.priority === state.priority;
    return matchesView && matchesSearch && matchesCategory && matchesPriority;
  });
}

function render() {
  const tasks = filteredTasks();
  renderMetrics();
  renderViewTitle();
  renderSmartBrief();
  els.taskList.innerHTML = "";
  els.emptyState.hidden = tasks.length > 0;
  tasks.forEach((task) => els.taskList.appendChild(taskCard(task)));
}

function renderMetrics() {
  const active = state.tasks.filter((task) => !task.done);
  const overdue = active.filter((task) => taskStatus(task) === "overdue").length;
  const today = active.filter((task) => taskStatus(task) === "today").length;
  const week = active.filter((task) => daysUntil(task.dueDate) >= 0 && daysUntil(task.dueDate) <= 7).length;
  const completed = state.tasks.filter((task) => task.done).length;
  setText("#overdueCount", overdue);
  setText("#todayCount", today);
  setText("#weekCount", week);
  setText("#doneCount", completed);
  setText("#navTotal", active.length);
  setText("#navCritical", active.filter((task) => ["overdue", "today"].includes(taskStatus(task)) || riskScore(task) >= 78).length);
  setText("#navWeek", week);
  setText("#navCompleted", completed);
  els.focusCopy.textContent = overdue
    ? `${overdue} matter${overdue > 1 ? "s are" : " is"} overdue. Clear or escalate before adding new low-priority work.`
    : today
      ? `${today} matter${today > 1 ? "s are" : " is"} due today. Keep the day centered around closure.`
      : "You are clear on immediate deadlines. Keep adding every client commitment as soon as it appears.";
}

function renderViewTitle() {
  const labels = {
    dashboard: ["All active work", "Sorted by urgency"],
    critical: ["High attention", "Critical and near-deadline matters"],
    upcoming: ["Planning window", "Due in the next 7 days"],
    completed: ["Closed work", "Completed matters"],
  };
  els.viewEyebrow.textContent = labels[state.view][0];
  els.viewTitle.textContent = labels[state.view][1];
}

function renderSmartBrief() {
  const active = sortedTasks(state.tasks.filter((task) => !task.done));
  if (!active.length) {
    els.aiBriefTitle.textContent = "No open deadline pressure.";
    els.aiBriefCopy.textContent = "Add the next notice, return, renewal, hearing, or filing as soon as it lands.";
    return;
  }
  const top = active[0];
  const days = daysUntil(top.dueDate);
  const due = days < 0 ? `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue` : days === 0 ? "due today" : `due in ${days} day${days === 1 ? "" : "s"}`;
  const action = days <= 0
    ? "finish, upload, or escalate today"
    : days <= 3
      ? "block time and collect pending documents now"
      : "confirm documents and owner before it moves into the danger window";
  els.aiBriefTitle.textContent = `${top.client}: ${top.title}`;
  els.aiBriefCopy.textContent = `${top.category} matter is ${due} with ${top.priority.toLowerCase()} priority and risk ${riskScore(top)}. Recommended action: ${action}.`;
}

function setText(selector, value) {
  document.querySelector(selector).textContent = value;
}

function taskCard(task) {
  const status = taskStatus(task);
  const days = daysUntil(task.dueDate);
  const article = document.createElement("article");
  article.className = `task-card ${status}`;
  const dueCopy = task.done ? "Completed" : days < 0 ? `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue` : days === 0 ? "Due today" : `Due in ${days} day${days === 1 ? "" : "s"}`;
  article.innerHTML = `
    <div>
      <div class="task-top">
        <div>
          <p class="client">${escapeHtml(task.client)}</p>
          <h4 class="task-title">${escapeHtml(task.title)}</h4>
        </div>
        <span class="pill ${status === "done" ? "ok" : riskScore(task) >= 78 ? "risk" : ""}">${dueCopy}</span>
      </div>
      <div class="task-meta">
        <span class="pill">${escapeHtml(task.category)}</span>
        <span class="pill">${escapeHtml(task.priority)}</span>
        <span class="pill">Risk ${riskScore(task)}</span>
        <span class="pill">${formatDate(task.dueDate)}</span>
        ${task.owner ? `<span class="pill">${escapeHtml(task.owner)}</span>` : ""}
      </div>
      ${task.notes ? `<p class="task-notes">${escapeHtml(task.notes)}</p>` : ""}
    </div>
    <div class="task-actions">
      <button class="icon-button" type="button" title="${task.done ? "Reopen" : "Mark complete"}" aria-label="${task.done ? "Reopen" : "Mark complete"}" data-action="toggle" data-id="${task.id}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>
      </button>
      <button class="icon-button" type="button" title="Edit" aria-label="Edit" data-action="edit" data-id="${task.id}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m16 3 5 5L8 21H3v-5z"></path></svg>
      </button>
    </div>
  `;
  article.querySelector('[data-action="toggle"]').addEventListener("click", () => toggleDone(task.id));
  article.querySelector('[data-action="edit"]').addEventListener("click", () => openTaskDialog(task));
  return article;
}

function openTaskDialog(task = null) {
  els.dialogTitle.textContent = task ? "Edit client work" : "Add client work";
  els.deleteButton.hidden = !task;
  fields.id.value = task?.id || "";
  fields.client.value = task?.client || "";
  fields.title.value = task?.title || "";
  fields.category.value = task?.category || "Income Tax";
  fields.dueDate.value = task?.dueDate || new Date().toISOString().slice(0, 10);
  fields.priority.value = task?.priority || "High";
  fields.owner.value = task?.owner || "";
  fields.notes.value = task?.notes || "";
  fields.remind7.checked = task?.reminders?.includes(7) ?? true;
  fields.remind3.checked = task?.reminders?.includes(3) ?? true;
  fields.remind1.checked = task?.reminders?.includes(1) ?? true;
  els.taskDialog.showModal();
}

function saveTask() {
  const reminders = [
    fields.remind7.checked ? 7 : null,
    fields.remind3.checked ? 3 : null,
    fields.remind1.checked ? 1 : null,
  ].filter(Boolean);
  const task = {
    id: fields.id.value || crypto.randomUUID(),
    client: fields.client.value.trim(),
    title: fields.title.value.trim(),
    category: fields.category.value,
    dueDate: fields.dueDate.value,
    priority: fields.priority.value,
    owner: fields.owner.value.trim(),
    notes: fields.notes.value.trim(),
    reminders,
    done: state.tasks.find((item) => item.id === fields.id.value)?.done || false,
    updatedAt: new Date().toISOString(),
  };
  const index = state.tasks.findIndex((item) => item.id === task.id);
  if (index >= 0) state.tasks[index] = task;
  else state.tasks.push(task);
  persist();
  els.taskDialog.close();
  render();
}

function deleteCurrentTask() {
  state.tasks = state.tasks.filter((task) => task.id !== fields.id.value);
  persist();
  els.taskDialog.close();
  render();
}

function toggleDone(id) {
  state.tasks = state.tasks.map((task) => task.id === id ? { ...task, done: !task.done, updatedAt: new Date().toISOString() } : task);
  persist();
  render();
}

function seedTasks() {
  if (state.tasks.length && !confirm("This will add sample matters to your current tracker. Continue?")) return;
  const base = todayDate();
  const addDays = (days) => {
    const date = new Date(base);
    date.setDate(base.getDate() + days);
    return date.toISOString().slice(0, 10);
  };
  state.tasks.push(
    {
      id: crypto.randomUUID(),
      client: "Agarwal Engineering",
      title: "Prepare reply to income tax notice",
      category: "Income Tax",
      dueDate: addDays(1),
      priority: "High",
      owner: "Self",
      notes: "Collect AIS reconciliation and draft response before portal upload.",
      reminders: [7, 3, 1],
      done: false,
      updatedAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      client: "Nila Foods LLP",
      title: "GSTR-3B review and filing",
      category: "GST",
      dueDate: addDays(4),
      priority: "Medium",
      owner: "Assistant",
      notes: "Check ITC mismatch and payment challan.",
      reminders: [3, 1],
      done: false,
      updatedAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      client: "Veda Labs Pvt Ltd",
      title: "ROC annual filing documents",
      category: "ROC",
      dueDate: addDays(12),
      priority: "High",
      owner: "Self",
      notes: "Board minutes pending from client.",
      reminders: [7, 3, 1],
      done: false,
      updatedAt: new Date().toISOString(),
    }
  );
  persist();
  render();
}

function exportCsv() {
  const header = ["Client", "Title", "Category", "Due Date", "Priority", "Owner", "Status", "Notes"];
  const rows = sortedTasks(state.tasks).map((task) => [
    task.client,
    task.title,
    task.category,
    task.dueDate,
    task.priority,
    task.owner,
    task.done ? "Completed" : taskStatus(task),
    task.notes,
  ]);
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `dueguard-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

async function copyBrief() {
  const text = `${els.aiBriefTitle.textContent}\n${els.aiBriefCopy.textContent}`;
  try {
    await navigator.clipboard.writeText(text);
    document.querySelector("#copyBriefButton").textContent = "Copied";
    setTimeout(() => {
      document.querySelector("#copyBriefButton").textContent = "Copy brief";
    }, 1200);
  } catch {
    alert(text);
  }
}

function csvCell(value) {
  return `"${String(value || "").replaceAll('"', '""')}"`;
}

async function requestNotifications() {
  if (!("Notification" in window)) {
    alert("Browser notifications are not available here.");
    return;
  }
  const permission = await Notification.requestPermission();
  if (permission === "granted") showDueNotificationSummary(true);
}

function showDueNotificationSummary(force = false) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const urgent = state.tasks.filter((task) => !task.done && daysUntil(task.dueDate) <= 1);
  if (!urgent.length || (!force && sessionStorage.getItem("dueguard.notified.today") === new Date().toDateString())) return;
  new Notification("DueGuard attention needed", {
    body: `${urgent.length} client matter${urgent.length > 1 ? "s need" : " needs"} action within 24 hours.`,
  });
  sessionStorage.setItem("dueguard.notified.today", new Date().toDateString());
}

function formatDate(value) {
  return parseDate(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
