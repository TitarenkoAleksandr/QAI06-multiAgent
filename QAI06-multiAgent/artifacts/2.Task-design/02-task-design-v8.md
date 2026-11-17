# Task Design v8 — «Мини-маркет» (Confluence 5832707 v6)

**Дата:** 2026-11-17 13:15:13
**Входной артефакт:** `artifacts/1.Requirement-review/01-requirement-review-v29.md` (`status=PASS`, QG-1 PASS)
**Источник требований:** Confluence `pageId=5832707`, version 6; снимок `artifacts/0.Inputs/page-5832707-v6-r29.md`
**Проект Jira (задан пользователем):** `qst` → ключ **QST**, id **10034**, имя «qai06-sec.test»
**Тип задач:** Задача (id 10049)
**Скилл:** `task-design`

```text
Write_mode: create_after_approval
```

## 0. Контекст публикации

| Проверка | Результат |
|---|---|
| Подключение к Jira (`atlassianUserInfo`, `getAccessibleAtlassianResources`) | успешно, cloudId `5f7a693a-8db9-424d-9da1-9071ef89bbb5` |
| Проект `QST` | существует, id 10034, имя «qai06-sec.test» |
| Тип задачи «Задача» | id 10049 |
| Текущее число задач в QST | **0** (проект пуст, JQL `project = QST`) |
| Явная команда `approve 02-task-design-v8.md` | **не получена** |

- Проект `QST` пуст, поэтому пакет спроектирован с нуля; после публикации ключи будут `QST-1…QST-18`.
- Задачи **не создавались**: `write_mode=create_after_approval` требует явной команды.
- Секреты, ПДн и prompt-injection из §1 страницы 5832707 в задачи не переносятся (DEF-SEC-1/DEF-SEC-2/DEF-INJ-1 — E4).
- FR-AUTH-7 в v6 требует сброс по телефону, действующее решение INT-7 — email. Задача QST-2 устраняет DEF-54; тест-дизайн использует email как целевую модель.
- FR-CAT-3 (REQ-20/21) — post-MVP по INT-3; задача QST-7 фиксирует статус и не исключает требования из трассировки.

---

## 1. Tasks

```text
id: QST-1
title: Спроектировать тестовую модель авторизации и гостевого доступа
description:
  Контекст: FR-AUTH-1/2 задают гостевой каталог и авторизацию email+пароль
  только для оформления заявки.
  Что сделать: подготовить проверки просмотра каталога гостем, добавления в корзину
  без входа, блокировки оформления без авторизации, входа и регистрации.
  Границы: телефон не является полем входа; канал сброса пароля вынесен в QST-2.
requirements: REQ-1, REQ-2, REQ-3, REQ-4, REQ-5
component: Тест-модель
labels: test-design, auth
open_questions: —
priority: High
```

```text
id: QST-2
title: Устранить противоречие канала восстановления пароля (FR-AUTH-7 vs INT-7)
description:
  Контекст: FR-AUTH-7 требует сброса по номеру телефона, тогда как FR-AUTH-2/INT-7
  фиксируют email+пароль и сброс на email. DEF-54/DEF-57.
  Что сделать: выбрать целевую модель, синхронизировать FR-AUTH-3 и FR-AUTH-7,
  описать экран и поток сброса, срок жизни ссылки и лимит повторной отправки.
  Границы: до продуктового решения тест-дизайн использует email (INT-7);
  телефон остаётся необязательным полем заявки.
requirements: REQ-6, REQ-14, REQ-15
component: Требования
labels: requirements, password-recovery, DEF-54, DEF-57, ESC-3
open_questions: —
priority: Highest
```

```text
id: QST-3
title: Задать правила валидации обязательных полей, email и пароля
description:
  Контекст: FR-AUTH-3 требует валидацию телефона, минимальную длину пароля и
  обязательные поля, но числовые границы не заданы (DEF-15, DEF-16, DEF-54a).
  Что сделать: зафиксировать формат email, минимальную длину пароля, набор
  обязательных полей, нормализацию телефона при заполнении заявки.
requirements: REQ-6, REQ-7, REQ-8
component: Требования
labels: requirements, validation, DEF-15, DEF-16, DEF-54a
open_questions: —
priority: High
```

