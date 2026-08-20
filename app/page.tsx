"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import NeedsAnalysisView from "./components/analysis/NeedsAnalysisView";

type View = "inicio" | "prospectos" | "crm" | "agenda" | "campanas" | "analisis" | "calculadoras" | "reportes" | "base";
type AuthorizedProfile = { displayName: string; initials: string };
type AuthState =
  | { status: "checking" | "guest"; user?: undefined; message?: undefined }
  | { status: "authorized"; user: AuthorizedProfile; message?: undefined }
  | { status: "denied" | "error"; user?: undefined; message: string };

const privateViews = new Set<View>([
  "inicio",
  "prospectos",
  "crm",
  "agenda",
  "campanas",
  "analisis",
  "calculadoras",
  "reportes",
  "base",
]);

const features = [
  { icon: "✦", title: "Entrevista inteligente guiada", text: "Escucha el relato, extrae únicamente hechos explícitos y propone la próxima pregunta sin decidir por el agente.", points: ["Dictado en español", "Revisión humana", "Preguntas adaptativas"] },
  { icon: "⌁", title: "Motor híbrido y explicable", text: "Combina interpretación estructurada con reglas verificables para convertir datos en próximos pasos comprensibles.", points: ["Hechos trazables", "Alertas visibles", "Sin producto inventado"] },
  { icon: "▤", title: "Laboratorio de escenarios", text: "Compara supuestos para la misma familia con el motor real, sin guardar simulaciones ni convertirlas en cotizaciones.", points: ["Supuestos ajustables", "Cambios comparados", "Revisión antes de guardar"] },
];

const calculators = [
  ["Retiro", "Proyección de ingresos y ahorro futuro"],
  ["Protección familiar", "Estimación de la necesidad de seguro de vida"],
  ["Fondo de emergencia", "Reserva recomendada según gastos mensuales"],
  ["Educación", "Planificación de estudios y aportes periódicos"],
  ["Libertad hipotecaria", "Escenarios para acelerar el pago de la vivienda"],
  ["Conversión Roth", "Comparación educativa de escenarios fiscales"],
];

function Logo({ light = false, animate = false, compact = false }: { light?: boolean; animate?: boolean; compact?: boolean }) {
  return (
    <div
      className={`brand brand-official${light ? " brand-light" : ""}${animate ? " brand-animate" : ""}${compact ? " brand-compact" : ""}`}
      role="img"
      aria-label="NexoÁureo"
    >
      <span className="brand-symbol" aria-hidden="true">
        <Image src="/brand/nexoaureo-mark.png" alt="" width={352} height={350} priority={animate} />
      </span>
      {!compact && <Image className="brand-wordmark" src="/brand/nexoaureo-wordmark.png" alt="" width={1300} height={225} priority={animate} />}
    </div>
  );
}

