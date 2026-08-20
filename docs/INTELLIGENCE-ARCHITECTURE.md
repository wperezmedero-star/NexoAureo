# Nexo Intelligence — arquitectura y límites

Versión: `NA-II-2026.08-v1`

## Motor híbrido

1. El motor local detecta únicamente expresiones explícitas mediante reglas comprobables.
2. La integración opcional con OpenAI usa Responses API y Structured Outputs con un esquema JSON estricto.
3. La información sugerida nunca se aplica automáticamente: el agente debe revisarla y aceptarla campo por campo.
4. Si la IA externa falla o no está configurada, la entrevista continúa con el motor local.

## Privacidad

- El relato no se guarda en la base de datos ni en el navegador.
- Teléfonos, correos, SSN, direcciones exactas y referencias a cuentas bancarias se bloquean antes del análisis.
- La IA externa se usa únicamente cuando está configurada y el agente marca el consentimiento para esa ocasión.
- Las solicitudes externas se envían con `store: false`.

## Laboratorio de escenarios

- Compara el caso actual con un solo escenario de la misma referencia anónima y la misma necesidad.
- Ejecuta el mismo motor de decisiones mediante `/api/scenarios`.
- No guarda la simulación y no compara primas, aseguradoras ni productos.
- Un escenario solo vuelve al flujo de entrevista cuando el agente pulsa “Llevar a revisión”.

## Fuentes técnicas oficiales consultadas

- OpenAI, “Structured model outputs”: https://developers.openai.com/api/docs/guides/structured-outputs
- OpenAI, “Safety best practices”: https://developers.openai.com/api/docs/guides/safety-best-practices
- OpenAI, “GPT-5.6 Luna”: https://developers.openai.com/api/docs/models/gpt-5.6-luna

Revisadas: 20 de agosto de 2026.