```text
id: QST-4
title: Описать обработку ошибок авторизации и возврат к прерванному действию
description:
  Контекст: FR-AUTH-4/5 требуют понятные ошибки без внутренних деталей и возврат
  к прерванному действию после успешного входа (DEF-17).
  Что сделать: задать перечень и тексты сообщений, поведение при неверном пароле
  и пустых полях, возврат к оформлению корзины после логина.
requirements: REQ-9, REQ-10, REQ-11
component: Требования
labels: requirements, auth, DEF-17
open_questions: —
priority: High
```

```text
id: QST-5
title: Зафиксировать согласие на обработку ПДн и ссылку на политику
description:
  Контекст: FR-AUTH-6 и NFR-4 требуют обязательный чекбокс и ссылку на политику;
  момент предъявления согласия не определён (DEF-6, DEF-40).
  Что сделать: определить момент предъявления, текст чекбокса, доступность политики
  и поведение при отказе от согласия.
requirements: REQ-12, REQ-13
component: Требования
labels: requirements, privacy, DEF-6, DEF-40
open_questions: —
priority: High
```

```text
id: QST-6
title: Спроектировать тестовую модель каталога и карточки товара
description:
  Контекст: FR-CAT-1/2/4 задают карточки, статусы доступности и карточку товара
  с расширенным описанием (DEF-8, DEF-21).
  Что сделать: подготовить проверки состава карточки, отображения статуса,
  запрета добавления недоступного товара, перехода в карточку и её содержимого.
requirements: REQ-16, REQ-17, REQ-18, REQ-19, REQ-22, REQ-23
component: Тест-модель
labels: test-design, catalog, DEF-8
open_questions: —
priority: High
```

```text
id: QST-7
title: Зафиксировать статус поиска и сортировки каталога (FR-CAT-3)
description:
  Контекст: FR-CAT-3 помечен «опционально MVP», INT-3 исключает его из MVP (DEF-4).
  Что сделать: явно отметить REQ-20/REQ-21 как post-MVP и исключить их из
  обязательного прогона, сохранив трассировку в документе требований.
requirements: REQ-20, REQ-21
component: Требования
labels: requirements, scope, DEF-4, INT-3
open_questions: —
priority: Medium
```

```text
id: QST-8
title: Спроектировать операции с корзиной
description:
  Контекст: FR-CART-1/2 задают добавление, увеличение количества, изменение и
  удаление; границы количества не заданы (DEF-9).
  Что сделать: подготовить позитивные, негативные и граничные проверки операций,
  включая повторное добавление и удаление позиции.
requirements: REQ-24, REQ-25, REQ-26, REQ-27
component: Тест-модель
labels: test-design, cart, DEF-9
open_questions: —
priority: High
```

```text
id: QST-9
title: Спроектировать расчёты и сохранение корзины
description:
  Контекст: FR-CART-3/4 требуют суммы по позициям, итог и сохранение между
  сессиями; правила округления/скидок/доставки/НДС не заданы (DEF-10), поведение
  при смене пользователя не задано (DEF-7).
  Что сделать: подготовить проверки расчёта сумм, привязки корзины к пользователю
  и сохранения состояния в рамках браузера.
requirements: REQ-28, REQ-29, REQ-30, REQ-31
component: Тест-модель
labels: test-design, cart, DEF-7, DEF-10
open_questions: —
priority: High
```

```text
id: QST-10
title: Спроектировать пустое состояние корзины и переход к заявке
description:
  Контекст: FR-CART-5/6 задают понятное пустое состояние и оформление заявки из корзины.
  Что сделать: подготовить проверки пустой корзины, призыва вернуться в каталог,
  сбора контактных данных и подтверждения перед отправкой.
requirements: REQ-32, REQ-33, REQ-34, REQ-35
component: Тест-модель
labels: test-design, cart, order
open_questions: —
priority: High
```

