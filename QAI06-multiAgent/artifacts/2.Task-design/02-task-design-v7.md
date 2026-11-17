# Task Design v7 — «Мини-маркет» (Confluence 5832707 v6)

**Дата:** 2026-11-17 12:37:46
**Входной артефакт:** `artifacts/1.Requirement-review/01-requirement-review-v28.md` (`status=PASS`, QG-1 PASS)
**Источник требований:** Confluence `pageId=5832707`, version 6; снимок `artifacts/0.Inputs/page-5832707-v6-r28.md`
**Проект Jira:** `qai06-sec.test` → ключ **SCRUM** (id 10000), cloudId `5f7a693a-8db9-424d-9da1-9071ef89bbb5`
**Тип задач:** Задача (id 10003)
**Скилл:** `task-design`

```text
Write_mode: create_after_approval
```

## 0. Контекст публикации

- Подключение к Jira проверено: `atlassianUserInfo` и `getAccessibleAtlassianResources` выполнены успешно.
- В проекте SCRUM уже есть 18 задач `SCRUM-1…SCRUM-18`, созданных в предыдущем прогоне по Google Docs (`02a-jira-publication-log-v3.md`). Новый пакет спроектирован с ID `SCRUM-19…SCRUM-36`, чтобы не перезаписывать существующие ключи.
- Задачи **не публикуются**: `write_mode=create_after_approval` требует явной команды `approve 02-task-design-v7.md`.
- Секреты, ПДн и prompt-injection из §1 страницы 5832707 в задачи не переносятся. DEF-SEC-1/DEF-SEC-2/DEF-INJ-1 остаются E4.
- FR-AUTH-7 в v6 требует сброс по телефону, но действующее решение INT-7 — email. Задача SCRUM-20 устраняет DEF-54; тест-дизайн использует email как целевую модель.

---

## 1. Tasks

```text
id: SCRUM-19
title: Спроектировать тестовую модель авторизации и гостевого доступа
description:
  Контекст: FR-AUTH-1/2 задают гостевой каталог и авторизацию email+пароль только
  для оформления заявки. Нужно покрыть гостевой доступ, вход и регистрацию.
  Что сделать: подготовить проверки просмотра каталога гостем, добавления в корзину
  без входа, блокировки оформления без авторизации, входа и регистрации.
  Границы: телефон не является полем входа; подтверждение сброса вынесено в SCRUM-20.
requirements: REQ-1, REQ-2, REQ-3, REQ-4, REQ-5
component: Тест-модель
labels: test-design, auth
open_questions: —
```

```text
id: SCRUM-20
title: Устранить противоречие канала восстановления пароля
description:
  Контекст: FR-AUTH-7 v6 предписывает сброс по номеру телефона, тогда как
  FR-AUTH-2/INT-7 фиксируют email+пароль и сброс на email. Необходимо выбрать
  целевую модель, синхронизировать FR-AUTH-3 и FR-AUTH-7, описать экран и поток сброса.
  Границы: до продукт-решения тест-дизайн использует INT-7 (email); телефон остаётся
  только необязательным полем заявки.
requirements: REQ-6, REQ-14, REQ-15
component: Требования
labels: requirements, password-recovery, DEF-54, DEF-57
open_questions: —
```

```text
id: SCRUM-21
title: Задать правила валидации обязательных полей и пароля
description:
  Контекст: FR-AUTH-3 требует валидацию телефона, длины пароля и обязательных полей,
  но числовые границы не заданы. Нужно зафиксировать applying rules до тест-дизайна.
  Что сделать: описать формат телефона при заполнении, минимальную длину пароля,
  поведение при пустых полях и нормализацию номера.
requirements: REQ-6, REQ-7, REQ-8
component: Требования
labels: requirements, validation, DEF-15, DEF-16
open_questions: —
```

```text
id: SCRUM-22
title: Описать обработку ошибок авторизации и возврат к действию
description:
  Контекст: FR-AUTH-4/5 требуют понятные ошибки без внутренних деталей и возврат
  к прерванному действию после успешного входа.
  Что сделать: задать перечень сообщений, поведение при неверном пароле,
  пустых полях и возврат к оформлению корзины после логина.
requirements: REQ-9, REQ-10, REQ-11
component: Требования
labels: requirements, auth, DEF-17
open_questions: —
```