export default function Home() {
  const [mode, setMode] = useState<"landing" | "app">("landing");
  const [modal, setModal] = useState(false);
  const [view, setView] = useState<View>("inicio");
  const [pendingView, setPendingView] = useState<View>("inicio");
  const [auth, setAuth] = useState<AuthState>({ status: "checking" });
  const [income, setIncome] = useState(6200);
  const [expenses, setExpenses] = useState(4100);
  const [years, setYears] = useState(22);
  const projection = useMemo(() => { const monthly = Math.max(0, income - expenses); return { monthly, future: monthly * 12 * years * 1.42 }; }, [income, expenses, years]);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(window.location.search);
    const wantsApp = params.get("app") === "1";
    const requestedView = params.get("view") as View | null;

    fetch("/api/auth/session", {
      cache: "no-store",
      credentials: "include",
    })
      .then(async (response) => {
        const body = await response.json() as {
          authenticated?: boolean;
          user?: AuthorizedProfile;
          error?: string;
        };
        if (!active) return;

        if (response.ok && body.authenticated && body.user) {
          setAuth({ status: "authorized", user: body.user });
          if (wantsApp) {
            const nextView = requestedView && privateViews.has(requestedView)
              ? requestedView
              : "inicio";
            setView(nextView);
            setMode("app");
            window.scrollTo({ top: 0 });
          }
          return;
        }

        if (response.status === 401) {
          setAuth({ status: "guest" });
        } else if (response.status === 403) {
          setAuth({
            status: "denied",
            message: body.error || "Esta cuenta no está autorizada.",
          });
        } else {
          setAuth({
            status: "error",
            message: body.error || "El acceso privado no está disponible.",
          });
        }
        if (wantsApp) setModal(true);
      })
      .catch(() => {
        if (!active) return;
        setAuth({
          status: "error",
          message: "No fue posible verificar la sesión. Inténtalo de nuevo.",
        });
        if (wantsApp) setModal(true);
      })
      .finally(() => {
        if (!active || !wantsApp) return;
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete("app");
        cleanUrl.searchParams.delete("view");
        window.history.replaceState({}, "", `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`);
      });

    return () => { active = false; };
  }, []);

  const openPrivateSpace = (target: View = "inicio") => {
    setPendingView(target);
    if (auth.status === "authorized") {
      setModal(false);
      setMode("app");
      setView(target);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setModal(true);
  };

  const signInReturnTo = `/?app=1&view=${pendingView}`;
  const signInHref = `/signin-with-chatgpt?return_to=${encodeURIComponent(signInReturnTo)}`;
  const signedInUser = auth.status === "authorized"
    ? auth.user
    : { displayName: "Usuario autorizado", initials: "NA" };
  const firstName = signedInUser.displayName.split(/\s+/)[0] || "William";

  if (mode === "app") {
    return <main className="app-shell">
      <FutureBackdrop variant="app" />
      <aside className="sidebar">
        <Logo light /><div className="workspace-tag"><i /> NEXOÁUREO · INTELLIGENCE</div>
        <nav aria-label="Navegación de la aplicación">
          <SideButton active={view === "inicio"} label="Resumen" icon="⌂" onClick={() => setView("inicio")} />
          <SideButton active={view === "prospectos"} label="Prospectos" icon="＋" onClick={() => setView("prospectos")} />
          <SideButton active={view === "crm"} label="CRM y seguimiento" icon="⌘" onClick={() => setView("crm")} />
          <SideButton active={view === "agenda"} label="Agenda" icon="□" onClick={() => setView("agenda")} />
          <SideButton active={view === "campanas"} label="Campañas" icon="✦" onClick={() => setView("campanas")} />
          <SideButton active={view === "analisis"} label="Entrevista privada" icon="◎" onClick={() => setView("analisis")} />
          <SideButton active={view === "calculadoras"} label="Calculadoras" icon="∑" onClick={() => setView("calculadoras")} />
          <SideButton active={view === "reportes"} label="Reportes" icon="▤" onClick={() => setView("reportes")} />
          <SideButton active={view === "base"} label="Base verificada" icon="✓" onClick={() => setView("base")} />
        </nav>
        <div className="sidebar-help"><span>?</span><div><strong>Centro de ayuda</strong><small>Guías en español</small></div></div>
        <button className="back-site" onClick={() => setMode("landing")}>← Volver al sitio</button>
      </aside>
      <section className="app-main">
        <header className="app-header"><div><span className="eyebrow-dark">Licencia 2-15 emitida · nombramiento pendiente</span><h1>{view === "inicio" ? `Buenos días, ${firstName}` : viewTitles[view]}</h1></div><div className="header-actions"><div className="system-status"><i /> Sesión segura · motor activo</div><button className="icon-button" aria-label="Notificaciones">◌<b>3</b></button><div className="user-chip"><span>{signedInUser.initials}</span><div><strong>{signedInUser.displayName}</strong><small>Cuenta autorizada</small></div></div><a className="logout-button" href="/signout-with-chatgpt?return_to=%2F">Cerrar sesión</a></div></header>
        <div className="app-content">
          {view === "inicio" && <Dashboard onNavigate={setView} />}
          {view === "prospectos" && <Prospects />}
          {view === "crm" && <CrmPipeline />}
          {view === "agenda" && <Agenda />}
          {view === "campanas" && <Campaigns />}
          {view === "analisis" && <NeedsAnalysisView />}
          {view === "calculadoras" && <Calculator income={income} expenses={expenses} years={years} setIncome={setIncome} setExpenses={setExpenses} setYears={setYears} monthly={projection.monthly} future={projection.future} />}
          {view === "reportes" && <Reports />}
          {view === "base" && <KnowledgeBase />}
        </div>
      </section>
      <nav className="mobile-app-nav" aria-label="Navegación móvil"><SideButton active={view === "inicio"} label="Inicio" icon="⌂" onClick={() => setView("inicio")} /><SideButton active={view === "crm" || view === "prospectos"} label="CRM" icon="⌘" onClick={() => setView("crm")} /><SideButton active={view === "agenda"} label="Agenda" icon="□" onClick={() => setView("agenda")} /><SideButton active={view === "analisis"} label="Entrevista" icon="◎" onClick={() => setView("analisis")} /></nav>
    </main>;
  }

  return <main className="site-shell">
    <FutureBackdrop variant="site" />
    <header className="site-header"><Logo animate /><nav aria-label="Navegación principal"><a href="#plataforma">Plataforma</a><a href="#herramientas">Herramientas</a><a href="#metodo">Método</a><a href="#seguridad">Seguridad</a></nav><div className="nav-actions"><button className="text-button" onClick={() => openPrivateSpace("inicio")}>{auth.status === "authorized" ? "Continuar sesión" : "Iniciar sesión"}</button><button className="primary-button small" onClick={() => openPrivateSpace("inicio")}>Comenzar</button></div></header>
    <section className="hero">
      <div className="hero-copy"><div className="eyebrow"><span /> Inteligencia verificable · nueva generación</div><h1>De una conversación a una <em>dirección inteligente.</em></h1><p>NexoÁureo escucha, estructura y contrasta situaciones familiares con reglas visibles para orientar el próximo paso sin sustituir el criterio profesional.</p><div className="hero-actions"><button className="primary-button" onClick={() => openPrivateSpace("inicio")}>Entrar al núcleo <span>→</span></button><a className="secondary-button" href="#plataforma"><span>▶</span> Descubrir el sistema</a></div><div className="trust-line"><span>✓ Revisión humana</span><span>✓ Privacidad por diseño</span><span>✓ Español de principio a fin</span></div></div>
      <HeroPanel />
    </section>
    <section className="metrics" aria-label="Resumen de capacidades"><div><strong>5</strong><span>etapas verificables</span></div><div><strong>2</strong><span>motores coordinados</span></div><div><strong>1</strong><span>laboratorio privado</span></div><div><strong>100%</strong><span>experiencia en español</span></div></section>
    <section className="section light-section" id="plataforma"><SectionTitle eyebrow="UNA SOLA VISIÓN" title="De la primera conversación al próximo paso" text="Un flujo coherente para descubrir necesidades, explicar escenarios y acompañar decisiones importantes." /><div className="feature-grid">{features.map((feature) => <article className="feature-card" key={feature.title}><span className="feature-icon">{feature.icon}</span><h3>{feature.title}</h3><p>{feature.text}</p><ul>{feature.points.map((point) => <li key={point}>✓ {point}</li>)}</ul></article>)}</div></section>
    <section className="section tools-section" id="herramientas"><div className="tools-heading"><SectionTitle eyebrow="HERRAMIENTAS CON PROPÓSITO" title="Calcula menos. Comprende más." text="Cada herramienta convierte variables complejas en una conversación clara y visual." align="left" /><button className="secondary-button dark" onClick={() => openPrivateSpace("calculadoras")}>Abrir calculadoras →</button></div><div className="calculator-grid">{calculators.map(([title, text], index) => <button className="calculator-card" key={title} onClick={() => openPrivateSpace("calculadoras")}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{title}</strong><small>{text}</small></div><b>↗</b></button>)}</div></section>
    <section className="section method-section" id="metodo"><div className="method-visual"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="core-mark"><Logo light compact /><small>Visión integral</small></div><div className="orbit-note note-one"><b>01</b> Descubrir</div><div className="orbit-note note-two"><b>02</b> Analizar</div><div className="orbit-note note-three"><b>03</b> Acompañar</div></div><div className="method-copy"><span className="eyebrow-dark gold">UN MÉTODO HUMANO</span><h2>Los números importan.<br />La historia detrás de ellos, más.</h2><p>NexoÁureo organiza la información sin convertir a la familia en una hoja de cálculo. Cada orientación comienza con objetivos, prioridades y capacidad real.</p><div className="method-list"><div><b>01</b><span><strong>Descubre</strong><small>Haz las preguntas correctas y escucha antes de calcular.</small></span></div><div><b>02</b><span><strong>Modela escenarios</strong><small>Compara caminos con supuestos visibles y ajustables.</small></span></div><div><b>03</b><span><strong>Define el siguiente paso</strong><small>Convierte el análisis en acciones concretas y medibles.</small></span></div></div></div></section>
    <section className="security-strip" id="seguridad"><div><span className="shield">◇</span><p><small>DISEÑADA CON RESPONSABILIDAD</small><strong>Una experiencia clara para información importante</strong></p></div><div className="security-items"><span>◉ Acceso protegido</span><span>⌁ Privacidad por diseño</span><span>✓ Controles de sesión</span></div></section>
    <section className="closing-section"><div className="closing-orb" /><span className="eyebrow-dark gold">TU PRÓXIMA CONVERSACIÓN EMPIEZA AQUÍ</span><h2>Planificar el futuro puede sentirse más claro.</h2><p>Abre tu espacio profesional privado y acompaña decisiones financieras con un método verificable.</p><button className="primary-button gold-button" onClick={() => openPrivateSpace("inicio")}>Entrar al espacio privado →</button></section>
    <footer><Logo light /><p>Herramientas educativas para profesionales financieros.</p><div><a href="#plataforma">Plataforma</a><a href="#seguridad">Privacidad</a><span>© 2026 NexoÁureo</span></div></footer>
    {modal && <div className="modal-backdrop" role="presentation" onMouseDown={() => setModal(false)}><div className="login-modal secure-login-modal" role="dialog" aria-modal="true" aria-labelledby="access-title" onMouseDown={(e) => e.stopPropagation()}><button className="modal-close" aria-label="Cerrar" onClick={() => setModal(false)}>×</button><Logo /><div className="secure-access-icon" aria-hidden="true">◇</div><h2 id="access-title">Acceso privado de William</h2><p>El sitio informativo permanece público. El CRM, las entrevistas, el historial y las herramientas internas requieren la cuenta autorizada.</p>{(auth.status === "denied" || auth.status === "error") && <div className="access-alert" role="alert">{auth.message}</div>}{auth.status === "authorized" ? <button className="primary-button login-submit secure-login-action" type="button" onClick={() => openPrivateSpace(pendingView)}>Abrir espacio protegido</button> : <a className="primary-button login-submit secure-login-action" href={signInHref}>Continuar con ChatGPT</a>}<div className="secure-access-points"><span>✓ Identidad administrada por la plataforma</span><span>✓ Solo la cuenta autorizada</span><span>✓ API y datos bloqueados en el servidor</span></div><small className="demo-note">NexoÁureo no recibe ni guarda tu contraseña. Safari puede ofrecer Face ID cuando la cuenta dispone de una passkey.</small></div></div>}
  </main>;
}

