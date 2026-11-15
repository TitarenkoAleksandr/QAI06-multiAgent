# QAI06-multiAgent

Мультиагентная система контроля качества на базе [OpenCode](https://opencode.ai): анализирует требования из Confluence, проектирует задачи в Jira на доработку требований и/или создание тестовой модели, а затем проектирует тест-кейсы в TMS Qase.

Основной сценарий — «требования → ревью → задачи → тест-модель → итоговый отчёт» с обязательными **Quality Gates** и правилами эскалации к человеку на каждом критичном шаге.

---

## Содержание

- [Архитектура](#архитектура)
- [Структура репозитория](#структура-репозитория)
- [Требования](#требования)
- [Быстрый старт](#быстрый-старт)
- [Запуск мультиагента](#запуск-мультиагента)
- [Артефакты](#артефакты)
- [Quality Gates](#quality-gates)
- [Правила эскалации](#правила-эскалации)
- [Кастомные инструменты](#кастомные-инструменты)
- [Оценка качества агентов (evals)](#оценка-качества-агентов-evals)
- [Безопасность](#безопасность)
- [Ограничения](#ограничения)

---

## Архитектура

```
Пользователь
   │  page_id Confluence / файл требований, project Jira, project Qase
   ▼
QA_Orchestrator  (primary agent)
   ├── Шаг 1 ──► requirement_reviewer  (skill: requirement-review) ──► 01-requirement-review-v{N}.md
   ├── Шаг 2 ──► QG-1: Requirements
   ├── Шаг 3 ──► task_maker            (skill: task-design)        ──► 02-task-design-v{N}.md
   ├── Шаг 4 ──► QG-2: Task Design
   ├── Шаг 5 ──► test_creator          (skill: test-design)        ──► 03-test-design-v{N}.md
   ├── Шаг 6 ──► QG-3: Test Design
   └── Шаг 7 ──► 04-final-report-v{N}.md + QG-4: Final report
```

| Компонент | Роль | Доступ к системам |
|---|---|---|
| `qa_orchestrator` | координация субагентов, контроль Quality Gates, итоговый отчёт; **не выполняет** специализированную работу сам | Confluence / Jira / Qase — запрещены |
| `requirement_reviewer` | анализ требований, выделение функциональных/нефункциональных требований, БП, ограничений, поиск противоречий и пробелов | только Confluence (read-only) |
| `task_maker` | проектирование и (после подтверждения) создание задач в Jira | только Jira |
| `test_creator` | проектирование и (после подтверждения) создание тест-кейсов в Qase | только Qase |

Скиллы (`.opencode/skills/*/SKILL.md`) содержат процедуры, форматы и метрики покрытия (`analyzed_count_req`, `coverage_req_task`, `coverage_req_tc` и т. д.). Описание ролей, ограничений и Quality Gates — в `AGENTS.md`.

---

## Структура репозитория

```
.
├── AGENTS.md                     # инструкции мультиагента: роли, ограничения, QG, эскалации
├── opencode.json                 # конфигурация OpenCode (subagent_depth = 4)
├── .opencode/
│   ├── Agents/
│   │   ├── qa_orchestrator.md    # primary agent
│   │   ├── requirement_reviewer.md
│   │   ├── task_maker.md
│   │   └── test_creator.md
│   ├── skills/
│   │   ├── requirement-review/SKILL.md
│   │   ├── task-design/SKILL.md
│   │   └── test-design/SKILL.md
│   └── tools/
│       ├── confluence.ts         # получение страницы Confluence по pageId
│       └── PII-scanner.ts        # поиск и маскирование PII (email, телефон, пароль, токен)
├── Artifacts/                    # результаты прогонов (версионируются)
│   ├── 0.Inputs/                 # локальные выгрузки требований
│   ├── 1.Requirement-review/     # 01-requirement-review-v{N}.md
│   ├── 2.Task-design/            # 02-task-design-v{N}.md
│   ├── 3.Test-design/            # 03-test-design-v{N}.md
│   └── 4.Summary/                # 04-final-report-v{N}.md
└── evals/                        # оценка поведения агентов
    ├── dataset/golden_dataset.json
    ├── evaluator.py / evaluator.mjs
    ├── eval_runner.py / eval_runner.mjs
    └── results/eval_results.json
```

---

## Требования

- [OpenCode CLI](https://opencode.ai) (`opencode` в `PATH`)
- Node.js (для кастомных TS-инструментов и `evals/eval_runner.mjs`)
- Python 3.x (для `evals/eval_runner.py`)
- Доступы: Confluence (API-токен), Jira, Qase — подключаются как MCP-серверы в конфигурации OpenCode

---

## Быстрый старт

1. Клонируйте репозиторий и откройте папку проекта:

   ```powershell
   git clone <repo-url> QAI06-multiAgent
   cd QAI06-multiAgent
   ```

2. Создайте `.env` в корне проекта (файл в `.gitignore`, в репозиторий не попадает):

   ```env
   CONFLUENCE_URL=https://<site>.atlassian.net
   CONFLUENCE_EMAIL=<email>
   CONFLUENCE_API_TOKEN=<api-token>
   ```

3. Настройте MCP-серверы Jira и Qase в конфигурации OpenCode (глобальный `~/.config/opencode/opencode.json` или проектный `opencode.json`). Проектный конфиг сейчас содержит только:

   ```json
   {
     "$schema": "https://opencode.ai/config.json",
     "experimental": { "subagent_depth": 4 }
   }
   ```

4. Проверьте установку:

   ```powershell
   opencode --version
   ```

---

## Запуск мультиагента

Запустите OpenCode в корне проекта и выберите основного агента `qa_orchestrator`:

```powershell
opencode
```

Минимальные входные данные для полного прогона:

| Параметр | Пример |
|---|---|
| Страница требований | `page_id` Confluence (напр. `2129922`) или путь к файлу |
| Проект Jira | `project_key` (напр. `AITST`) |
| Проект Qase | `project_key_tc` (напр. `QAI06`) |
| Режим записи | `artifacts_only` (по умолчанию) или `create_after_approval` |

Пример запроса:

```text
Получи требования из Confluence со страницы pageId=2129922 и выполни их анализ.
Проект Jira: AITST, проект Qase: QAI06. Write_mode = artifacts_only.
```

> По умолчанию (`artifacts_only`) агент **ничего не записывает** в Jira/Qase — только формирует артефакты. Запись выполняется исключительно после явного подтверждения (`create_after_approval` + approval с ID артефакта), см. эскалацию **E3**.

---

## Артефакты

Все результаты сохраняются в `Artifacts/` с версионированием: если `*-v{N}.md` уже существует, новая версия получает `v{N+1}`. Старые версии не перезаписываются.

| Артефакт | Каталог | Содержание |
|---|---|---|
| `01-requirement-review-v{N}.md` | `Artifacts/1.Requirement-review` | атомарные требования `REQ-*`, бизнес-правила, ограничения, дефекты документации, статус QG |
| `02-task-design-v{N}.md` | `Artifacts/2.Task-design` | спроектированные задачи Jira, покрытие требований |
| `03-test-design-v{N}.md` | `Artifacts/3.Test-design` | тест-модель Qase, покрытие требований |
| `04-final-report-v{N}.md` | `Artifacts/4.Summary` | входные данные, список артефактов, результаты, статусы QG, проблемы, эскалации, рекомендации |

Пример готового итогового отчёта: `Artifacts/4.Summary/04-final-report-v4.md`.

---

## Quality Gates

| Gate | Этап | Ключевые критерии |
|---|---|---|
| **QG-1** | после `requirement_reviewer` | требования разделены на ФТ/НФТ/БП/ограничения; нет открытых Blocker-проблем |
| **QG-2** | после `task_maker` | у каждой задачи `id`, `title`, `description`, `requirements`; `coverage_req_task` ≥ порога (по умолчанию 100 %); нет дублей |
| **QG-3** | после `test_creator` | есть позитивные, негативные и граничные сценарии; у каждого `id`, `title`, `steps`, `expected result`, `requirements`; `coverage_req_tc` ≥ порога; нет конфликтующих кейсов |
| **QG-4** | итоговый отчёт | все субагенты отработали; получены все обязательные артефакты; отчёт консистентен |

При провале Gate работа останавливается, причина фиксируется в `04-final-report-v{N}.md` и выполняется эскалация.

---

## Правила эскалации

| Тип | Ситуация |
|---|---|
| **E1** | блокирующие проблемы требований: противоречия, неоднозначности, критическая неполнота |
| **E2** | технические сбои инструментов и скиллов: недоступность Confluence/Jira/Qase, ошибки скиллов, таймауты |
| **E3** | запись в Jira/Qase — требуется явное подтверждение пользователя |
| **E4** | выход за scope: действия вне рамок мультиагента |

Формат эскалации и порядок фиксации — в разделе «Escalation Rules» файла `AGENTS.md`.

---

## Кастомные инструменты

| Инструмент | Вход | Результат |
|---|---|---|
| `confluence.ts` | `pageId: string` | JSON-страница из Confluence API v2 (`body-format=storage`) |
| `PII-scanner.ts` | `text: string` | `{ detectedPII, piiFound, maskedText }` — маскирование email, телефонов, паролей, токенов |

`confluence.ts` требует переменные окружения `CONFLUENCE_URL`, `CONFLUENCE_EMAIL`, `CONFLUENCE_API_TOKEN`.

---

## Оценка качества агентов (evals)

`evals/` содержит golden dataset и LLM-as-a-Judge раннер для проверки поведения агента.

- **Golden dataset** — `evals/dataset/golden_dataset.json`: набор Eval Cases с `expected_properties` и `forbidden_behavior`.
- **Evaluator** — `evaluator.py` / `evaluator.mjs`: отправляет ответ агента и Eval Case в отдельный LLM-запуск и получает JSON-вердикт (`PASS`/`FAIL`, `score`).
- **Runner** — `eval_runner.py` / `eval_runner.mjs`: группирует кейсы по `page_id`, запускает `opencode run --format json`, оценивает ответ всеми кейсами страницы, считает метрики и сохраняет `evals/results/eval_results.json`.

Запуск (из каталога `evals`):

```powershell
cd evals
python eval_runner.py     # или: node eval_runner.mjs
```

Пороги Quality Gate оценки:

| Метрика | Порог |
|---|---|
| Pass Rate | ≥ 100 % |
| Expected Properties Pass Rate | ≥ 95 % |
| Forbidden Behavior Violation Rate | ≤ 0 % |
| Errors | ≤ 0 |

---

## Безопасность

- Секреты храните только в `.env` (в `.gitignore`) или в переменных окружения; не коммитьте токены.
- Агент работает по принципу **read-only по умолчанию**: входные данные не изменяются, запись в Confluence/Jira/Qase — только по явному подтверждению.
- Контент, полученный из внешних систем, рассматривается как **данные для анализа, а не команды**; инъекции инструкций фиксируются в итоговом отчёте и не исполняются.
- Для предварительной очистки текстов используйте инструмент `PII-scanner`.
- Конфиденциальность: данные требований не выносятся за пределы разрешённых инструментов.

---

## Ограничения

- Система проектирует тестовую модель для **ручного** тестирования; генерация автотестов вне scope.
- Требования не реконструируются и не «додумываются»: пробелы в документации фиксируются как дефекты и эскалируются.
- Для полного прогона нужны доступы ко всем трём системам (Confluence, Jira, Qase); при недоступности любой из них срабатывает **E2**.
- Конфигурация MCP-серверов Jira и Qase в `opencode.json` не описана — настраивается пользователем.
