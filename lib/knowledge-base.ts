import { asc, eq } from "drizzle-orm";
import { decisionRules, knowledgeSources } from "../db/schema";
import { ensureDatabaseSchema, getDb } from "../db";

export const KNOWLEDGE_VERSION = "FL-2026.08.19-v2";

const sources = [
  { id: "FL-627.4554", title: "Idoneidad en transacciones de anualidades", organization: "Legislatura de Florida", url: "https://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0600-0699%2F0627%2FSections%2F0627.4554.html", jurisdiction: "Florida", topic: "Anualidades", publishedOn: "2025", verifiedOn: "2026-08-19", status: "vigente", notes: "Mejor interés, 14 datos mínimos del perfil y documentación de la razón para recomendar." },
  { id: "FL-626.9651", title: "Privacidad de información financiera y de salud", organization: "Legislatura de Florida", url: "https://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0600-0699%2F0626%2FSections%2F0626.9651.html", jurisdiction: "Florida", topic: "Privacidad", publishedOn: "2025", verifiedOn: "2026-08-19", status: "vigente", notes: "Uso de información financiera y de salud no pública." },
  { id: "FL-DFS-COMPLIANCE", title: "Cumplimiento para agentes de vida y salud", organization: "Florida Department of Financial Services", url: "https://myfloridacfo.com/division/agents/compliance/life-and-health-agents", jurisdiction: "Florida", topic: "Cumplimiento", publishedOn: null, verifiedOn: "2026-08-19", status: "vigente", notes: "Publicidad, reemplazos, anualidades, ética y licencias." },
  { id: "FL-DFS-LICENSING", title: "Licencias y nombramientos de agentes", organization: "Florida Department of Financial Services", url: "https://myfloridacfo.com/division/agents/licensing", jurisdiction: "Florida", topic: "Nombramientos", publishedOn: null, verifiedOn: "2026-08-19", status: "vigente", notes: "Una licencia de agente requiere un nombramiento apropiado para realizar actividades de seguro." },
  { id: "NAIC-LIFE-2023", title: "Cómo elegir un tipo de seguro de vida", organization: "NAIC", url: "https://content.naic.org/article/consumer-insight-what-type-life-insurance-right-you", jurisdiction: "Estados Unidos", topic: "Vida", publishedOn: "2023-09-06", verifiedOn: "2026-08-19", status: "vigente", notes: "Necesidad, duración, asequibilidad, garantías y pólizas existentes." },
  { id: "CMS-HEALTH-COSTS", title: "Cómo comparar el costo total de planes de salud", organization: "HealthCare.gov / CMS", url: "https://www.healthcare.gov/choose-a-plan/your-total-costs/", jurisdiction: "Estados Unidos", topic: "Salud", publishedOn: null, verifiedOn: "2026-08-19", status: "vigente", notes: "Prima, deducible y gastos de bolsillo." },
  { id: "CMS-HEALTH-NETWORK", title: "Cómo comparar planes y redes", organization: "HealthCare.gov / CMS", url: "https://www.healthcare.gov/choose-a-plan/comparing-plans/", jurisdiction: "Estados Unidos", topic: "Salud", publishedOn: null, verifiedOn: "2026-08-19", status: "vigente", notes: "Redes, médicos, hospitales y restricciones." },
  { id: "CMS-LTC", title: "Cobertura de cuidado a largo plazo", organization: "Medicare.gov / CMS", url: "https://www.medicare.gov/coverage/long-term-care", jurisdiction: "Estados Unidos", topic: "Cuidado prolongado", publishedOn: null, verifiedOn: "2026-08-19", status: "vigente", notes: "Medicare y la mayoría de los seguros de salud no cubren la mayor parte del cuidado custodial." },
];