```text
id: SCRUM-23
title: Зафиксировать согласие на обработку ПДн и ссылку на политику
description:
  Контекст: FR-AUTH-6 и NFR-4 требуют обязательный чекбокс и ссылку на политику.
  Что сделать: определить момент предъявления, текст чекбокса, доступность политики
  и поведение при отказе от согласия.
requirements: REQ-12, REQ-13
component: Требования
labels: requirements, privacy, DEF-6, DEF-40
open_questions: —
```

```text
id: SCRUM-24
title: Спроектировать тестовую модель каталога товаров
description:
  Контекст: FR-CAT-1/2/4 задают карточки, статусы доступности и карточку товара.
  Что сделать: подготовить позитивные и негативные проверки отображения карточек,
  запрета добавления недоступного товара и перехода в карточку.
requirements: REQ-16, REQ-17, REQ-18, REQ-19
component: Тест-модель
labels: test-design, catalog
open_questions: —
```

```text
id: SCRUM-25
title: Зафиксировать статус поиска и сортировки каталога
description:
  Контекст: FR-CAT-3 помечен «опционально MVP», а INT-3 исключает его из MVP.
  Что сделать: явно отметить REQ-20/REQ-21 как post-MVP и исключить их из обязательного
  прогона, сохранив трассировку в документации.
requirements: REQ-20, REQ-21
component: Требования
labels: requirements, scope, DEF-4, INT-3
open_questions: —
```

```text
id: SCRUM-26
title: Спроектировать тестовую модель карточки товара
description:
  Контекст: FR-CAT-4 требует перехода на карточку с расширенным описанием.
  Что сделать: задать проверки перехода и состава расширенного описания,
  включая фото, название и цену.
requirements: REQ-22, REQ-23
component: Тест-модель
labels: test-design, catalog, DEF-21
open_questions: —
```

```text
id: SCRUM-27
title: Спроектировать операции с корзиной
description:
  Контекст: FR-CART-1/2 задают добавление, увеличение количества, изменение и удаление.
  Что сделать: подготовить позитивные, негативные и граничные проверки операций,
  включая повторное добавление и удаление позиции.
requirements: REQ-24, REQ-25, REQ-26, REQ-27
component: Тест-модель
labels: test-design, cart, DEF-9
open_questions: —
```

```text
id: SCRUM-28
title: Спроектировать расчёты и сохранение корзины
description:
  Контекст: FR-CART-3/4 требуют суммы по позициям, итог и сохранение между сессиями.
  Что сделать: подготовить проверки расчёта сумм, привязки корзины к пользователю
  и сохранения состояния в рамках браузера.
requirements: REQ-28, REQ-29, REQ-30, REQ-31
component: Тест-модель
labels: test-design, cart, DEF-10
open_questions: —
```

```text
id: SCRUM-29
title: Спроектировать пустое состояние и переход к заявке
description:
  Контекст: FR-CART-5/6 задают понятное пустое состояние и оформление заявки из корзины.
  Что сделать: подготовить проверки пустой корзины, призыва вернуться в каталог,
  сбора контактных данных и подтверждения.
requirements: REQ-32, REQ-33, REQ-34, REQ-35
component: Тест-модель
labels: test-design, cart, order
open_questions: —
```

```text
id: SCRUM-30
title: Спроектировать тестовую модель оформления заявки
description:
  Контекст: FR-ORD-1/2/3 задают состав заявки, подтверждение и фиксацию для менеджера.
  Что сделать: подготовить проверки состава корзины, итоговой суммы, контактных данных,
  подтверждения и доступности заявки менеджеру.
requirements: REQ-36, REQ-37, REQ-38, REQ-39, REQ-40, REQ-41
component: Тест-модель
labels: test-design, order, DEF-12, DEF-42
open_questions: —
```

```text
id: SCRUM-31
title: Спроектировать проверки производительности
description:
  Контекст: NFR-1 задаёт загрузку ≤3 с на 4G и отклик UI ≤500 мс.
  Что сделать: подготовить измерения времени загрузки и отклика UI с фиксированной
  методикой и синтетическими данными.
requirements: REQ-42, REQ-43
component: Тест-модель
labels: test-design, nfr, performance, DEF-24
open_questions: —
```

```text
id: SCRUM-32
title: Спроектировать проверки адаптивности
description:
  Контекст: NFR-2 требует корректной работы на мобильных, планшетах и десктопе.
  Что сделать: подготовить проверки для трёх классов устройств и BASIC-разрешений.
requirements: REQ-44, REQ-45, REQ-46
component: Тест-модель
labels: test-design, nfr, responsive, DEF-25
open_questions: —
```