```text
id: QST-11
title: Спроектировать тестовую модель оформления заявки
description:
  Контекст: FR-ORD-1/2/3 задают состав заявки, подтверждение и фиксацию для
  менеджера; состав контактных полей не определён (DEF-42), способ фиксации — на
  усмотрение реализации (DEF-12).
  Что сделать: подготовить проверки состава корзины, итоговой суммы, контактных
  данных, подтверждения и доступности заявки менеджеру.
requirements: REQ-36, REQ-37, REQ-38, REQ-39, REQ-40, REQ-41
component: Тест-модель
labels: test-design, order, DEF-12, DEF-42
open_questions: —
priority: Highest
```

```text
id: QST-12
title: Спроектировать проверки производительности
description:
  Контекст: NFR-1 задаёт загрузку ≤ 3 с на 4G и отклик UI ≤ 500 мс; методика
  измерений не задана (DEF-24).
  Что сделать: зафиксировать методику и условия измерений, подготовить проверки
  времени загрузки лендинга и отклика UI.
requirements: REQ-42, REQ-43
component: Тест-модель
labels: test-design, nfr, performance, DEF-24
open_questions: —
priority: Medium
```

```text
id: QST-13
title: Спроектировать проверки адаптивности
description:
  Контекст: NFR-2 требует корректной работы на мобильных, планшетах и десктопе;
  список устройств и разрешений не задан (DEF-25).
  Что сделать: зафиксировать набор устройств/разрешений и подготовить проверки
  трёх классов устройств.
requirements: REQ-44, REQ-45, REQ-46
component: Тест-модель
labels: test-design, nfr, responsive, DEF-25
open_questions: —
priority: High
```

```text
id: QST-14
title: Спроектировать проверки безопасности
description:
  Контекст: NFR-3 требует хеширование паролей, HTTPS и защиту от XSS/CSRF.
  Что сделать: подготовить проверки хранения паролей, использования HTTPS,
  экранирования пользовательского ввода и CSRF-защиты форм.
requirements: REQ-47, REQ-48, REQ-49, REQ-50
component: Тест-модель
labels: test-design, nfr, security
open_questions: —
priority: Highest
```

```text
id: QST-15
title: Спроектировать проверки приватности и доступности
description:
  Контекст: NFR-4/NFR-5 задают 152-ФЗ, согласие на ПДн, контраст, alt-тексты и
  клавиатурную навигацию; измеримые пороги доступности не заданы (DEF-26…DEF-29).
  Что сделать: подготовить проверки факта фиксации согласия, контраста,
  alt-атрибутов и навигации с клавиатуры.
requirements: REQ-51, REQ-52, REQ-53, REQ-54, REQ-55
component: Тест-модель
labels: test-design, nfr, privacy, accessibility
open_questions: —
priority: Medium
```

```text
id: QST-16
title: Спроектировать проверки масштабируемости и наблюдаемости
description:
  Контекст: NFR-6/NFR-7 требуют готовности к росту каталога (≈50 SKU, CON-8) и
  логирования ключевых событий.
  Что сделать: подготовить проверки работы каталога до 50 SKU и наличия логов
  авторизации, добавления в корзину и оформления заявки.
requirements: REQ-56, REQ-57, REQ-58, REQ-59
component: Тест-модель
labels: test-design, nfr, scalability, observability
open_questions: —
priority: Medium
```

```text
id: QST-17
title: Восстановить Use Cases и критерии приёмки уровня функциональности
description:
  Контекст: DEF-31/32 — Use Cases и feature-level AC отсутствуют; AC-1/AC-3
  неизмеримы (DEF-33, DEF-41).
  Что сделать: описать сквозной путь и альтернативные потоки, порядок шагов
  согласовать с FR-AUTH-1, добавить критерии приёмки для FR и NFR.
requirements: REQ-3, REQ-11, REQ-14, REQ-38, REQ-39, REQ-40
component: Требования
labels: requirements, use-cases, acceptance-criteria, DEF-31, DEF-32
open_questions: —
priority: High
```

```text
id: QST-18
title: Задать события аналитики и метрики BG-1…BG-4
description:
  Контекст: BG-1…BG-4 задают KPI, но требования на сбор событий отсутствуют;
  AC-2 требует логирования без перечня событий (DEF-33, DEF-50).
  Что сделать: определить события воронки «визит → авторизация → корзина →
  заявка», связь с NFR-7 и способ проверки KPI.
requirements: REQ-57, REQ-58, REQ-59
component: Требования
labels: requirements, analytics, metrics, BG-1, BG-2, BG-3, BG-4
open_questions: —
priority: Medium
```

