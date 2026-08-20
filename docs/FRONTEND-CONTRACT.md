# Contrato frontend — entrevista NexoÁureo

Versión del cuestionario: `NA-FF-2026.08-v1`

Este documento permite que las vistas se diseñen sin modificar la lógica, la base de datos ni las reglas de decisión.

## Reglas de integración

- Enviar únicamente referencias anónimas. No enviar teléfono, correo, SSN, dirección, cuentas bancarias ni detalles clínicos.
- Mantener todos los campos económicos como números, nunca como textos con símbolos de moneda.
- Los perfiles por necesidad son opcionales para compatibilidad, pero el motor marcará como pendiente cualquier dato necesario que no se proporcione.
- Ninguna vista debe convertir `productRecommendationAllowed: false` en una recomendación, cotización o aprobación.

## Crear un análisis

`POST /api/assessments`

El cuerpo común conserva los campos existentes y puede incluir `profiles`:

```json
{
  "applicantReference": "Familia R.",
  "age": 38,
  "dependents": 2,
  "annualIncome": 72000,
  "monthlyExpenses": 4300,
  "debts": 18000,
  "mortgageBalance": 210000,
  "educationGoal": 80000,
  "existingLifeCoverage": 50000,
  "emergencySavings": 9000,
  "coverageYears": 20,
  "monthlyBudget": 140,
  "goal": "proteccion",
  "healthCoverage": "adecuada",
  "liquidityNeed": "moderada",
  "riskTolerance": "conservadora",
  "existingPolicy": true,
  "wantsReplace": false,
  "profiles": {
    "life": {
      "incomeReplacementPercent": 60,
      "permanentNeed": "no",
      "existingPolicyDocumentsReviewed": "confirmado"
    }
  }
}
```

## Perfiles disponibles

### Vida — `profiles.life`

- `incomeReplacementPercent`: número entre 0 y 100, o `null`.
- `permanentNeed`: `si`, `no` o `pendiente`.
- `existingPolicyDocumentsReviewed`: `confirmado`, `no_aplica` o `pendiente`.

### Salud — `profiles.health`

- `providersReviewed`: `confirmado`, `no_aplica` o `pendiente`.
- `medicationsReviewed`: `confirmado`, `no_aplica` o `pendiente`.
- `expectedUse`: `bajo`, `moderado`, `alto` o `pendiente`.
- `deductibleCapacity`: número no negativo, o `null`.

### Retiro/anualidad — `profiles.annuity`

- `financialExperience`: `ninguna`, `basica`, `intermedia`, `avanzada` o `pendiente`.
- `financialObjective`: `ingreso`, `acumulacion`, `preservacion`, `legado`, `otro` o `pendiente`.
- `intendedUse`: `ingreso_inmediato`, `ingreso_futuro`, `acumulacion_diferida`, `otro` o `pendiente`.
- `timeHorizonYears`: entero entre 1 y 60, o `null`.
- `existingProductsReviewed`: `confirmado`, `no_aplica` o `pendiente`.
- `existingProducts`: lista de `efectivo`, `certificados`, `cuentas_retiro`, `fondos`, `acciones_bonos`, `seguros_vida`, `anualidades` u `otros`.
- `liquidNetWorth`: número no negativo, o `null`.
- `fundingSource`: `ahorros`, `certificados`, `cuenta_retiro`, `venta_activo`, `reemplazo_anualidad`, `seguro_vida`, `otro` o `pendiente`.
- `taxStatus`: `calificado`, `no_calificado`, `mixto` o `pendiente`.

### Gastos finales — `profiles.finalExpense`

- `targetAmount`: número no negativo, o `null`.
- `reservedResources`: número no negativo, o `null`.

### Cuidado prolongado — `profiles.longTermCare`

- `carePreference`: `hogar`, `comunidad`, `institucion`, `flexible` o `pendiente`.
- `familySupportReviewed`: `confirmado`, `no_aplica` o `pendiente`.
- `functionalHealthReviewed`: `confirmado`, `no_aplica` o `pendiente`. No guardar detalles clínicos.
- `fundingYears`: número entre 0 y 20, o `null`.

## Respuesta del motor

La respuesta incluye:

- `result.status`, `confidence`, `priority` y `direction`.
- `result.missing`, `cautions`, `alternatives`, `rationale`, `assumptions` y `nextSteps`.
- `result.quality.score`, `level`, `pendingItems` y `directionReady`.
- `result.metrics` y sus desgloses ilustrativos.
- `result.decisionGate`, que controla las actividades bloqueadas.
- `evidence` y `rules`, con las fuentes utilizadas.

## Historial privado

- `GET /api/assessments`: lista resumida de los análisis del propietario autenticado. Cada fila incluye `summary.qualityScore`, `summary.directionReady`, `summary.cautionCount`, `summary.missingCount` y `summary.priority`, sin exponer el resultado completo.
- `GET /api/assessments?id=<id>`: expediente completo, evidencia, reglas y trazabilidad del análisis solicitado, siempre limitado al propietario autenticado.