```text
id: SCRUM-33
title: Спроектировать проверки безопасности
description:
  Контекст: NFR-3 требует хеширование паролей, HTTPS и защиту от XSS/CSRF.
  Что сделать: подготовить проверки хранения пароля, использования HTTPS,
  экранирования пользовательского ввода и CSRF-защиты форм.
requirements: REQ-47, REQ-48, REQ-49, REQ-50
component: Тест-модель
labels: test-design, nfr, security
open_questions: —
```

```text
id: SCRUM-34
title: Спроектировать проверки приватности и доступности
description:
  Контекст: NFR-4/NFR-5 задают 152-ФЗ, согласие на ПДн, контраст, alt-тексты
  и клавиатурную навигацию.
  Что сделать: подготовить проверки согласия,税法-аспектов в части фиксации согласия,
  контраста, alt-атрибутов и навигации с клавиатуры.
requirements: REQ-51, REQ-52, REQ-53, REQ-54, REQ-55
component: Тест-модель
labels: test-design, nfr, privacy, accessibility
open_questions: —
```

```text
id: SCRUM-35
title: Спроектировать проверки масштабируемости и наблюдаемости
description:
  Контекст: NFR-6/NFR-7 требуют готовности к росту каталога и логирования событий.
  Что сделать: подготовить проверки каталога до 50 SKU и логирования авторизации,
  добавления в корзину и заявки.
requirements: REQ-56, REQ-57, REQ-58, REQ-59
component: Тест-модель
labels: test-design, nfr, scalability, observability
open_questions: —
```

```text
id: SCRUM-36
title: Восстановить Use Cases, критерии приёмки и метрики в документе
description:
  Контекст: DEF-31/32/33/41 фиксируют отсутствие Use Cases, feature-AC и измеримых метрик.
  Что сделать: описать сквозной путь, альтернативные потоки, критерии приёмки уровня фич
  и события аналитики для BG-1…BG-4/AC-2; согласовать порядок шагов с FR-AUTH-1.
requirements: REQ-3, REQ-11, REQ-14, REQ-38, REQ-57, REQ-58, REQ-59
component: Требования
labels: requirements, use-cases, acceptance-criteria, analytics
open_questions: —
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

Все REQ-1…REQ-59 покрыты хотя бы одной задачей. REQ-20/REQ-21 учтены как post-MVP в SCRUM-25.

---

## 3. Проверка на дубли

| Пара | Вердикт | Обоснование | Рекомендация |
|---|---|---|---|
| SCRUM-20 ↔ SCRUM-21 | пересечение | SCRUM-20 — канал сброса; SCRUM-21 — валидация полей | оставить раздельно, связать Relates |
| SCRUM-27 ↔ SCRUM-28 | не дубль | операции над корзиной vs расчёты и сохранение | оставить раздельно |
| SCRUM-30 ↔ SCRUM-36 | пересечение | SCRUM-30 — тест-модель заявки; SCRUM-36 — AC/аналитика | оставить раздельно, связать Relates |
| SCRUM-31…SCRUM-35 | не дубль | разные категории NFR | оставить раздельно |

Полных дубликатовamong spроектированными задачами нет.

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

---

## 5. Эскалация

```text
тип: E3 (публикация), E1 (ESC-3), E4 (дефекты §1)
blocking: no для артефакта; yes для публикации
причина:
  write_mode=create_after_approval. Задачи SCRUM-19…SCRUM-36 не создавались.
  ESC-3 (DEF-54) требует продукт-решения; SCRUM-20 подготовлена для устранения.
  DEF-SEC-1/DEF-SEC-2/DEF-INJ-1 требуют действий владельца страницы/ИБ.
запрашиваемое действие:
  команда approve 02-task-design-v7.md — для создания 18 задач в Jira SCRUM.
  При наличии существующих SCRUM-1…SCRUM-18 подтвердить, что создаётся новый пакет,
  а не переиспользуются старые ключи.
```

---

## 6. Заключение

18 задач покрывают все 59 требований Confluence 5832707 v6 (100 %). Статус QG-2 — PASS. Публикация в Jira не выполнялась: требуется явное подтверждение. DEфекты §1 и DEF-54 зафиксированы как E4/E1 и не додумываются.

*Отчёт сформирован skill `task-design`; `write_mode=create_after_approval` соблюдён.*