---

## 2. Покрытие требований

| Показатель | Значение |
|---|---|
| `total_count_req` | 59 |
| `count_covered_reqs` | 59 |
| `coverage_req_task` | **100 %** |
| `total_tasks_count` | 18 |
| `count_tasks_without_reqs` | 0 |
| `count_not_covered_req` | 0 |
| `count_tasks_with_open_questions` | 0 |
| `duplicates` | 0 |

### Матрица покрытия REQ → задачи

| REQ | Задачи |
|---|---|
| REQ-1, REQ-2, REQ-4, REQ-5 | QST-1 |
| REQ-3 | QST-1, QST-17 |
| REQ-6 | QST-2, QST-3 |
| REQ-7, REQ-8 | QST-3 |
| REQ-9, REQ-10 | QST-4 |
| REQ-11 | QST-4, QST-17 |
| REQ-12, REQ-13 | QST-5 |
| REQ-14 | QST-2, QST-17 |
| REQ-15 | QST-2 |
| REQ-16…REQ-19 | QST-6 |
| REQ-20, REQ-21 | QST-7 |
| REQ-22, REQ-23 | QST-6 |
| REQ-24…REQ-27 | QST-8 |
| REQ-28…REQ-31 | QST-9 |
| REQ-32…REQ-35 | QST-10 |
| REQ-36…REQ-41 | QST-11 |
| REQ-38, REQ-39, REQ-40 | QST-11, QST-17 |
| REQ-42, REQ-43 | QST-12 |
| REQ-44…REQ-46 | QST-13 |
| REQ-47…REQ-50 | QST-14 |
| REQ-51…REQ-55 | QST-15 |
| REQ-56 | QST-16 |
| REQ-57, REQ-58, REQ-59 | QST-16, QST-18 |

---

## 3. Проверка на дубли

| Пара | Вердикт | Обоснование | Рекомендация |
|---|---|---|---|
| QST-2 ↔ QST-3 | пересечение | QST-2 — канал сброса; QST-3 — правила валидации | оставить раздельно, связать Relates |
| QST-8 ↔ QST-9 | не дубль | операции над корзиной vs расчёты и сохранение | оставить раздельно |
| QST-11 ↔ QST-17 | пересечение | QST-11 — тест-модель заявки; QST-17 — Use Cases и AC | оставить раздельно, связать Relates |
| QST-12…QST-16 | не дубль | разные категории NFR | оставить раздельно |

Полных дубликатов среди спроектированных задач нет.

---

## 4. Статус

```text
Статус:
  total_tasks_count: 18
  count_tasks_without_reqs: 0
  count_not_covered_req: 0
  count_tasks_with_open_questions: 0
  duplicates: 0
  status: PASS
```

| Gate | Результат |
|---|---|
| **QG-2 (Task Design)** | **PASS** |

---

## 5. Эскалация

```text
тип:          E3 (публикация), E1 (ESC-3), E4 (дефекты §1)
blocking:     no для артефакта; yes для публикации
причина:
  write_mode=create_after_approval. Задачи QST-1…QST-18 не создавались.
  Проект QST пуст, конфликтов ключей нет.
  ESC-3 (DEF-54) требует продуктового решения; QST-2 подготовлена для устранения.
  DEF-SEC-1/DEF-SEC-2/DEF-INJ-1 требуют действий владельца страницы/ИБ.
сохранённые данные и артефакты:
  - artifacts/2.Task-design/02-task-design-v8.md (этот отчёт)
  - artifacts/2.Task-design/02a-jira-publication-log-v5.md
запрашиваемое действие:
  - команда `approve 02-task-design-v8.md` — создание 18 задач (QST-1…QST-18)
    в Jira QST.
```

---

## 6. Заключение

18 задач покрывают все 59 требований Confluence 5832707 v6 (**100 %**). Статус QG-2 — **PASS**, дублей нет. В Jira `QST` ничего не создавалось: требуется явное подтверждение. Дефекты §1 и DEF-54 зафиксированы как E4/E1 и не додумываются.

*Отчёт сформирован skill `task-design`; `write_mode=create_after_approval` соблюдён.*