const viewTitles: Record<View, string> = { inicio: "Resumen", prospectos: "Captación de prospectos", crm: "CRM y seguimiento", agenda: "Agenda y tareas", campanas: "Campañas educativas", analisis: "Entrevista y dirección", calculadoras: "Calculadoras", reportes: "Reportes", base: "Base verificada" };
function SideButton({ active, label, icon, onClick }: { active: boolean; label: string; icon: string; onClick: () => void }) { return <button className={active ? "active" : ""} onClick={onClick}><span>{icon}</span>{label}</button>; }
function SectionTitle({ eyebrow, title, text, align = "center" }: { eyebrow: string; title: string; text: string; align?: "left" | "center" }) { return <div className={`section-title ${align}`}><span>{eyebrow}</span><h2>{title}</h2><p>{text}</p></div>; }

function FutureBackdrop({ variant }: { variant: "site" | "app" }) {
  return <div className={`future-backdrop future-backdrop--${variant}`} aria-hidden="true"><span /><span /><span /><i /><i /></div>;
}

function HeroPanel() {
  return <div className="hero-panel-wrap"><div className="hero-glow" /><div className="hero-orbit" /><div className="hero-panel"><div className="panel-scan" /><div className="mini-sidebar"><span className="mini-logo" aria-hidden="true"><Image src="/brand/nexoaureo-mark.png" alt="" width={352} height={350} /></span><i /><i /><i /><i /><b /></div><div className="panel-main"><div className="panel-top"><div><small>RESUMEN DEL CLIENTE</small><strong>Familia Rivera</strong></div><em className="panel-live"><i /> MOTOR ACTIVO</em><span>WP</span></div><div className="health-card"><div><small>ÍNDICE DE PREPARACIÓN</small><strong>82</strong><span>de 100</span></div><div className="score-ring"><b>82%</b></div></div><div className="panel-stats"><div><small>Protección</small><strong>74%</strong><i style={{ width: "74%" }} /></div><div><small>Retiro</small><strong>68%</strong><i style={{ width: "68%" }} /></div></div><div className="opportunity-card"><span>✦</span><div><small>PRÓXIMA PRIORIDAD</small><strong>Fortalecer el fondo de emergencia</strong></div><b>→</b></div></div></div><div className="floating-card float-one"><span>✓</span><div><small>Análisis completado</small><strong>12 de 12 etapas</strong></div></div><div className="floating-card float-two"><span>↗</span><div><small>Meta proyectada</small><strong>$1.28 M</strong></div></div></div>;
}

