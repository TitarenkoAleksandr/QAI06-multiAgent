# Презентация по предпоследнему прогону — пакет «Восстановление пароля»

**Файл:** `agent-presentation-previous-run.html`  
**Открытие:** в браузере, листание ← → / пробел / кнопками.

Прогон: Confluence `2129922` (v10) + вложенная `7045122` (v1), решение пользователя «FR-AUTH-7 — сброс на email», публикация в Jira `AITST` и Qase `QAI06` после approve (16.11.2026).

## слайд 1. Титульный
Название прогона, источники, целевые системы и KPI:
- 58 базовых REQ + уточнения FR-AUTH-7;
- 7 задач AITST-21…27 и 7 связей;
- 15 тест-кейсов в Suite 11 Qase QAI06 (53 → 68);
- 6 eval cases: 2 PASS / 4 FAIL, pass_rate 33,3 %, quality gate FAIL.

## слайд 2. Состав агента
Вход (2 страницы Confluence, email), 4 субагента (`qa_orchestrator`, `requirement_reviewer`, `task_maker`, `test_creator`), инструменты, управление QG/E-эскалации, результат.

## слайд 3. Структура
5 этапов: Inputs → Requirement Review v23 → Task Design v5 → Test Design v7 → Publication logs v2. Показан гейт `APPROVE` перед публикацией.

## слайд 4. Как работает агент
8 шагов от чтения страниц до верификации в JQL/REST. Центр — 100 % покрытие REQ, 0 ошибок записи.

## слайд 5. Инструменты
- 2 плагина: `confluence.ts`, `PII-scanner.ts` (с REST-fallback);
- 3 skill: `requirement-review`, `task-design`, `test-design`;
- Jira MCP (AITST), Qase MCP (QAI06, Suite 11), Code Mode/REST, Files/артефакты;
- `evals/eval_runner.py` + `evaluator.py` (LLM-as-a-judge).

Отдельно отмечены известные ограничения: qql_search кэширует, `qase_case_bulk_create` падает с ошибкой валидации, но создаёт кейсы, Jira MCP работает на `/v1/mcp`.

## слайд 6. Связки субагентов, инструментов, артефактов
Матрица «4 субагента → 8 инструментальных блоков → 4 группы артефактов». Внизу — цепочка преемственности:
`01-requirement-review-v23 → 02-task-design-v5 → 03-test-design-v7 → журналы v2`.

## слайд 7. Eval cases
Таблица всех 6 кейсов (`EVC-001…EVC-006`) со статусами и причинами, пороги качества:
- `pass_rate ≥ 100 %` → 33,3 % ✗;
- `expected_properties ≥ 95 %` → 43,3 % ✗;
- `forbidden violations ≤ 0 %` → 3,8 % ✗;
- `errors = 0` → 0 ✓.

Важная оговорка: `eval_results.json` описывает **другой eval-прогон** (в обоснованиях — версия 9 и `01-requirement-review-v14.md`, DEF-50); его метрики не смешиваются с метриками публикации 7 задач и 15 кейсов.

## Источники
`04-final-report-v4.md`, `01-requirement-review-v23.md`, `02-task-design-v5.md`, `03-test-design-v7.md`, `02a-jira-publication-log-v2.md`, `03a-qase-publication-log-v2.md`, `evals/dataset/golden_dataset.json`, `evals/results/eval_results.json`, `.opencode/agents/*`, `.opencode/plugins/*`, `opencode.json`.
