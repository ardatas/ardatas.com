import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  ChartNoAxesColumnIncreasing,
  Check,
  CircleDot,
  Clock3,
  Database,
  Layers,
  LogOut,
  Moon,
  Pause,
  Play,
  Plus,
  Square,
  Star,
  Sun,
  Tags,
  Timer,
} from "lucide-react";
import FlipClock from "@/components/ui/flip-clock";
import { DailyCalendar } from "./calendar";
import { Dialog, TagForm } from "./forms";
import {
  clockTime,
  dayStart,
  duration,
  elapsed,
  newSession,
  running,
  shiftDay,
  transition,
  type Notebook,
  type Session,
  type Tag,
} from "./model";
import { addTag, cloud, readNotebook, saveSession } from "./storage";
import "./style.css";

type Page = "Tracker" | "Overview" | "Tags";
const pages = { Tracker: Timer, Overview: ChartNoAxesColumnIncreasing, Tags };
const message = (error: unknown) =>
  error && typeof error === "object" && "message" in error
    ? String(error.message)
    : "Could not access your study data.";
const tagStyle = (tag: Tag) => ({ "--tag": tag.color }) as CSSProperties;
function Brand() {
  return (
    <div className="brand">
      <span className="brand-symbol">
        <BookOpen size={23} />
      </span>
      <strong>
        Track<span>.</span>
      </strong>
    </div>
  );
}
function Entry() {
  const [owner, setOwner] = useState<string | null | undefined>(undefined);
  const [notice, setNotice] = useState("");
  const [sending, setSending] = useState(false);
  useEffect(() => {
    const { data } = cloud.auth.onAuthStateChange((_, session) => {
      setOwner(session?.user.id ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  if (owner) return <Tracker key={owner} owner={owner} />;
  return (
    <main className="auth">
      <div className="panel">
        <Brand />
        <h1>Study tracker</h1>
        {owner === undefined ? (
          <p>Opening your notebook…</p>
        ) : (
          <form
            className="form"
            onSubmit={async (e) => {
              e.preventDefault();
              if (sending) return;
              const fields = new FormData(e.currentTarget);
              const username = String(fields.get("username"))
                .trim()
                .toLowerCase();
              const password = String(fields.get("password"));
              setSending(true);
              setNotice("");
              try {
                const { error } = await cloud.auth.signInWithPassword({
                  email: username + "@track.invalid",
                  password,
                });
                if (error)
                  setNotice(
                    error.status === 429
                      ? "Too many attempts. Try again later."
                      : "Could not sign in with those credentials.",
                  );
              } catch {
                setNotice("Could not reach the sign-in service. Try again.");
              } finally {
                setSending(false);
              }
            }}
          >
            <label>
              Username
              <input
                name="username"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={64}
                pattern="[A-Za-z0-9_\-]+"
                title="Use letters, numbers, underscores or hyphens."
                required
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </label>
            <button className="primary" disabled={sending}>
              {sending ? "Signing in…" : "Sign in"}
            </button>
            {notice && <p role="alert">{notice}</p>}
          </form>
        )}
      </div>
    </main>
  );
}
function Tracker({ owner }: { owner: string }) {
  const [data, setData] = useState<Notebook | null>(null);
  const [now, setNow] = useState(Date.now);
  const today = dayStart(now);
  const [selectedDay, setDay] = useState<number | null>(null);
  const [page, setPage] = useState<Page>("Tracker");
  const [modal, setModal] = useState<"start" | "tag" | "detail" | null>(null);
  const [detail, setDetail] = useState("");
  const [selectedTag, setTag] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const requestId = useRef(0);
  const [dark, setDark] = useState(
    document.documentElement.dataset.theme === "dark",
  );
  const refresh = useCallback(async () => {
    const id = ++requestId.current;
    const result = await readNotebook(owner);
    if (id === requestId.current) setData(result);
  }, [owner]);
  useEffect(() => {
    const load = () => {
      if (!document.hidden) refresh().catch((e) => setError(message(e)));
    };
    load();
    const tick = window.setInterval(() => setNow(Date.now()), 500);
    const poll = window.setInterval(load, 15000);
    window.addEventListener("focus", load);
    document.addEventListener("visibilitychange", load);
    return () => {
      ++requestId.current;
      clearInterval(tick);
      clearInterval(poll);
      window.removeEventListener("focus", load);
      document.removeEventListener("visibilitychange", load);
    };
  }, [refresh]);
  async function write(operation: () => Promise<unknown>, after: () => void) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      await operation();
      await refresh();
      setNow(Date.now());
      after();
    } catch (e) {
      setError(message(e));
      await refresh().catch(() => {});
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  function changeTheme() {
    const theme = dark ? "light" : "dark";
    document.documentElement.dataset.theme = theme;
    setDark(!dark);
    try {
      localStorage.setItem("track.theme", theme);
    } catch {}
  }
  const active = data?.sessions.find((s) => s.ended_at === null);
  const tagFor = (s: Session) => data!.tags.find((t) => t.id === s.tag_id)!;
  const state = active ? (running(active) ? "Running" : "Paused") : "Idle";
  const shown = data?.sessions.find((s) => s.id === detail);
  function openSession(s: Session) {
    setDetail(s.id);
    setModal("detail");
  }
  function navigate(p: Page) {
    setPage(p);
    setModal(null);
  }
  function openStart(tag?: Tag) {
    setTag(tag?.id ?? data!.tags[0].id);
    setModal("start");
  }
  function change(action: "pause" | "resume" | "stop") {
    if (active)
      void write(
        () =>
          saveSession(owner, transition(active, action, Date.now()), active),
        () => {
          if (action === "stop") openSession(active);
        },
      );
  }
  const err = error && (
    <div className="error" role="alert">
      {error}
      <button
        onClick={() => {
          setError("");
          void refresh().catch((e) => setError(message(e)));
        }}
      >
        Retry
      </button>
    </div>
  );
  return (
    <div className="layout">
      <aside className="sidebar">
        <Brand />
        <div className="nav-section">Workspace</div>
        <nav aria-label="Workspace">
          {(Object.keys(pages) as Page[]).map((p) => {
            const Icon = pages[p];
            return (
              <button
                key={p}
                className={page === p ? "selected" : ""}
                aria-current={page === p ? "page" : undefined}
                onClick={() => navigate(p)}
              >
                <Icon />
                {p === "Tracker" ? "Study tracker" : p}
              </button>
            );
          })}
        </nav>
        <div className="side-tags">
          <div className="nav-section">
            My tags
            <button
              className="icon"
              aria-label="Create tag"
              disabled={!data}
              onClick={() => setModal("tag")}
            >
              <Plus />
            </button>
          </div>
          {data?.tags.map((t) => (
            <button
              className="side-tag"
              key={t.id}
              onClick={() => {
                if (active) navigate("Tags");
                else openStart(t);
              }}
            >
              <i style={{ background: t.color }} />
              {t.name}
            </button>
          ))}
        </div>
        <div className="side-foot">
          <button className="theme" onClick={changeTheme}>
            {dark ? <Sun /> : <Moon />}
            {dark ? "Light mode" : "Dark mode"}
          </button>
          <div className="storage">
            <Database />
            Private cloud
            <button
              className="icon"
              aria-label="Sign out"
              onClick={() =>
                cloud.auth.signOut({ scope: "local" }).then(({ error }) => {
                  if (error) setError(error.message);
                })
              }
            >
              <LogOut />
            </button>
          </div>
        </div>
      </aside>
      <main className="workspace">
        <header className="topbar">
          <span>
            Workspace <b>/</b>{" "}
            <strong>{page === "Tracker" ? "Study tracker" : page}</strong>
          </span>
          <a href="https://ardatas.com">
            ardatas.com <ArrowUpRight size={14} />
          </a>
        </header>
        <div className="content">
          <div className="page-heading">
            <div className="date-label">
              {new Date(now).toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </div>
            <h1>{page === "Tracker" ? "Study tracker" : page}</h1>
          </div>
          {!modal && err}
          {!data ? (
            <p role="status">Opening your notebook…</p>
          ) : (
            <>
              {page === "Tracker" && (
                <>
                  <div className="top-grid">
                    <section className="panel timer-panel">
                      <div className="panel-heading">
                        <h2>
                          <Timer />
                          Session timer
                        </h2>
                        <span className={"status " + state.toLowerCase()}>
                          <i />
                          {state}
                        </span>
                      </div>
                      <div className="clock-face">
                        <FlipClock
                          elapsedMs={active ? elapsed(active, now) : 0}
                        />
                      </div>
                      <div className="timer-actions">
                        {active ? (
                          <>
                            <span className="active-tag">
                              {tagFor(active).emoji} {tagFor(active).name}
                            </span>
                            <button
                              disabled={busy}
                              onClick={() =>
                                change(running(active) ? "pause" : "resume")
                              }
                            >
                              {running(active) ? <Pause /> : <Play />}
                              {running(active) ? "Pause" : "Resume"}
                            </button>
                            <button
                              disabled={busy}
                              onClick={() => change("stop")}
                            >
                              <Square />
                              Stop
                            </button>
                          </>
                        ) : (
                          <button
                            className="primary"
                            onClick={() => openStart()}
                          >
                            <Play size={14} />
                            Start session
                          </button>
                        )}
                      </div>
                    </section>
                    <Stats data={data} now={now} day={today} />
                  </div>
                  <DailyCalendar
                    data={data}
                    now={now}
                    day={selectedDay ?? today}
                    onDay={(d) => setDay(d === today ? null : d)}
                    onSession={openSession}
                  />
                </>
              )}
              {page === "Tags" && (
                <section className="panel">
                  <div className="panel-heading">
                    <h2>
                      <Tags />
                      My tags
                    </h2>
                    <button className="primary" onClick={() => setModal("tag")}>
                      <Plus />
                      New tag
                    </button>
                  </div>
                  <div className="tag-list">
                    {data.tags.map((t) => (
                      <div className="tag-row" key={t.id}>
                        <span className="tag-tile" style={tagStyle(t)}>
                          {t.emoji}
                        </span>
                        <b>{t.name}</b>
                        <span
                          className="tag-dot"
                          style={{ background: t.color }}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {page === "Overview" && (
                <>
                  <Stats data={data} now={now} />
                  <section className="panel">
                    <div className="panel-heading">
                      <h2>
                        <Layers />
                        Study blocks
                      </h2>
                    </div>
                    {data.sessions.length === 0 ? (
                      <p className="empty">
                        Your study blocks will appear here after you start a
                        session.
                      </p>
                    ) : (
                      <div className="history">
                        {[...data.sessions]
                          .sort((a, b) => b.started_at - a.started_at)
                          .map((s) => (
                            <button key={s.id} onClick={() => openSession(s)}>
                              <span
                                className="tag-tile"
                                style={tagStyle(tagFor(s))}
                              >
                                {tagFor(s).emoji}
                              </span>
                              <span>
                                <b>{tagFor(s).name}</b>
                                <small>
                                  {new Date(s.started_at).toLocaleDateString(
                                    "en-GB",
                                  )}{" "}
                                  · {clockTime(s.started_at)}
                                </small>
                              </span>
                              <span className="hist-time">
                                {duration(elapsed(s, now))}
                                <small>
                                  {s.ended_at === null
                                    ? "Open"
                                    : s.rating
                                      ? s.rating + "/5"
                                      : "Unrated"}
                                </small>
                              </span>
                            </button>
                          ))}
                      </div>
                    )}
                  </section>
                </>
              )}
            </>
          )}
        </div>
      </main>
      {modal && data && (
        <Dialog
          title={
            modal === "start"
              ? "Start a session"
              : modal === "tag"
                ? "Create a tag"
                : "Study block"
          }
          close={() => {
            if (!busy) setModal(null);
          }}
        >
          {err}
          {modal === "tag" && (
            <TagForm
              busy={busy}
              submit={(tag) =>
                void write(
                  () => addTag(owner, tag),
                  () => {
                    setTag(tag.id);
                    setModal(page === "Tracker" && !active ? "start" : null);
                  },
                )
              }
            />
          )}
          {modal === "start" && (
            <div className="form">
              <fieldset>
                <legend>Study tag</legend>
                <div className="tag-options">
                  {data.tags.map((t) => (
                    <button
                      key={t.id}
                      aria-pressed={selectedTag === t.id}
                      onClick={() => setTag(t.id)}
                    >
                      <span className="tag-tile" style={tagStyle(t)}>
                        {t.emoji}
                      </span>
                      {t.name}
                      {selectedTag === t.id && <Check />}
                    </button>
                  ))}
                </div>
              </fieldset>
              <button onClick={() => setModal("tag")}>
                <Plus />
                Create a tag
              </button>
              <button
                className="primary"
                disabled={busy || !!active}
                onClick={() =>
                  void write(
                    () =>
                      saveSession(
                        owner,
                        newSession(
                          data.tags.find((t) => t.id === selectedTag)!,
                          Date.now(),
                        ),
                      ),
                    () => {
                      setDay(null);
                      navigate("Tracker");
                    },
                  )
                }
              >
                <Play />
                Start timer
              </button>
            </div>
          )}
          {modal === "detail" && shown && (
            <div className="form">
              <div className="detail-tag">
                <span className="tag-tile" style={tagStyle(tagFor(shown))}>
                  {tagFor(shown).emoji}
                </span>
                <b>{tagFor(shown).name}</b>
              </div>
              <p>
                {new Date(shown.started_at).toLocaleDateString("en-GB")} ·{" "}
                {clockTime(shown.started_at)}–
                {shown.ended_at === null ? "open" : clockTime(shown.ended_at)} ·{" "}
                {duration(elapsed(shown, now))} studied
              </p>
              {shown.ended_at !== null && (
                <fieldset>
                  <legend>Productivity</legend>
                  <div className="ratings">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        aria-label={n + " out of 5"}
                        aria-pressed={shown.rating === n}
                        disabled={busy}
                        onClick={() =>
                          void write(
                            () =>
                              saveSession(
                                owner,
                                {
                                  ...shown,
                                  rating: n,
                                  revision: shown.revision + 1,
                                },
                                shown,
                              ),
                            () => setModal(null),
                          )
                        }
                      >
                        {n}
                        <Star size={13} />
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}
            </div>
          )}
        </Dialog>
      )}
    </div>
  );
}
function Stats({
  data,
  now,
  day,
}: {
  data: Notebook;
  now: number;
  day?: number;
}) {
  const end = day === undefined ? undefined : shiftDay(day, 1);
  const sessions = data.sessions.filter(
    (s) =>
      day === undefined ||
      s.intervals.some(
        (i) =>
          i.start < end! &&
          (i.end ?? now) >= day &&
          (i.start >= day || (i.end ?? now) > day),
      ),
  );
  const total = sessions.reduce((sum, s) => sum + elapsed(s, now, day, end), 0);
  const rated = sessions.flatMap((s) => (s.rating === null ? [] : [s.rating]));
  const metrics = [
    { Icon: Clock3, label: "Study time", value: duration(total) },
    { Icon: Layers, label: "Study blocks", value: sessions.length },
    {
      Icon: CircleDot,
      label: "Productivity",
      value: rated.length
        ? (rated.reduce((a, b) => a + b, 0) / rated.length).toFixed(1) + "/5"
        : "—",
    },
  ];
  return (
    <section className="panel stats">
      <div className="panel-heading">
        <h2>
          <Activity />
          {day !== undefined ? "Today so far" : "All time"}
        </h2>
      </div>
      <dl>
        {metrics.map(({ Icon, label, value }) => (
          <div key={label}>
            <dt>
              <Icon />
              {label}
            </dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
const systemTheme = matchMedia("(prefers-color-scheme: dark)").matches
  ? "dark"
  : "light";
document.documentElement.dataset.theme = systemTheme;
try {
  const saved = localStorage.getItem("track.theme");
  if (saved === "dark" || saved === "light")
    document.documentElement.dataset.theme = saved;
} catch {
  // The system theme also works when browser storage is unavailable.
}
createRoot(document.getElementById("root")!).render(<Entry />);