function Dashboard({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { data, loading, error } = useCommercialOverview();
  return <>
    <section className="welcome-card"><div className="welcome-scan" aria-hidden="true" /><div><span>NÚCLEO OPERATIVO · SEPARACIÓN ACTIVA</span><h2>De cada contacto, un próximo paso claro.</h2><p>Organiza prospectos, tareas y citas sin mezclar la información comercial con la entrevista privada.</p></div><button onClick={() => onNavigate("prospectos")}>+ Nuevo prospecto</button></section>
    {error && <InlineError message={error} />}
    <div className="stat-grid">
      <Stat label="Prospectos" value={loading ? "—" : String(data?.metrics.totalProspects ?? 0)} note="Con consentimiento" tone="green" />
      <Stat label="Tareas pendientes" value={loading ? "—" : String(data?.metrics.pendingTasks ?? 0)} note="Seguimientos activos" tone="gold" />
      <Stat label="Próximas citas" value={loading ? "—" : String(data?.metrics.upcomingAppointments ?? 0)} note="Recordatorios en borrador" tone="blue" />
      <Stat label="Campañas" value={loading ? "—" : String(data?.metrics.draftCampaigns ?? 0)} note="Sin envío automático" tone="purple" />
    </div>
    <div className="dashboard-grid">
      <section className="app-card recent-card"><div className="card-heading"><div><span>RELACIONES RECIENTES</span><h3>Prospectos y próximos pasos</h3></div><button onClick={() => onNavigate("crm")}>Abrir CRM</button></div>{data?.prospects.slice(0, 4).map((prospect) => <ProspectRow prospect={prospect} key={prospect.id} />)}{!loading && !data?.prospects.length && <EmptyLine text="Todavía no hay prospectos guardados." />}</section>
      <section className="app-card priorities-card"><div className="card-heading"><div><span>ENFOQUE</span><h3>Tareas próximas</h3></div><b>{data?.tasks.filter((task) => task.status === "pendiente").length ?? 0}</b></div>{data?.tasks.filter((task) => task.status === "pendiente").slice(0, 4).map((task) => <div className={`priority ${task.priority === "alta" ? "high" : "medium"}`} key={task.id}><i /><div><strong>{task.title}</strong><small>{formatDate(task.dueAt)}</small></div><span>→</span></div>)}{!loading && !data?.tasks.some((task) => task.status === "pendiente") && <EmptyLine text="No hay tareas pendientes." />}</section>
    </div>
    <section className="quick-tools"><div><span>ACCESO RÁPIDO</span><h3>Tu sistema comercial</h3></div>{[["＋","Captar prospecto","prospectos"],["⌘","Mover en CRM","crm"],["□","Programar cita","agenda"],["✦","Crear campaña","campanas"]].map(([icon,label,target]) => <button key={label} onClick={() => onNavigate(target as View)}><b>{icon}</b><span>{label}<small>Abrir herramienta →</small></span></button>)}</section>
  </>;
}

function Stat({ label, value, note, tone }: { label: string; value: string; note: string; tone: string }) { return <article className="stat-card"><span className={`stat-icon ${tone}`}>◇</span><div><small>{label}</small><strong>{value}</strong><p>{note}</p></div></article>; }

type Prospect = { id: string; fullName: string; preferredLanguage: string; preferredChannel: string; contactPreview: string; interest: string; source: string; status: string; consentVersion: string; consentAt: string; notes: string; nextActionAt: string | null; createdAt: string; updatedAt: string };
type FollowUpTask = { id: string; prospectId: string | null; title: string; dueAt: string; priority: string; status: string };
type Appointment = { id: string; prospectId: string | null; attendeeReference: string; startsAt: string; durationMinutes: number; mode: string; status: string; reminderStatus: string; notes: string };
type Campaign = { id: string; name: string; topic: string; audience: string; channel: string; status: string; subject: string; content: string; disclaimer: string; updatedAt: string };
type CommercialOverview = { prospects: Prospect[]; tasks: FollowUpTask[]; appointments: Appointment[]; campaigns: Campaign[]; metrics: { totalProspects: number; pendingTasks: number; upcomingAppointments: number; draftCampaigns: number }; controls: { consentVersion: string; automaticSendingEnabled: boolean; productPromotionEnabled: boolean; appointmentRequired: boolean } };

const stageMeta: Record<string, { label: string; tone: string }> = {
  nuevo: { label: "Nuevo", tone: "emerald" }, contactado: { label: "Contactado", tone: "blue" }, cita: { label: "Cita", tone: "gold" }, entrevista: { label: "Entrevista", tone: "purple" }, seguimiento: { label: "Seguimiento", tone: "blue" }, cliente: { label: "Cliente", tone: "emerald" }, no_continuar: { label: "No continuar", tone: "muted" },
};
const interestLabels: Record<string, string> = { vida: "Protección de vida", salud: "Salud", retiro: "Retiro", gastos_finales: "Gastos finales", educacion: "Educación", general: "Orientación general" };

function useCommercialOverview() {
  const [data, setData] = useState<CommercialOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => { let active = true; fetch("/api/commercial").then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error); return body as CommercialOverview; }).then((body) => { if (active) setData(body); }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "No fue posible cargar el espacio comercial."); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, []);
  return { data, setData, loading, error, setError };
}