const rules = [
  { id: "SAFE-001", domain: "General", title: "No recomendar sin datos suficientes", ruleType: "bloqueo", priority: 100, guidance: "Si faltan datos esenciales, detener la conclusión y enumerar la información pendiente.", sourceId: "FL-DFS-COMPLIANCE", reviewedOn: "2026-08-14", active: true },
  { id: "SAFE-002", domain: "General", title: "Sin producto específico no verificado", ruleType: "bloqueo", priority: 100, guidance: "No nombrar una póliza o aseguradora hasta cargar documentación vigente, estatal y aprobada.", sourceId: "FL-DFS-COMPLIANCE", reviewedOn: "2026-08-14", active: true },
  { id: "PRIV-001", domain: "Privacidad", title: "Minimización de datos", ruleType: "bloqueo", priority: 100, guidance: "No almacenar dirección completa, teléfono, correo del solicitante, SSN, cuenta bancaria ni expedientes médicos en el análisis preliminar.", sourceId: "FL-626.9651", reviewedOn: "2026-08-14", active: true },
  { id: "APPT-001", domain: "Nombramientos", title: "Modo educativo mientras falte nombramiento", ruleType: "bloqueo", priority: 100, guidance: "Mientras no exista un nombramiento activo, limitar el sistema a educación y preparación interna; no solicitar, cotizar, recomendar ni anunciar productos de seguro.", sourceId: "FL-DFS-LICENSING", reviewedOn: "2026-08-19", active: true },
  { id: "LIFE-001", domain: "Vida", title: "Necesidad individualizada", ruleType: "dirección", priority: 90, guidance: "Evaluar ingreso familiar, obligaciones, dependientes, duración de la necesidad, cobertura existente y capacidad de mantener la prima.", sourceId: "NAIC-LIFE-2023", reviewedOn: "2026-08-14", active: true },
  { id: "LIFE-002", domain: "Vida", title: "Protección por período definido", ruleType: "dirección", priority: 70, guidance: "Cuando la necesidad tiene plazo definido, comparar primero cobertura temporal y explicar renovación, vencimiento y primas futuras.", sourceId: "NAIC-LIFE-2023", reviewedOn: "2026-08-14", active: true },
  { id: "LIFE-003", domain: "Vida", title: "No cancelar cobertura vigente", ruleType: "bloqueo", priority: 95, guidance: "No cancelar una póliza actual antes de que la nueva cobertura esté emitida, aceptada y vigente; documentar cualquier reemplazo.", sourceId: "NAIC-LIFE-2023", reviewedOn: "2026-08-14", active: true },
  { id: "ANN-001", domain: "Anualidades", title: "Mejor interés", ruleType: "bloqueo", priority: 100, guidance: "La recomendación debe anteponer el interés del consumidor y documentar situación financiera, necesidades y objetivos.", sourceId: "FL-627.4554", reviewedOn: "2026-08-14", active: true },
  { id: "ANN-002", domain: "Anualidades", title: "Perfil mínimo completo", ruleType: "bloqueo", priority: 100, guidance: "Exigir los 14 elementos mínimos del perfil del consumidor antes de evaluar una anualidad.", sourceId: "FL-627.4554", reviewedOn: "2026-08-14", active: true },
  { id: "HEALTH-001", domain: "Salud", title: "Costo total, no solo prima", ruleType: "dirección", priority: 90, guidance: "Comparar prima anual, deducible, copagos, coseguro y máximo de bolsillo según uso esperado.", sourceId: "CMS-HEALTH-COSTS", reviewedOn: "2026-08-14", active: true },
  { id: "HEALTH-002", domain: "Salud", title: "Red y medicamentos", ruleType: "dirección", priority: 90, guidance: "Confirmar médicos, hospitales, farmacias y medicamentos antes de seleccionar un plan.", sourceId: "CMS-HEALTH-NETWORK", reviewedOn: "2026-08-14", active: true },
  { id: "LTC-001", domain: "Cuidado prolongado", title: "Brecha de Medicare", ruleType: "dirección", priority: 80, guidance: "No asumir que Medicare o un seguro médico cubrirá cuidado custodial prolongado; revisar alternativas y presupuesto.", sourceId: "CMS-LTC", reviewedOn: "2026-08-14", active: true },
];

let knowledgeReady: Promise<void> | null = null;

export async function ensureKnowledgeBase() {
  await ensureDatabaseSchema();
  if (!knowledgeReady) {
    const db = getDb();
    knowledgeReady = (async () => {
      for (const source of sources) {
        await db.insert(knowledgeSources).values(source).onConflictDoUpdate({
          target: knowledgeSources.id,
          set: {
            title: source.title,
            organization: source.organization,
            url: source.url,
            jurisdiction: source.jurisdiction,
            topic: source.topic,
            publishedOn: source.publishedOn,
            verifiedOn: source.verifiedOn,
            status: source.status,
            notes: source.notes,
          },
        });
      }
      for (const rule of rules) {
        await db.insert(decisionRules).values(rule).onConflictDoUpdate({
          target: decisionRules.id,
          set: {
            domain: rule.domain,
            title: rule.title,
            ruleType: rule.ruleType,
            priority: rule.priority,
            guidance: rule.guidance,
            sourceId: rule.sourceId,
            reviewedOn: rule.reviewedOn,
            active: rule.active,
          },
        });
      }
    })().catch((error) => {
      knowledgeReady = null;
      throw error;
    });
  }
  return knowledgeReady;
}

export async function getKnowledgeBase() {
  await ensureKnowledgeBase();
  const db = getDb();
  const [sourceRows, ruleRows] = await Promise.all([
    db.select().from(knowledgeSources).orderBy(asc(knowledgeSources.topic)),
    db.select().from(decisionRules).where(eq(decisionRules.active, true)).orderBy(asc(decisionRules.priority)),
  ]);
  return { version: KNOWLEDGE_VERSION, sources: sourceRows, rules: ruleRows };
}
