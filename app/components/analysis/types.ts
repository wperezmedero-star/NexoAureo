/* Tipos de la vista de entrevista.
   Se importan como "type" desde lib/, así que no agregan código al
   empaquetado ni tocan la lógica: solo dan forma exacta a los datos que la
   interfaz envía y recibe, siguiendo docs/FRONTEND-CONTRACT.md. */
import type { analyzeAssessment } from "../../../lib/decision-engine";
import type {
  AnnuityProfile,
  AssessmentInput,
  FinalExpenseProfile,
  HealthProfile,
  LifeProfile,
  LongTermCareProfile,
  ReviewState,
} from "../../../lib/fact-finder";

export type {
  AnnuityProfile,
  AssessmentInput,
  FinalExpenseProfile,
  HealthProfile,
  LifeProfile,
  LongTermCareProfile,
  ReviewState,
};

/** Forma exacta de la respuesta del motor: se infiere de la función real,
    así que si el motor evoluciona, esta vista se entera al compilar. */
export type EngineResult = ReturnType<typeof analyzeAssessment>;

export type EvidenceSource = {
  id: string;
  title: string;
  organization: string;
  url: string;
  jurisdiction: string;
  topic: string;
  publishedOn: string | null;
  verifiedOn: string;
  status: string;
  notes: string;
};

export type RuleRow = {
  id: string;
  domain: string;
  title: string;
  ruleType: string;
  priority: number;
  guidance: string;
  sourceId: string;
  reviewedOn: string;
  active: boolean;
};

export type CreateAssessmentResponse = {
  id: string;
  result: EngineResult;
  evidence: EvidenceSource[];
  rules: RuleRow[];
  engineVersion: string;
  factFinderVersion: string;
  knowledgeVersion: string;
};

export type AssessmentListItem = {
  id: string;
  applicantReference: string;
  goal: AssessmentInput["goal"];
  status: string;
  sourceVersion: string;
  createdAt: string;
  updatedAt?: string;
  summary?: {
    qualityScore: number;
    directionReady: boolean;
    cautionCount: number;
    missingCount: number;
    priority: string;
  } | null;
};

export type AuditTrailEntry = {
  action: string;
  details: Record<string, unknown> | null;
  createdAt: string;
};

export type AssessmentDetail = {
  assessment: {
    id: string;
    applicantReference: string;
    jurisdiction: string;
    goal: AssessmentInput["goal"];
    status: string;
    input: Record<string, unknown> | null;
    result: EngineResult | null;
    sourceVersion: string;
    createdAt: string;
    updatedAt: string;
  };
  evidence: EvidenceSource[];
  rules: RuleRow[];
  auditTrail: AuditTrailEntry[];
};

/** Estado editable del formulario. Los campos numéricos se guardan como
    string mientras se escriben (para permitir un input vacío) y se
    convierten a número solo al validar o enviar. */
export type DraftAssessment = {
  applicantReference: string;
  age: string;
  dependents: string;
  annualIncome: string;
  monthlyExpenses: string;
  debts: string;
  mortgageBalance: string;
  educationGoal: string;
  existingLifeCoverage: string;
  emergencySavings: string;
  coverageYears: string;
  monthlyBudget: string;
  goal: AssessmentInput["goal"];
  healthCoverage: AssessmentInput["healthCoverage"];
  liquidityNeed: AssessmentInput["liquidityNeed"];
  riskTolerance: AssessmentInput["riskTolerance"];
  existingPolicy: boolean;
  wantsReplace: boolean;
  life: LifeProfile;
  health: HealthProfile;
  annuity: AnnuityProfile;
  finalExpense: FinalExpenseProfile;
  longTermCare: LongTermCareProfile;
};

export type WizardStepId = "solicitante" | "economia" | "cobertura" | "perfil" | "resumen";

export type ReadinessIssue = { id: string; message: string };

/** Conteo verificable de información completada. No representa una
    predicción, elegibilidad ni nivel de confianza del motor. */
export type ReadinessSummary = {
  percentComplete: number;
  confirmedCount: number;
  totalCount: number;
  pendingCount: number;
  blockingErrors: ReadinessIssue[];
  followUpWarnings: ReadinessIssue[];
};

export type DirectionBucket = "lista" | "precaucion" | "informacion";

export type ComparisonEntry = {
  id: string;
  applicantReference: string;
  goal: AssessmentInput["goal"];
  createdAt: string;
  status: string;
  bucket: DirectionBucket;
  qualityScore: number;
  directionReady: boolean;
  cautionCount: number;
  missingCount: number;
  priority: string;
};

export type AdaptiveQuestion = {
  id: string;
  question: string;
  reason: string;
  targetStep: 0 | 1 | 2 | 3;
  tone: "essential" | "clarify" | "caution";
};

export type ScenarioComparisonResponse = {
  baseline: EngineResult;
  scenario: EngineResult;
  engineVersion: string;
  factFinderVersion: string;
  persisted: false;
};