async function commercialAction(payload: Record<string, unknown>) {
  const response = await fetch("/api/commercial", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "No fue posible guardar el cambio.");
  return body.overview as CommercialOverview;
}

function formatDate(value: string) { return new Intl.DateTimeFormat("es-US", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(value)); }
function initials(name: string) { return name.replace("Demostración · ", "").split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(); }
function InlineError({ message }: { message: string }) { return <div className="commercial-error">{message}</div>; }
function EmptyLine({ text }: { text: string }) { return <div className="commercial-empty"><span>◇</span><p>{text}</p></div>; }
function LoadingCard() { return <div className="app-card commercial-loading"><span /><span /><span /></div>; }

function ProspectRow({ prospect }: { prospect: Prospect }) {
  const meta = stageMeta[prospect.status] || stageMeta.nuevo;
  return <div className="prospect-row"><span className={`avatar ${meta.tone}`}>{initials(prospect.fullName)}</span><div><strong>{prospect.fullName}</strong><small>{interestLabels[prospect.interest] || prospect.interest} · {prospect.source}</small></div><p><span>{prospect.preferredLanguage.toUpperCase()}</span>{prospect.contactPreview}</p><em className={`stage-pill ${meta.tone}`}>{meta.label}</em></div>;
}

function Prospects() {
  const { data, setData, loading, error, setError } = useCommercialOverview();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ fullName: "", preferredLanguage: "es", preferredChannel: "telefono", contactValue: "", interest: "vida", source: "Web educativa", notes: "", nextActionAt: "", consent: false });
  const update = (key: keyof typeof form, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event: FormEvent) => { event.preventDefault(); setSaving(true); setError(""); try { const overview = await commercialAction({ action: "create_prospect", ...form }); setData(overview); setShowForm(false); setForm({ fullName: "", preferredLanguage: "es", preferredChannel: "telefono", contactValue: "", interest: "vida", source: "Web educativa", notes: "", nextActionAt: "", consent: false }); } catch (cause) { setError(cause instanceof Error ? cause.message : "No fue posible guardar el prospecto."); } finally { setSaving(false); } };
  if (loading) return <LoadingCard />;
  return <div className="commercial-page">
    <section className="commercial-hero"><div><span>CAPTACIÓN CON CONSENTIMIENTO</span><h2>Una entrada sencilla. Una relación bien cuidada.</h2><p>Registra solamente información de contacto y propósito general. La entrevista financiera y de salud permanece en el espacio privado.</p></div><button onClick={() => setShowForm((value) => !value)}>{showForm ? "Cerrar formulario" : "+ Nuevo prospecto"}</button></section>
    <div className="control-ribbon"><span>✓ Consentimiento versionado</span><span>◉ Contacto enmascarado</span><span>⊘ Sin datos médicos</span><span>□ Preparado para conectar con tu web</span></div>
    {error && <InlineError message={error} />}
    {showForm && <form className="app-card commercial-form" onSubmit={submit}><div className="form-title"><div><span>NUEVO REGISTRO</span><h3>Información comercial mínima</h3></div><b>Privacidad por diseño</b></div><div className="commercial-fields"><label>Nombre o referencia<input value={form.fullName} onChange={(e) => update("fullName", e.target.value)} required /></label><label>Interés<select value={form.interest} onChange={(e) => update("interest", e.target.value)}><option value="vida">Protección de vida</option><option value="salud">Salud</option><option value="retiro">Retiro</option><option value="gastos_finales">Gastos finales</option><option value="educacion">Educación</option><option value="general">Orientación general</option></select></label><label>Idioma<select value={form.preferredLanguage} onChange={(e) => update("preferredLanguage", e.target.value)}><option value="es">Español</option><option value="en">English</option></select></label><label>Canal preferido<select value={form.preferredChannel} onChange={(e) => update("preferredChannel", e.target.value)}><option value="telefono">Teléfono</option><option value="correo">Correo</option></select></label><label>Teléfono o correo<input value={form.contactValue} onChange={(e) => update("contactValue", e.target.value)} placeholder="Se mostrará enmascarado" /></label><label>Procedencia<input value={form.source} onChange={(e) => update("source", e.target.value)} required /></label><label>Próxima acción<input type="datetime-local" value={form.nextActionAt} onChange={(e) => update("nextActionAt", e.target.value)} /></label><label className="span-two">Nota general<textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="No escribas salud, domicilio, SSN ni datos bancarios." /></label></div><label className="consent-check"><input type="checkbox" checked={form.consent} onChange={(e) => update("consent", e.target.checked)} /> La persona autorizó ser contactada por el canal indicado.</label><button className="commercial-primary" disabled={saving}>{saving ? "Guardando…" : "Guardar prospecto"}</button></form>}
    <section className="app-card page-card"><div className="card-heading"><div><span>RELACIONES</span><h3>Prospectos registrados</h3></div><b>{data?.prospects.length ?? 0}</b></div>{data?.prospects.map((prospect) => <ProspectRow prospect={prospect} key={prospect.id} />)}{!data?.prospects.length && <EmptyLine text="Añade el primer prospecto con consentimiento." />}</section>
  </div>;
}

