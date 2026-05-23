"use client";

import {
  Archive,
  BarChart3,
  Bug,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  ClipboardList,
  Code2,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Plus,
  Search,
  Settings,
  Sparkles,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type Status = "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
type Priority = "LOW" | "MEDIUM" | "HIGH";
type TaskType = "FEATURE" | "BUG" | "CHORE" | "REFACTOR" | "RESEARCH";
type View = "dashboard" | "projects" | "tasks" | "board" | "sprints" | "settings";

type User = { id: string; email: string; password: string };
type Project = {
  id: string;
  userId: string;
  name: string;
  description: string;
  color: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
};
type Sprint = {
  id: string;
  userId: string;
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
};
type Task = {
  id: string;
  userId: string;
  projectId: string;
  sprintId: string | null;
  title: string;
  description: string;
  type: TaskType;
  status: Status;
  priority: Priority;
  deadline: string | null;
  createdAt: string;
  updatedAt: string;
};

type Store = { users: User[]; projects: Project[]; sprints: Sprint[]; tasks: Task[] };
type FiltersState = {
  search: string;
  projectId: string;
  status: string;
  priority: string;
  type: string;
  sprintId: string;
  deadline: string;
};

const today = new Date().toISOString().slice(0, 10);
const statuses: Status[] = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"];
const priorities: Priority[] = ["LOW", "MEDIUM", "HIGH"];
const taskTypes: TaskType[] = ["FEATURE", "BUG", "CHORE", "REFACTOR", "RESEARCH"];
const colors = ["#2563eb", "#16a34a", "#9333ea", "#dc2626", "#d97706", "#0891b2"];

const emptyStore: Store = { users: [], projects: [], sprints: [], tasks: [] };

const statusLabel: Record<Status, string> = {
  TODO: "Todo",
  IN_PROGRESS: "In Progress",
  REVIEW: "Review",
  DONE: "Done",
};

const priorityClass: Record<Priority, string> = {
  LOW: "bg-slate-100 text-slate-700",
  MEDIUM: "bg-amber-100 text-amber-800",
  HIGH: "bg-red-100 text-red-700",
};

const statusClass: Record<Status, string> = {
  TODO: "bg-slate-100 text-slate-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  REVIEW: "bg-purple-100 text-purple-700",
  DONE: "bg-green-100 text-green-700",
};

function id(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

function readStore(): Store {
  if (typeof window === "undefined") return emptyStore;
  const raw = localStorage.getItem("devflow-store");
  return raw ? JSON.parse(raw) : seedStore();
}

function seedStore(): Store {
  const userId = "user_demo";
  const now = new Date().toISOString();
  const projectA = "project_devflow";
  const projectB = "project_api";
  const sprint = "sprint_mvp";
  const seeded: Store = {
    users: [{ id: userId, email: "demo@devflow.local", password: "password" }],
    projects: [
      {
        id: projectA,
        userId,
        name: "DevFlow MVP",
        description: "Build personal sprint tracker for daily coding work.",
        color: "#2563eb",
        isArchived: false,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: projectB,
        userId,
        name: "API Cleanup",
        description: "Refactor endpoints and validation for portfolio API.",
        color: "#16a34a",
        isArchived: false,
        createdAt: now,
        updatedAt: now,
      },
    ],
    sprints: [
      {
        id: sprint,
        userId,
        name: "MVP Sprint",
        goal: "Finish the core task tracking workflow.",
        startDate: today,
        endDate: offsetDate(10),
        createdAt: now,
        updatedAt: now,
      },
    ],
    tasks: [
      makeTask(userId, projectA, sprint, "Wire auth guard and local session", "FEATURE", "DONE", "HIGH", offsetDate(1)),
      makeTask(userId, projectA, sprint, "Build Kanban drag status update", "FEATURE", "IN_PROGRESS", "HIGH", offsetDate(4)),
      makeTask(userId, projectA, sprint, "Fix empty state copy on dashboard", "BUG", "REVIEW", "MEDIUM", offsetDate(2)),
      makeTask(userId, projectB, null, "Research database migration plan", "RESEARCH", "TODO", "LOW", offsetDate(8)),
      makeTask(userId, projectB, null, "Remove unused response mapper", "REFACTOR", "TODO", "MEDIUM", offsetDate(-2)),
    ],
  };
  localStorage.setItem("devflow-store", JSON.stringify(seeded));
  localStorage.setItem("devflow-session", userId);
  return seeded;
}

function makeTask(
  userId: string,
  projectId: string,
  sprintId: string | null,
  title: string,
  type: TaskType,
  status: Status,
  priority: Priority,
  deadline: string,
): Task {
  const now = new Date().toISOString();
  return {
    id: id("task"),
    userId,
    projectId,
    sprintId,
    title,
    description: "",
    type,
    status,
    priority,
    deadline,
    createdAt: now,
    updatedAt: now,
  };
}

function offsetDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function niceDate(value: string | null) {
  if (!value) return "No deadline";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}

function dateInputValue(value: string | null | undefined) {
  return value ? value.slice(0, 10) : "";
}

function isOverdue(task: Task) {
  return Boolean(task.deadline && dateInputValue(task.deadline) < today && task.status !== "DONE");
}

export default function DevFlowApp() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [store, setStore] = useState<Store>(() => readStore());
  const [sessionId, setSessionId] = useState<string | null>(() => (typeof window === "undefined" ? null : localStorage.getItem("devflow-session")));
  const [authMode, setAuthMode] = useState<"login" | "register">(() => {
    if (typeof window === "undefined") return "login";
    return window.location.pathname.split("/")[1] === "register" ? "register" : "login";
  });
  const [view, setView] = useState<View>(() => {
    if (typeof window === "undefined") return "dashboard";
    const path = window.location.pathname.split("/")[1];
    return ["dashboard", "projects", "tasks", "board", "sprints", "settings"].includes(path) ? (path as View) : "dashboard";
  });
  const [filters, setFilters] = useState({
    search: "",
    projectId: "ALL",
    status: "ALL",
    priority: "ALL",
    type: "ALL",
    sprintId: "ALL",
    deadline: "ALL",
  });
  const [taskModal, setTaskModal] = useState<Task | null | "new">(null);
  const [projectModal, setProjectModal] = useState<Project | null | "new">(null);
  const [sprintModal, setSprintModal] = useState<Sprint | null | "new">(null);
  const [selectedDetail, setSelectedDetail] = useState<{ kind: "project" | "sprint"; id: string } | null>(null);
  const [toast, setToast] = useState("");
  const [isRemoteReady, setIsRemoteReady] = useState(false);

  const flash = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  }, []);

  const loadRemoteStore = useCallback(
    async (token: string, userId: string, email: string) => {
      const response = await fetch("/api/devflow", { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) {
        flash("Data failed to load");
        return;
      }
      const data = (await response.json()) as Store;
      setStore({ ...data, users: [{ id: userId, email, password: "" }] });
    },
    [flash],
  );

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      if (!data.session?.user) {
        setIsRemoteReady(true);
        return;
      }
      setSessionId(data.session.user.id);
      loadRemoteStore(data.session.access_token, data.session.user.id, data.session.user.email ?? "user@devflow.local").finally(() => setIsRemoteReady(true));
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setSessionId(null);
        setStore(emptyStore);
        return;
      }
      setSessionId(session.user.id);
      loadRemoteStore(session.access_token, session.user.id, session.user.email ?? "user@devflow.local");
    });

    return () => data.subscription.unsubscribe();
  }, [loadRemoteStore, supabase]);

  useEffect(() => {
    if (store.users.length) localStorage.setItem("devflow-store", JSON.stringify(store));
  }, [store]);

  const user = store.users.find((item) => item.id === sessionId) ?? null;
  const userProjects = store.projects.filter((item) => item.userId === user?.id);
  const userSprints = store.sprints.filter((item) => item.userId === user?.id);
  const userTasks = store.tasks.filter((item) => item.userId === user?.id);
  const activeProjects = userProjects.filter((item) => !item.isArchived);
  const activeSprint =
    userSprints
      .filter((item) => item.startDate <= today && item.endDate >= today)
      .sort((a, b) => a.endDate.localeCompare(b.endDate))[0] ?? userSprints[0];

  const filteredTasks = useMemo(() => {
    return userTasks.filter((task) => {
      const searchMatch = task.title.toLowerCase().includes(filters.search.toLowerCase());
      const deadlineMatch =
        filters.deadline === "ALL" ||
        (filters.deadline === "OVERDUE" && isOverdue(task)) ||
        (filters.deadline === "UPCOMING" && Boolean(task.deadline && dateInputValue(task.deadline) >= today));
      return (
        searchMatch &&
        (filters.projectId === "ALL" || task.projectId === filters.projectId) &&
        (filters.status === "ALL" || task.status === filters.status) &&
        (filters.priority === "ALL" || task.priority === filters.priority) &&
        (filters.type === "ALL" || task.type === filters.type) &&
        (filters.sprintId === "ALL" || task.sprintId === filters.sprintId) &&
        deadlineMatch
      );
    });
  }, [filters, userTasks]);

  const remoteMutation = async (body: unknown) => {
    if (!supabase) return false;
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const remoteUser = data.session?.user;
    if (!token || !remoteUser) return false;
    const response = await fetch("/api/devflow", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      flash("Database update failed");
      return true;
    }
    await loadRemoteStore(token, remoteUser.id, remoteUser.email ?? "user@devflow.local");
    return true;
  };

  const deleteRemote = async (action: "deleteProject" | "deleteSprint" | "deleteTask", idValue: string) => {
    return remoteMutation({ action, id: idValue });
  };

  const saveTask = async (task: Task) => {
    if (await remoteMutation({ action: "upsertTask", payload: task })) {
      setTaskModal(null);
      flash("Task saved");
      return;
    }
    setStore((current) => ({
      ...current,
      tasks: current.tasks.some((item) => item.id === task.id)
        ? current.tasks.map((item) => (item.id === task.id ? { ...task, updatedAt: new Date().toISOString() } : item))
        : [...current.tasks, task],
    }));
    setTaskModal(null);
    flash("Task saved");
  };

  const saveProject = async (project: Project) => {
    if (await remoteMutation({ action: "upsertProject", payload: project })) {
      setProjectModal(null);
      flash("Project saved");
      return;
    }
    setStore((current) => ({
      ...current,
      projects: current.projects.some((item) => item.id === project.id)
        ? current.projects.map((item) => (item.id === project.id ? { ...project, updatedAt: new Date().toISOString() } : item))
        : [...current.projects, project],
    }));
    setProjectModal(null);
    flash("Project saved");
  };

  const saveSprint = async (sprint: Sprint) => {
    if (sprint.endDate < sprint.startDate) {
      flash("End date cannot be earlier than start date");
      return;
    }
    if (await remoteMutation({ action: "upsertSprint", payload: sprint })) {
      setSprintModal(null);
      flash("Sprint saved");
      return;
    }
    setStore((current) => ({
      ...current,
      sprints: current.sprints.some((item) => item.id === sprint.id)
        ? current.sprints.map((item) => (item.id === sprint.id ? { ...sprint, updatedAt: new Date().toISOString() } : item))
        : [...current.sprints, sprint],
    }));
    setSprintModal(null);
    flash("Sprint saved");
  };

  const navigate = (nextView: View) => {
    setView(nextView);
    setSelectedDetail(null);
    window.history.pushState(null, "", `/${nextView}`);
  };

  const logout = () => {
    if (supabase) supabase.auth.signOut();
    localStorage.removeItem("devflow-session");
    setSessionId(null);
    window.history.pushState(null, "", "/login");
  };

  if (supabase && !isRemoteReady) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f6f8fb] px-4">
        <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm font-medium text-slate-600 shadow-sm">Loading DevFlow...</div>
      </main>
    );
  }

  if (!user) {
    return <AuthScreen mode={authMode} setMode={setAuthMode} store={store} setStore={setStore} setSessionId={setSessionId} />;
  }

  return (
    <div className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-slate-200 bg-white px-4 py-5 lg:block">
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="grid size-10 place-items-center rounded-lg bg-blue-600 text-white">
            <Code2 size={21} />
          </div>
          <div>
            <p className="text-lg font-semibold leading-5">DevFlow</p>
            <p className="text-xs text-slate-500">Personal sprint tracker</p>
          </div>
        </div>
        <nav className="space-y-1">
          {([
            ["dashboard", LayoutDashboard, "Dashboard"],
            ["projects", FolderKanban, "Projects"],
            ["tasks", ClipboardList, "Tasks"],
            ["board", BarChart3, "Board"],
            ["sprints", CalendarDays, "Sprints"],
            ["settings", Settings, "Settings"],
          ] as const).map(([key, Icon, label]) => (
            <button
              key={key as string}
              onClick={() => navigate(key as View)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                view === key ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              }`}
            >
              <Icon size={17} />
              {label}
            </button>
          ))}
        </nav>
        <div className="absolute bottom-5 left-4 right-4 space-y-2">
          <button onClick={() => setProjectModal("new")} className="primary-button w-full">
            <Plus size={16} /> New Project
          </button>
          <button onClick={() => setTaskModal("new")} className="secondary-button w-full">
            <Plus size={16} /> New Task
          </button>
        </div>
      </aside>

      <main className="lg:pl-64">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur md:px-7">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">{view}</p>
              <h1 className="text-2xl font-semibold tracking-tight">{titleFor(view, selectedDetail, userProjects, userSprints)}</h1>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto">
              <button onClick={() => setTaskModal("new")} className="primary-button">
                <Plus size={16} /> Task
              </button>
              <button onClick={() => setSprintModal("new")} className="secondary-button">
                <Plus size={16} /> Sprint
              </button>
              <button onClick={logout} className="icon-button" title="Logout">
                <LogOut size={18} />
              </button>
            </div>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto lg:hidden">
            {(["dashboard", "projects", "tasks", "board", "sprints", "settings"] as View[]).map((item) => (
              <button key={item} onClick={() => navigate(item)} className={`tab-button ${view === item ? "tab-active" : ""}`}>
                {item}
              </button>
            ))}
          </div>
        </header>

        <section className="p-4 md:p-7">
          {view === "dashboard" && (
            <Dashboard
              projects={activeProjects}
              tasks={userTasks}
              activeSprint={activeSprint}
              setTaskModal={setTaskModal}
            />
          )}
          {view === "projects" && (
            <ProjectsView
              projects={userProjects}
              tasks={userTasks}
              selected={selectedDetail?.kind === "project" ? selectedDetail.id : null}
              setSelected={(idValue) => setSelectedDetail({ kind: "project", id: idValue })}
              editProject={setProjectModal}
              deleteProject={async (projectId) => {
                if (await deleteRemote("deleteProject", projectId)) return;
                setStore((current) => ({
                  ...current,
                  projects: current.projects.filter((item) => item.id !== projectId),
                  tasks: current.tasks.filter((item) => item.projectId !== projectId),
                }));
              }}
            />
          )}
          {view === "tasks" && (
            <TasksView
              tasks={filteredTasks}
              projects={userProjects}
              sprints={userSprints}
              filters={filters}
              setFilters={setFilters}
              editTask={setTaskModal}
              deleteTask={async (taskId) => {
                if (await deleteRemote("deleteTask", taskId)) return;
                setStore((current) => ({ ...current, tasks: current.tasks.filter((item) => item.id !== taskId) }));
              }}
            />
          )}
          {view === "board" && (
            <BoardView
              tasks={filteredTasks}
              projects={userProjects}
              sprints={userSprints}
              filters={filters}
              setFilters={setFilters}
              editTask={setTaskModal}
              moveTask={async (taskId, status) => {
                const task = userTasks.find((item) => item.id === taskId);
                if (task && (await remoteMutation({ action: "upsertTask", payload: { ...task, status } }))) {
                  flash("Task status updated");
                  return;
                }
                setStore((current) => ({
                  ...current,
                  tasks: current.tasks.map((item) => (item.id === taskId ? { ...item, status, updatedAt: new Date().toISOString() } : item)),
                }));
                flash("Task status updated");
              }}
            />
          )}
          {view === "sprints" && (
            <SprintsView
              sprints={userSprints}
              tasks={userTasks}
              selected={selectedDetail?.kind === "sprint" ? selectedDetail.id : null}
              setSelected={(idValue) => setSelectedDetail({ kind: "sprint", id: idValue })}
              editSprint={setSprintModal}
              deleteSprint={async (sprintId) => {
                if (await deleteRemote("deleteSprint", sprintId)) return;
                setStore((current) => ({
                  ...current,
                  sprints: current.sprints.filter((item) => item.id !== sprintId),
                  tasks: current.tasks.map((item) => (item.sprintId === sprintId ? { ...item, sprintId: null } : item)),
                }));
              }}
            />
          )}
          {view === "settings" && <SettingsView user={user} logout={logout} />}
        </section>
      </main>

      {taskModal && (
        <TaskModal
          userId={user.id}
          task={taskModal === "new" ? null : taskModal}
          projects={activeProjects}
          sprints={userSprints}
          onClose={() => setTaskModal(null)}
          onSave={saveTask}
        />
      )}
      {projectModal && (
        <ProjectModal userId={user.id} project={projectModal === "new" ? null : projectModal} onClose={() => setProjectModal(null)} onSave={saveProject} />
      )}
      {sprintModal && <SprintModal userId={user.id} sprint={sprintModal === "new" ? null : sprintModal} onClose={() => setSprintModal(null)} onSave={saveSprint} />}
      {toast && <div className="fixed bottom-5 right-5 z-40 rounded-lg bg-slate-950 px-4 py-3 text-sm font-medium text-white shadow-xl">{toast}</div>}
    </div>
  );
}

function titleFor(view: View, detail: { kind: "project" | "sprint"; id: string } | null, projects: Project[], sprints: Sprint[]) {
  if (detail?.kind === "project") return projects.find((item) => item.id === detail.id)?.name ?? "Project Detail";
  if (detail?.kind === "sprint") return sprints.find((item) => item.id === detail.id)?.name ?? "Sprint Detail";
  return {
    dashboard: "Dashboard",
    projects: "Projects",
    tasks: "Tasks",
    board: "Kanban Board",
    sprints: "Sprints",
    settings: "Settings",
  }[view];
}

function AuthScreen({
  mode,
  setMode,
  store,
  setStore,
  setSessionId,
}: {
  mode: "login" | "register";
  setMode: (mode: "login" | "register") => void;
  store: Store;
  setStore: (store: Store) => void;
  setSessionId: (id: string) => void;
}) {
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim().toLowerCase();
    const password = String(data.get("password") ?? "");
    const confirm = String(data.get("confirm") ?? "");
    if (!email || !password) return setError("Email and password are required.");
    if (supabase) {
      const result =
        mode === "register"
          ? await supabase.auth.signUp({ email, password })
          : await supabase.auth.signInWithPassword({ email, password });
      if (result.error) {
        setError(
          result.error.message.includes("email rate limit")
            ? "Supabase email confirmation sedang kena rate limit. Tunggu beberapa menit atau matikan email confirmation untuk testing."
            : result.error.message,
        );
        return;
      }
      if (mode === "register" && result.data.user && !result.data.session) {
        setNotice("Account created. Check your email confirmation link before logging in.");
        return;
      }
      if (result.data.session?.user) {
        localStorage.removeItem("devflow-session");
        setSessionId(result.data.session.user.id);
        window.history.pushState(null, "", "/dashboard");
      }
      return;
    }
    if (mode === "register") {
      if (password !== confirm) return setError("Password confirmation does not match.");
      if (store.users.some((item) => item.email === email)) return setError("Email already exists.");
      const user = { id: id("user"), email, password };
      setStore({ ...store, users: [...store.users, user] });
      localStorage.setItem("devflow-session", user.id);
      setSessionId(user.id);
      window.history.pushState(null, "", "/dashboard");
      return;
    }
    const user = store.users.find((item) => item.email === email && item.password === password);
    if (!user) return setError("Invalid email or password.");
    localStorage.setItem("devflow-session", user.id);
    setSessionId(user.id);
    window.history.pushState(null, "", "/dashboard");
  };

  return (
    <main className="grid min-h-screen place-items-center bg-[#f6f8fb] px-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-lg bg-blue-600 text-white">
            <Code2 size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">DevFlow</h1>
            <p className="text-sm text-slate-500">Sign in to your personal coding tracker.</p>
          </div>
        </div>
        {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {notice && <p className="mb-4 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">{notice}</p>}
        <label className="field-label">Email</label>
        <input name="email" className="field-input" defaultValue={mode === "login" ? "demo@devflow.local" : ""} />
        <label className="field-label">Password</label>
        <input name="password" type="password" className="field-input" defaultValue={mode === "login" ? "password" : ""} />
        {mode === "register" && (
          <>
            <label className="field-label">Confirm password</label>
            <input name="confirm" type="password" className="field-input" />
          </>
        )}
        <button className="primary-button mt-4 w-full justify-center">{mode === "login" ? "Login" : "Register"}</button>
        <button type="button" onClick={() => setMode(mode === "login" ? "register" : "login")} className="mt-4 w-full text-sm font-medium text-blue-700">
          {mode === "login" ? "Create an account" : "Back to login"}
        </button>
      </form>
    </main>
  );
}

function Dashboard({
  projects,
  tasks,
  activeSprint,
  setTaskModal,
}: {
  projects: Project[];
  tasks: Task[];
  activeSprint?: Sprint;
  setTaskModal: (task: Task | "new") => void;
}) {
  const done = tasks.filter((item) => item.status === "DONE").length;
  const overdue = tasks.filter(isOverdue);
  const sprintTasks = activeSprint ? tasks.filter((item) => item.sprintId === activeSprint.id) : [];
  const progress = sprintTasks.length ? Math.round((sprintTasks.filter((item) => item.status === "DONE").length / sprintTasks.length) * 100) : 0;
  const upcoming = tasks.filter((item) => item.deadline && item.deadline >= today && item.status !== "DONE").sort((a, b) => String(a.deadline).localeCompare(String(b.deadline))).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric icon={FolderKanban} label="Active Projects" value={projects.length} />
        <Metric icon={ClipboardList} label="Total Tasks" value={tasks.length} />
        <Metric icon={CheckCircle2} label="Completed Tasks" value={done} />
        <Metric icon={Bug} label="Overdue Tasks" value={overdue.length} />
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel title="Active Sprint Progress">
          {activeSprint ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold">{activeSprint.name}</h3>
                  <p className="text-sm text-slate-500">{activeSprint.goal || "No sprint goal yet."}</p>
                </div>
                <span className="text-2xl font-semibold">{progress}%</span>
              </div>
              <Progress value={progress} />
              <p className="text-sm text-slate-500">
                {sprintTasks.filter((item) => item.status === "DONE").length} of {sprintTasks.length} sprint tasks done
              </p>
            </div>
          ) : (
            <EmptyState text="No sprint yet. Create your first sprint to track focused work." />
          )}
        </Panel>
        <Panel title="Task by Status">
          <Breakdown values={statuses.map((status) => ({ label: statusLabel[status], value: tasks.filter((item) => item.status === status).length }))} />
        </Panel>
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        <Panel title="Priority Breakdown">
          <Breakdown values={priorities.map((priority) => ({ label: priority, value: tasks.filter((item) => item.priority === priority).length }))} />
        </Panel>
        <Panel title="Upcoming Deadlines">
          <TaskMiniList tasks={upcoming} empty="No upcoming deadlines." setTaskModal={setTaskModal} />
        </Panel>
        <Panel title="Overdue Tasks">
          <TaskMiniList tasks={overdue} empty="No overdue tasks. Nice and clear." setTaskModal={setTaskModal} />
        </Panel>
      </div>
    </div>
  );
}

function ProjectsView({
  projects,
  tasks,
  selected,
  setSelected,
  editProject,
  deleteProject,
}: {
  projects: Project[];
  tasks: Task[];
  selected: string | null;
  setSelected: (id: string) => void;
  editProject: (project: Project) => void;
  deleteProject: (id: string) => void;
}) {
  const project = projects.find((item) => item.id === selected);
  if (project) {
    const projectTasks = tasks.filter((item) => item.projectId === project.id);
    return (
      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <Panel title="Project Info">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="size-4 rounded-full" style={{ background: project.color }} />
              <h2 className="text-xl font-semibold">{project.name}</h2>
            </div>
            <p className="text-sm text-slate-600">{project.description || "No description."}</p>
            <Progress value={projectTasks.length ? Math.round((projectTasks.filter((item) => item.status === "DONE").length / projectTasks.length) * 100) : 0} />
            <div className="flex gap-2">
              <button className="secondary-button" onClick={() => editProject(project)}>
                Edit project
              </button>
              <button className="secondary-button" onClick={() => deleteProject(project.id)}>
                Delete
              </button>
            </div>
          </div>
        </Panel>
        <Panel title="Project Tasks">
          <TaskRows tasks={projectTasks} />
        </Panel>
      </div>
    );
  }
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {projects.map((item) => {
        const count = tasks.filter((task) => task.projectId === item.id).length;
        return (
          <button key={item.id} onClick={() => setSelected(item.id)} className="rounded-lg border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="mb-4 flex items-center justify-between">
              <span className="size-4 rounded-full" style={{ background: item.color }} />
              {item.isArchived && <Archive size={16} className="text-slate-400" />}
            </div>
            <h2 className="text-lg font-semibold">{item.name}</h2>
            <p className="mt-1 min-h-10 text-sm text-slate-500">{item.description || "No description."}</p>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-slate-500">{count} tasks</span>
              <span className="font-medium text-blue-700">Open</span>
            </div>
          </button>
        );
      })}
      {!projects.length && <EmptyState text="No projects yet. Create your first project to start tracking your work." />}
    </div>
  );
}

function TasksView(props: {
  tasks: Task[];
  projects: Project[];
  sprints: Sprint[];
  filters: FiltersState;
  setFilters: (filters: FiltersState) => void;
  editTask: (task: Task) => void;
  deleteTask: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <Filters {...props} />
      <Panel title="Task List">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="py-3">Task</th>
                <th>Project</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Deadline</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {props.tasks.map((task) => (
                <tr key={task.id}>
                  <td className="py-3 font-medium">{task.title}</td>
                  <td>{props.projects.find((item) => item.id === task.projectId)?.name ?? "Unknown"}</td>
                  <td>
                    <Badge className={statusClass[task.status]}>{statusLabel[task.status]}</Badge>
                  </td>
                  <td>
                    <Badge className={priorityClass[task.priority]}>{task.priority}</Badge>
                  </td>
                  <td className={isOverdue(task) ? "font-medium text-red-600" : ""}>{niceDate(task.deadline)}</td>
                  <td className="text-right">
                    <button onClick={() => props.editTask(task)} className="mr-2 text-blue-700">
                      Edit
                    </button>
                    <button onClick={() => props.deleteTask(task.id)} className="text-red-600">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!props.tasks.length && <EmptyState text="No tasks match your filters." />}
        </div>
      </Panel>
    </div>
  );
}

function BoardView(props: {
  tasks: Task[];
  projects: Project[];
  sprints: Sprint[];
  filters: FiltersState;
  setFilters: (filters: FiltersState) => void;
  editTask: (task: Task) => void;
  moveTask: (taskId: string, status: Status) => void;
}) {
  return (
    <div className="space-y-4">
      <Filters {...props} />
      <div className="grid min-w-[980px] grid-cols-4 gap-4 overflow-x-auto pb-3">
        {statuses.map((status) => (
          <div key={status} onDragOver={(event) => event.preventDefault()} onDrop={(event) => props.moveTask(event.dataTransfer.getData("taskId"), status)} className="min-h-[560px] rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">{statusLabel[status]}</h2>
              <Badge className={statusClass[status]}>{props.tasks.filter((item) => item.status === status).length}</Badge>
            </div>
            <div className="space-y-3">
              {props.tasks
                .filter((item) => item.status === status)
                .map((task) => (
                  <button key={task.id} draggable onDragStart={(event) => event.dataTransfer.setData("taskId", task.id)} onClick={() => props.editTask(task)} className="w-full rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:shadow-md">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <Badge className={priorityClass[task.priority]}>{task.priority}</Badge>
                      <span className={isOverdue(task) ? "text-xs font-medium text-red-600" : "text-xs text-slate-500"}>{niceDate(task.deadline)}</span>
                    </div>
                    <h3 className="font-semibold leading-5">{task.title}</h3>
                    <p className="mt-2 text-xs text-slate-500">{props.projects.find((item) => item.id === task.projectId)?.name}</p>
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SprintsView({
  sprints,
  tasks,
  selected,
  setSelected,
  editSprint,
  deleteSprint,
}: {
  sprints: Sprint[];
  tasks: Task[];
  selected: string | null;
  setSelected: (id: string) => void;
  editSprint: (sprint: Sprint) => void;
  deleteSprint: (id: string) => void;
}) {
  const sprint = sprints.find((item) => item.id === selected);
  if (sprint) {
    const sprintTasks = tasks.filter((item) => item.sprintId === sprint.id);
    const progress = sprintTasks.length ? Math.round((sprintTasks.filter((item) => item.status === "DONE").length / sprintTasks.length) * 100) : 0;
    return (
      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <Panel title="Sprint Info">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">{sprint.name}</h2>
            <p className="text-sm text-slate-600">{sprint.goal || "No sprint goal."}</p>
            <p className="text-sm text-slate-500">
              {niceDate(sprint.startDate)} - {niceDate(sprint.endDate)}
            </p>
            <Progress value={progress} />
            <div className="flex gap-2">
              <button className="secondary-button" onClick={() => editSprint(sprint)}>
                Edit sprint
              </button>
              <button className="secondary-button" onClick={() => deleteSprint(sprint.id)}>
                Delete
              </button>
            </div>
          </div>
        </Panel>
        <Panel title="Sprint Tasks">
          <TaskRows tasks={sprintTasks} />
        </Panel>
      </div>
    );
  }
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {sprints.map((item) => {
        const sprintTasks = tasks.filter((task) => task.sprintId === item.id);
        const progress = sprintTasks.length ? Math.round((sprintTasks.filter((task) => task.status === "DONE").length / sprintTasks.length) * 100) : 0;
        return (
          <button key={item.id} onClick={() => setSelected(item.id)} className="rounded-lg border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{item.name}</h2>
              <span className="text-sm font-semibold text-blue-700">{progress}%</span>
            </div>
            <p className="min-h-10 text-sm text-slate-500">{item.goal || "No goal."}</p>
            <Progress value={progress} />
            <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
              <span>{sprintTasks.length} tasks</span>
              <span>
                {niceDate(item.startDate)} - {niceDate(item.endDate)}
              </span>
            </div>
          </button>
        );
      })}
      {!sprints.length && <EmptyState text="No sprints yet. Create a sprint to focus the next batch of work." />}
    </div>
  );
}

function SettingsView({ user, logout }: { user: User; logout: () => void }) {
  return (
    <Panel title="Account">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-slate-500">Signed in as</p>
          <h2 className="text-xl font-semibold">{user.email}</h2>
        </div>
        <button onClick={logout} className="secondary-button">
          <LogOut size={16} /> Logout
        </button>
      </div>
    </Panel>
  );
}

function Filters({
  projects,
  sprints,
  filters,
  setFilters,
}: {
  projects: Project[];
  sprints: Sprint[];
  filters: FiltersState;
  setFilters: (filters: FiltersState) => void;
}) {
  const update = (key: string, value: string) => setFilters({ ...filters, [key]: value });
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
        <div className="relative xl:col-span-2">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={17} />
          <input value={filters.search} onChange={(event) => update("search", event.target.value)} className="field-input mb-0 pl-9" placeholder="Search task title" />
        </div>
        <select value={filters.projectId} onChange={(event) => update("projectId", event.target.value)} className="field-input mb-0">
          <option value="ALL">All projects</option>
          {projects.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <select value={filters.status} onChange={(event) => update("status", event.target.value)} className="field-input mb-0">
          <option value="ALL">All status</option>
          {statuses.map((item) => (
            <option key={item} value={item}>
              {statusLabel[item]}
            </option>
          ))}
        </select>
        <select value={filters.priority} onChange={(event) => update("priority", event.target.value)} className="field-input mb-0">
          <option value="ALL">All priority</option>
          {priorities.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select value={filters.type} onChange={(event) => update("type", event.target.value)} className="field-input mb-0">
          <option value="ALL">All type</option>
          {taskTypes.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select value={filters.sprintId} onChange={(event) => update("sprintId", event.target.value)} className="field-input mb-0">
          <option value="ALL">All sprint</option>
          {sprints.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <select value={filters.deadline} onChange={(event) => update("deadline", event.target.value)} className="field-input mb-0">
          <option value="ALL">All deadlines</option>
          <option value="UPCOMING">Upcoming</option>
          <option value="OVERDUE">Overdue</option>
        </select>
      </div>
      <button className="mt-3 text-sm font-medium text-blue-700" onClick={() => setFilters({ search: "", projectId: "ALL", status: "ALL", priority: "ALL", type: "ALL", sprintId: "ALL", deadline: "ALL" })}>
        Reset filter
      </button>
    </div>
  );
}

function TaskModal(props: { userId: string; task: Task | null; projects: Project[]; sprints: Sprint[]; onClose: () => void; onSave: (task: Task) => void }) {
  const task = props.task;
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const title = String(data.get("title") ?? "").trim();
    const projectId = String(data.get("projectId") ?? "");
    if (!title || !projectId) return;
    const now = new Date().toISOString();
    props.onSave({
      id: task?.id ?? id("task"),
      userId: props.userId,
      projectId,
      sprintId: String(data.get("sprintId") || "") || null,
      title,
      description: String(data.get("description") ?? ""),
      type: String(data.get("type")) as TaskType,
      status: String(data.get("status")) as Status,
      priority: String(data.get("priority")) as Priority,
      deadline: String(data.get("deadline") || "") || null,
      createdAt: task?.createdAt ?? now,
      updatedAt: now,
    });
  };
  return (
    <Modal title={task ? "Edit Task" : "New Task"} onClose={props.onClose}>
      <form onSubmit={submit}>
        <label className="field-label">Title</label>
        <input required name="title" className="field-input" defaultValue={task?.title} />
        <label className="field-label">Description</label>
        <textarea name="description" className="field-input min-h-24" defaultValue={task?.description} />
        <div className="grid gap-3 md:grid-cols-2">
          <SelectField name="projectId" label="Project" defaultValue={task?.projectId} options={props.projects.map((item) => [item.id, item.name])} />
          <SelectField name="sprintId" label="Sprint" defaultValue={task?.sprintId ?? ""} options={[["", "No sprint"], ...props.sprints.map((item) => [item.id, item.name])]} />
          <SelectField name="type" label="Type" defaultValue={task?.type ?? "FEATURE"} options={taskTypes.map((item) => [item, item])} />
          <SelectField name="status" label="Status" defaultValue={task?.status ?? "TODO"} options={statuses.map((item) => [item, statusLabel[item]])} />
          <SelectField name="priority" label="Priority" defaultValue={task?.priority ?? "MEDIUM"} options={priorities.map((item) => [item, item])} />
          <div>
            <label className="field-label">Deadline</label>
            <input name="deadline" type="date" className="field-input" defaultValue={dateInputValue(task?.deadline)} />
          </div>
        </div>
        <ModalActions onClose={props.onClose} />
      </form>
    </Modal>
  );
}

function ProjectModal({ userId, project, onClose, onSave }: { userId: string; project: Project | null; onClose: () => void; onSave: (project: Project) => void }) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    if (!name) return;
    const now = new Date().toISOString();
    onSave({
      id: project?.id ?? id("project"),
      userId,
      name,
      description: String(data.get("description") ?? ""),
      color: String(data.get("color") ?? colors[0]),
      isArchived: data.get("isArchived") === "on",
      createdAt: project?.createdAt ?? now,
      updatedAt: now,
    });
  };
  return (
    <Modal title={project ? "Edit Project" : "New Project"} onClose={onClose}>
      <form onSubmit={submit}>
        <label className="field-label">Name</label>
        <input required name="name" className="field-input" defaultValue={project?.name} />
        <label className="field-label">Description</label>
        <textarea name="description" className="field-input min-h-24" defaultValue={project?.description} />
        <label className="field-label">Color</label>
        <input name="color" type="color" className="mb-4 h-11 w-full rounded-lg border border-slate-200 bg-white p-1" defaultValue={project?.color ?? colors[0]} />
        <label className="mb-4 flex items-center gap-2 text-sm text-slate-600">
          <input name="isArchived" type="checkbox" defaultChecked={project?.isArchived} /> Archived
        </label>
        <ModalActions onClose={onClose} />
      </form>
    </Modal>
  );
}

function SprintModal({ userId, sprint, onClose, onSave }: { userId: string; sprint: Sprint | null; onClose: () => void; onSave: (sprint: Sprint) => void }) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    if (!name) return;
    const now = new Date().toISOString();
    onSave({
      id: sprint?.id ?? id("sprint"),
      userId,
      name,
      goal: String(data.get("goal") ?? ""),
      startDate: String(data.get("startDate") ?? today),
      endDate: String(data.get("endDate") ?? today),
      createdAt: sprint?.createdAt ?? now,
      updatedAt: now,
    });
  };
  return (
    <Modal title={sprint ? "Edit Sprint" : "New Sprint"} onClose={onClose}>
      <form onSubmit={submit}>
        <label className="field-label">Name</label>
        <input required name="name" className="field-input" defaultValue={sprint?.name} />
        <label className="field-label">Goal</label>
        <textarea name="goal" className="field-input min-h-24" defaultValue={sprint?.goal} />
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="field-label">Start date</label>
            <input required name="startDate" type="date" className="field-input" defaultValue={dateInputValue(sprint?.startDate) || today} />
          </div>
          <div>
            <label className="field-label">End date</label>
            <input required name="endDate" type="date" className="field-input" defaultValue={dateInputValue(sprint?.endDate) || offsetDate(7)} />
          </div>
        </div>
        <ModalActions onClose={onClose} />
      </form>
    </Modal>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-slate-950/35 p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-5 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button onClick={onClose} className="icon-button">x</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalActions({ onClose }: { onClose: () => void }) {
  return (
    <div className="mt-5 flex justify-end gap-2">
      <button type="button" onClick={onClose} className="secondary-button">
        Cancel
      </button>
      <button className="primary-button">Save</button>
    </div>
  );
}

function SelectField({ name, label, options, defaultValue }: { name: string; label: string; options: string[][]; defaultValue?: string }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      <select required={name !== "sprintId"} name={name} className="field-input" defaultValue={defaultValue}>
        {options.map(([value, labelText]) => (
          <option key={value} value={value}>
            {labelText}
          </option>
        ))}
      </select>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof CircleDot; label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 grid size-10 place-items-center rounded-lg bg-slate-100 text-slate-700">
        <Icon size={20} />
      </div>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Progress({ value }: { value: number }) {
  return (
    <div className="h-2.5 rounded-full bg-slate-100">
      <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

function Breakdown({ values }: { values: { label: string; value: number }[] }) {
  const max = Math.max(1, ...values.map((item) => item.value));
  return (
    <div className="space-y-3">
      {values.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-slate-600">{item.label}</span>
            <span className="font-medium">{item.value}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-slate-800" style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function TaskMiniList({ tasks, empty, setTaskModal }: { tasks: Task[]; empty: string; setTaskModal: (task: Task) => void }) {
  if (!tasks.length) return <EmptyState text={empty} />;
  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <button key={task.id} onClick={() => setTaskModal(task)} className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-100 p-3 text-left hover:bg-slate-50">
          <span className="text-sm font-medium">{task.title}</span>
          <span className={isOverdue(task) ? "text-xs font-semibold text-red-600" : "text-xs text-slate-500"}>{niceDate(task.deadline)}</span>
        </button>
      ))}
    </div>
  );
}

function TaskRows({ tasks }: { tasks: Task[] }) {
  if (!tasks.length) return <EmptyState text="No tasks yet." />;
  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <div key={task.id} className="flex flex-col gap-2 rounded-lg border border-slate-100 p-3 md:flex-row md:items-center md:justify-between">
          <span className="font-medium">{task.title}</span>
          <div className="flex gap-2">
            <Badge className={statusClass[task.status]}>{statusLabel[task.status]}</Badge>
            <Badge className={priorityClass[task.priority]}>{task.priority}</Badge>
          </div>
        </div>
      ))}
    </div>
  );
}

function Badge({ children, className }: { children: React.ReactNode; className: string }) {
  return <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ${className}`}>{children}</span>;
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
      <Sparkles className="mx-auto mb-2 text-slate-400" size={20} />
      {text}
    </div>
  );
}