function CrmPipeline() {
  const { data, setData, loading, error, setError } = useCommercialOverview();
  const [updating, setUpdating] = useState("");
  const stages = ["nuevo", "contactado", "cita", "entrevista", "seguimiento", "cliente"];
  const move = async (id: string, status: string) => { setUpdating(id); setError(""); try { setData(await commercialAction({ action: "update_prospect_status", id, status })); } catch (cause) { setError(cause instanceof Error ? cause.message : "No fue posible actualizar la etapa."); } finally { setUpdating(""); } };
  if (loading) return <LoadingCard />;
  return <div className="commercial-page"><section className="pipeline-heading"><div><span>FLUJO DE RELACIONES</span><h2>Cada persona en la etapa correcta.</h2><p>El CRM organiza el seguimiento; no utiliza salud, edad ni capacidad económica para priorizar prospectos.</p></div><div><strong>{data?.prospects.length ?? 0}</strong><small>relaciones activas</small></div></section>{error && <InlineError message={error} />}<div className="pipeline-board">{stages.map((stage) => { const meta = stageMeta[stage]; const cards = data?.prospects.filter((prospect) => prospect.status === stage) || []; return <section className="pipeline-column" key={stage}><header><span className={`pipeline-dot ${meta.tone}`} /><strong>{meta.label}</strong><b>{cards.length}</b></header><div>{cards.map((prospect) => <article className="pipeline-card" key={prospect.id}><div><span className={`avatar ${meta.tone}`}>{initials(prospect.fullName)}</span><small>{prospect.preferredLanguage.toUpperCase()}</small></div><h3>{prospect.fullName}</h3><p>{interestLabels[prospect.interest] || prospect.interest}</p><em>{prospect.contactPreview}</em><select aria-label={`Mover ${prospect.fullName}`} value={prospect.status} disabled={updating === prospect.id} onChange={(e) => move(prospect.id, e.target.value)}>{stages.map((option) => <option value={option} key={option}>{stageMeta[option].label}</option>)}<option value="no_continuar">No continuar</option></select></article>)}{!cards.length && <div className="pipeline-empty">Sin registros</div>}</div></section>; })}</div><div className="compliance-lock"><span>⊘</span><div><strong>Separación activa</strong><p>Los datos del CRM no pasan a campañas ni al motor de análisis sin una acción consciente y autorizada.</p></div></div></div>;
}

function Agenda() {
  const { data, setData, loading, error, setError } = useCommercialOverview();
  const [panel, setPanel] = useState<"cita" | "tarea" | null>(null);
  const [saving, setSaving] = useState(false);
  const [appointmentForm, setAppointmentForm] = useState({ prospectId: "", attendeeReference: "", startsAt: "", durationMinutes: "30", mode: "videollamada", notes: "" });
  const [taskForm, setTaskForm] = useState({ prospectId: "", title: "", dueAt: "", priority: "normal" });
  const updateAppointment = (key: keyof typeof appointmentForm, value: string) => setAppointmentForm((current) => ({ ...current, [key]: value }));
  const updateTask = (key: keyof typeof taskForm, value: string) => setTaskForm((current) => ({ ...current, [key]: value }));
  const createAppointment = async (event: FormEvent) => { event.preventDefault(); setSaving(true); setError(""); try { setData(await commercialAction({ action: "create_appointment", ...appointmentForm, durationMinutes: Number(appointmentForm.durationMinutes) })); setPanel(null); setAppointmentForm({ prospectId: "", attendeeReference: "", startsAt: "", durationMinutes: "30", mode: "videollamada", notes: "" }); } catch (cause) { setError(cause instanceof Error ? cause.message : "No fue posible guardar la cita."); } finally { setSaving(false); } };
  const createTask = async (event: FormEvent) => { event.preventDefault(); setSaving(true); setError(""); try { setData(await commercialAction({ action: "create_task", ...taskForm })); setPanel(null); setTaskForm({ prospectId: "", title: "", dueAt: "", priority: "normal" }); } catch (cause) { setError(cause instanceof Error ? cause.message : "No fue posible guardar la tarea."); } finally { setSaving(false); } };
  const completeTask = async (id: string) => { try { setData(await commercialAction({ action: "complete_task", id })); } catch (cause) { setError(cause instanceof Error ? cause.message : "No fue posible completar la tarea."); } };
  if (loading) return <LoadingCard />;
  return <div className="commercial-page"><section className="agenda-hero"><div><span>AGENDA CON INTENCIÓN</span><h2>Preparar, conversar y dar seguimiento.</h2><p>Los recordatorios se conservan como borradores hasta conectar un canal autorizado y revisar el consentimiento.</p></div><div><button onClick={() => setPanel(panel === "cita" ? null : "cita")}>+ Programar cita</button><button onClick={() => setPanel(panel === "tarea" ? null : "tarea")}>+ Crear tarea</button></div></section>{error && <InlineError message={error} />}
    {panel === "cita" && <form className="app-card commercial-form compact" onSubmit={createAppointment}><div className="form-title"><div><span>NUEVA CITA</span><h3>Bloque de conversación</h3></div><b>Recordatorio: borrador</b></div><div className="commercial-fields"><label>Prospecto<select value={appointmentForm.prospectId} onChange={(e) => { const prospect = data?.prospects.find((item) => item.id === e.target.value); setAppointmentForm((current) => ({ ...current, prospectId: e.target.value, attendeeReference: prospect?.fullName.replace("Demostración · ", "") || current.attendeeReference })); }}><option value="">Sin vincular</option>{data?.prospects.map((prospect) => <option value={prospect.id} key={prospect.id}>{prospect.fullName}</option>)}</select></label><label>Referencia del asistente<input value={appointmentForm.attendeeReference} onChange={(e) => updateAppointment("attendeeReference", e.target.value)} required /></label><label>Fecha y hora<input type="datetime-local" value={appointmentForm.startsAt} onChange={(e) => updateAppointment("startsAt", e.target.value)} required /></label><label>Duración<select value={appointmentForm.durationMinutes} onChange={(e) => updateAppointment("durationMinutes", e.target.value)}><option value="30">30 minutos</option><option value="45">45 minutos</option><option value="60">60 minutos</option></select></label><label>Modalidad<select value={appointmentForm.mode} onChange={(e) => updateAppointment("mode", e.target.value)}><option value="videollamada">Videollamada</option><option value="telefono">Teléfono</option><option value="presencial">Presencial</option></select></label><label>Nota general<input value={appointmentForm.notes} onChange={(e) => updateAppointment("notes", e.target.value)} /></label></div><button className="commercial-primary" disabled={saving}>{saving ? "Guardando…" : "Guardar cita"}</button></form>}
    {panel === "tarea" && <form className="app-card commercial-form compact" onSubmit={createTask}><div className="form-title"><div><span>NUEVA TAREA</span><h3>Próxima acción</h3></div></div><div className="commercial-fields"><label>Prospecto<select value={taskForm.prospectId} onChange={(e) => updateTask("prospectId", e.target.value)}><option value="">Tarea general</option>{data?.prospects.map((prospect) => <option value={prospect.id} key={prospect.id}>{prospect.fullName}</option>)}</select></label><label className="span-two">Tarea<input value={taskForm.title} onChange={(e) => updateTask("title", e.target.value)} required /></label><label>Fecha y hora<input type="datetime-local" value={taskForm.dueAt} onChange={(e) => updateTask("dueAt", e.target.value)} required /></label><label>Prioridad<select value={taskForm.priority} onChange={(e) => updateTask("priority", e.target.value)}><option value="normal">Normal</option><option value="alta">Alta</option></select></label></div><button className="commercial-primary" disabled={saving}>{saving ? "Guardando…" : "Guardar tarea"}</button></form>}
    <div className="agenda-grid"><section className="app-card agenda-list"><div className="card-heading"><div><span>PRÓXIMAS CITAS</span><h3>Conversaciones programadas</h3></div><b>{data?.appointments.length ?? 0}</b></div>{data?.appointments.map((appointment) => <article className="appointment-row" key={appointment.id}><div className="date-block"><strong>{new Date(appointment.startsAt).getDate()}</strong><small>{new Intl.DateTimeFormat("es-US", { month: "short" }).format(new Date(appointment.startsAt))}</small></div><div><strong>{appointment.attendeeReference}</strong><small>{formatDate(appointment.startsAt)} · {appointment.durationMinutes} min · {appointment.mode}</small><p>{appointment.notes}</p></div><em>{appointment.reminderStatus}</em></article>)}{!data?.appointments.length && <EmptyLine text="No hay citas programadas." />}</section><section className="app-card agenda-list"><div className="card-heading"><div><span>SEGUIMIENTO</span><h3>Tareas pendientes</h3></div><b>{data?.tasks.filter((task) => task.status === "pendiente").length ?? 0}</b></div>{data?.tasks.filter((task) => task.status === "pendiente").map((task) => <article className="task-row" key={task.id}><button aria-label={`Completar ${task.title}`} onClick={() => completeTask(task.id)}>✓</button><div><strong>{task.title}</strong><small>{formatDate(task.dueAt)} · prioridad {task.priority}</small></div></article>)}{!data?.tasks.some((task) => task.status === "pendiente") && <EmptyLine text="Todo está al día." />}</section></div>
  </div>;
}

function Campaigns() {
  const { data, setData, loading, error, setError } = useCommercialOverview();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", topic: "vida", audience: "Contactos con consentimiento vigente", channel: "correo", subject: "", content: "" });
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event: FormEvent) => { event.preventDefault(); setSaving(true); setError(""); try { setData(await commercialAction({ action: "create_campaign", ...form })); setShowForm(false); setForm({ name: "", topic: "vida", audience: "Contactos con consentimiento vigente", channel: "correo", subject: "", content: "" }); } catch (cause) { setError(cause instanceof Error ? cause.message : "No fue posible guardar la campaña."); } finally { setSaving(false); } };
  if (loading) return <LoadingCard />;
  return <div className="commercial-page"><section className="campaign-hero"><div><span>CONSTRUCTOR EDUCATIVO</span><h2>Comunicar con claridad, nunca con presión.</h2><p>Crea mensajes bilingües y secuencias educativas. Todo permanece en borrador mientras falte nombramiento y aprobación.</p></div><button onClick={() => setShowForm((value) => !value)}>{showForm ? "Cerrar editor" : "+ Nueva campaña"}</button></section><div className="campaign-safety"><span>🔒</span><div><strong>Envío automático desactivado</strong><p>Los borradores no se publican, no se envían y no contienen nombres de aseguradoras ni productos.</p></div><b>NOMBRAMIENTO PENDIENTE</b></div>{error && <InlineError message={error} />}
    {showForm && <form className="app-card commercial-form" onSubmit={submit}><div className="form-title"><div><span>NUEVO BORRADOR</span><h3>Campaña educativa</h3></div><b>Revisión humana obligatoria</b></div><div className="commercial-fields"><label>Nombre interno<input value={form.name} onChange={(e) => update("name", e.target.value)} required /></label><label>Tema<select value={form.topic} onChange={(e) => update("topic", e.target.value)}><option value="vida">Protección familiar</option><option value="salud">Salud</option><option value="retiro">Retiro</option><option value="general">Orientación general</option></select></label><label>Canal<select value={form.channel} onChange={(e) => update("channel", e.target.value)}><option value="correo">Correo</option><option value="sms">SMS (solo borrador)</option><option value="whatsapp">WhatsApp (solo borrador)</option></select></label><label className="span-two">Audiencia<input value={form.audience} onChange={(e) => update("audience", e.target.value)} /></label><label className="span-two">Asunto<input value={form.subject} onChange={(e) => update("subject", e.target.value)} required /></label><label className="span-two">Contenido<textarea value={form.content} onChange={(e) => update("content", e.target.value)} required placeholder="Contenido educativo, claro y verificable…" /></label></div><button className="commercial-primary" disabled={saving}>{saving ? "Guardando…" : "Guardar como borrador"}</button></form>}
    <div className="campaign-grid">{data?.campaigns.map((campaign) => <article className="campaign-card" key={campaign.id}><header><span>{campaign.topic}</span><b>{campaign.status}</b></header><h3>{campaign.name}</h3><small>{campaign.audience} · {campaign.channel}</small><div><em>ASUNTO</em><strong>{campaign.subject}</strong><p>{campaign.content}</p></div><footer>{campaign.disclaimer}</footer></article>)}{!data?.campaigns.length && <EmptyLine text="Crea el primer borrador educativo." />}</div>
  </div>;
}

type KnowledgePayload = { version: string; sources: Array<{ id: string; title: string; organization: string; url: string; topic: string; verifiedOn: string; status: string; notes: string }>; rules: Array<{ id: string; title: string; domain: string; ruleType: string; guidance: string; reviewedOn: string }> };
function KnowledgeBase() {
  const [data, setData] = useState<KnowledgePayload | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { fetch("/api/knowledge").then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error); return body; }).then(setData).catch((cause) => setError(cause instanceof Error ? cause.message : "No disponible")); }, []);
  if (error) return <div className="app-card knowledge-error"><h2>La base no está disponible</h2><p>{error}</p></div>;
  if (!data) return <div className="knowledge-loading">Verificando fuentes y reglas…</div>;
  return <div className="knowledge-page">
    <section className="knowledge-hero"><div><span>TRAZABILIDAD COMPLETA</span><h2>Una respuesta es tan confiable como su evidencia.</h2><p>Cada regla conserva fuente, jurisdicción, fecha de revisión y estado. Ningún producto específico se habilita sin documentos vigentes de la aseguradora.</p></div><div className="knowledge-stamp"><small>VERSIÓN ACTIVA</small><strong>{data.version}</strong><em>Florida · revisión 19 ago 2026</em></div></section>
    <div className="knowledge-stats"><div><strong>{data.sources.length}</strong><span>fuentes oficiales</span></div><div><strong>{data.rules.length}</strong><span>reglas activas</span></div><div><strong>0</strong><span>productos sin verificar</span></div><div><strong>100%</strong><span>con trazabilidad</span></div></div>
    <section className="app-card knowledge-section"><div className="card-heading"><div><span>FUENTES</span><h3>Documentación oficial incorporada</h3></div><b>{data.sources.length}</b></div><div className="source-grid">{data.sources.map((source) => <a className="source-card" href={source.url} target="_blank" rel="noreferrer" key={source.id}><div><span>{source.topic}</span><b>{source.status}</b></div><h4>{source.title}</h4><p>{source.organization}</p><small>Verificada: {source.verifiedOn}</small><em>{source.notes}</em></a>)}</div></section>
    <section className="app-card knowledge-section"><div className="card-heading"><div><span>REGLAS</span><h3>Controles antes de recomendar</h3></div><b>{data.rules.length}</b></div><div className="rules-table">{data.rules.map((rule) => <div key={rule.id}><span className={rule.ruleType === "bloqueo" ? "rule-stop" : "rule-guide"}>{rule.ruleType}</span><div><strong>{rule.title}</strong><small>{rule.domain} · revisada {rule.reviewedOn}</small><p>{rule.guidance}</p></div><b>{rule.id}</b></div>)}</div></section>
  </div>;
}

function Calculator({ income, expenses, years, setIncome, setExpenses, setYears, monthly, future }: { income: number; expenses: number; years: number; setIncome: (n: number) => void; setExpenses: (n: number) => void; setYears: (n: number) => void; monthly: number; future: number }) {
  const money = new Intl.NumberFormat("es-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  return <div className="calculator-layout"><section className="app-card calc-inputs"><span className="section-kicker">PROYECCIÓN EDUCATIVA</span><h2>Capacidad de ahorro</h2><p>Ajusta los datos para visualizar una estimación sencilla del ahorro disponible.</p><label>Ingreso mensual del hogar<div><span>$</span><input type="number" value={income} onChange={(e) => setIncome(Number(e.target.value))} /></div></label><label>Gastos mensuales<div><span>$</span><input type="number" value={expenses} onChange={(e) => setExpenses(Number(e.target.value))} /></div></label><label>Horizonte de planificación<strong>{years} años</strong><input type="range" min="1" max="40" value={years} onChange={(e) => setYears(Number(e.target.value))} /></label><div className="calc-tip">ⓘ La proyección utiliza un factor ilustrativo fijo. No representa rendimiento garantizado.</div></section><section className="calc-results"><span>RESULTADO ILUSTRATIVO</span><h3>Capacidad mensual</h3><strong>{money.format(monthly)}</strong><div className="chart-bars">{[38, 44, 51, 58, 66, 73, 82, 91].map((height, i) => <i key={i} style={{ height: `${height}%` }} />)}</div><div className="result-row"><span>Proyección al final del período</span><b>{money.format(future)}</b></div><div className="result-row"><span>Tasa de ahorro actual</span><b>{income ? Math.round((monthly / income) * 100) : 0}%</b></div><button>Guardar escenario</button></section></div>;
}

function Reports() { return <><section className="report-hero"><div><span>REPORTES PROFESIONALES</span><h2>Ideas claras, listas para conversar.</h2><p>Organiza el análisis en un resumen visual y comprensible para cada familia.</p></div><button>+ Crear reporte</button></section><div className="report-grid">{[["Resumen financiero integral","Familia Rivera","Actualizado hoy"],["Plan de ingresos de retiro","Carlos Méndez","Actualizado ayer"],["Estrategia educativa","Ana y Luis Soto","Actualizado el lunes"]].map(([title,name,date],i)=><article className="report-card" key={title}><div className={`report-cover cover-${i+1}`}><span>N</span><small>NEXOÁUREO</small><b>{title}</b><em>{name}</em></div><div><strong>{title}</strong><small>{name} · {date}</small><button>Abrir reporte →</button></div></article>)}</div></>; }
