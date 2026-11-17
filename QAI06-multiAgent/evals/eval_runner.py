import argparse
import json
import re
import subprocess
import threading
from pathlib import Path

from evaluator import evaluate_response


# =============================================================
# WRITE MODE
# =============================================================

VALID_WRITE_MODES = (
    "artifact_only",
    "create_after_approval",
)

DEFAULT_WRITE_MODE = "artifact_only"


def parse_args():

    parser = argparse.ArgumentParser(
        description="Запуск evals для QA Agent"
    )

    parser.add_argument(
        "--write-mode",
        choices=VALID_WRITE_MODES,
        default=DEFAULT_WRITE_MODE,
        help=(
            "Режим записи для прогона. "
            "Может быть переопределён в eval_case "
            "через input.write_mode."
        )
    )

    return parser.parse_args()


args = parse_args()


# =============================================================
# PATHS
# =============================================================

project_path = Path(__file__).resolve().parent.parent

dataset_path = (
        Path(__file__).parent
        / "dataset"
        / "golden_dataset.json"
)


results_dir = (
        Path(__file__).parent
        / "results"
)


# Имена вида eval_results_v1.json, eval_results_v2.json, ...
RESULTS_FILE_PATTERN = re.compile(r"^eval_results_v(\d+)\.json$")


def get_next_results_path():
    """
    Возвращает путь eval_results_v{N}.json.

    N = максимальный номер существующей версии + 1.
    Если версий ещё нет, возвращается eval_results_v1.json.
    Старый неверсионированный eval_results.json игнорируется.
    """
    results_dir.mkdir(parents=True, exist_ok=True)

    max_version = 0

    for path in results_dir.iterdir():
        if not path.is_file():
            continue

        match = RESULTS_FILE_PATTERN.match(path.name)
        if match:
            max_version = max(max_version, int(match.group(1)))

    return results_dir / f"eval_results_v{max_version + 1}.json"


# =============================================================
# QUALITY GATE THRESHOLDS
# =============================================================

# Минимально допустимый процент успешно пройденных Eval Cases.
MIN_PASS_RATE = 100.0

# Минимально допустимый процент выполненных Expected Properties.
MIN_EXPECTED_PROPERTIES_PASS_RATE = 95.0

# Максимально допустимый процент нарушенных Forbidden Behavior.
MAX_FORBIDDEN_BEHAVIOR_VIOLATION_RATE = 0.0

# Допустимое количество технических ошибок.
MAX_ERRORS = 0


# =============================================================
# ЗАГРУЗКА GOLDEN DATASET
# =============================================================

with open(
        dataset_path,
        "r",
        encoding="utf-8"
) as file:

    eval_cases = json.load(file)


eval_results = []


# =============================================================
# ГРУППИРОВКА EVAL CASES ПО СТРАНИЦЕ CONFLUENCE И WRITE MODE
# =============================================================

cases_by_page = {}


for eval_case in eval_cases:

    eval_input = eval_case["input"]

    source = eval_input.get("source")


    if source != "confluence":

        raise RuntimeError(
            f"Eval Case {eval_case['id']} использует "
            f"неподдерживаемый источник: {source}"
        )


    page_id = eval_input["page_id"]

    # Значение из прогона (CLI), может быть переопределено
    # конкретным Eval Case через input.write_mode.
    write_mode = eval_input.get(
        "write_mode",
        args.write_mode
    )

    if write_mode not in VALID_WRITE_MODES:
        raise RuntimeError(
            f"Eval Case {eval_case['id']} использует "
            f"неподдерживаемый write_mode: {write_mode}"
        )


    group_key = (page_id, write_mode)


    if group_key not in cases_by_page:

        cases_by_page[group_key] = []


    cases_by_page[group_key].append(
        eval_case
    )


# =============================================================
# ЗАПУСК QA AGENT
# =============================================================

for (page_id, write_mode), page_eval_cases in cases_by_page.items():

    print()
    print("=" * 80)
    print("ЗАПУСК QA AGENT")
    print("=" * 80)

    print()
    print("Источник требований: Confluence")
    print(f"pageId: {page_id}")
    print(f"write_mode: {write_mode}")

    print(
        f"Количество Eval Cases для этой страницы: "
        f"{len(page_eval_cases)}"
    )

    print()


    # =========================================================
    # PROMPT ДЛЯ QA AGENT
    # =========================================================

    # Runner передаёт агенту только исходную задачу.
    #
    # Expected Properties и Forbidden Behavior
    # агенту не передаются.

    prompt = (
        f"Получи требования из Confluence "
        f"со страницы pageId={page_id} "
        f"и выполни их анализ. "
        f"Прогон выполняется в режиме "
        f"write_mode={write_mode}. "
        f"Допустимые значения write_mode: "
        f"artifact_only (по умолчанию) — спроектированные задачи "
        f"и тест-кейсы публикуются только в артефактах; "
        f"create_after_approval — запись в Jira/Qase только после "
        f"явного подтверждения пользователя. "
        f"Соблюдай выбранный write_mode и явно укажи его в отчёте."
    )


    # =========================================================
    # ЗАПУСК OPENCODE
    # =========================================================

    # В opencode v2.x у подкоманды `run` нет флага --dir:
    # рабочий каталог задаётся через cwd.
    #
    # stderr читается в отдельном потоке, иначе заполнение
    # буфера stderr блокирует процесс и чтение stdout зависает.

    process = subprocess.Popen(
        [
            "opencode",
            "run",
            "--format",
            "json",
            prompt
        ],
        cwd=project_path,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
        errors="replace",
        bufsize=1
    )


    stderr_parts = []


    def read_stderr():

        if process.stderr is None:
            return

        for stderr_line in process.stderr:

            stderr_parts.append(
                stderr_line
            )


    stderr_thread = threading.Thread(
        target=read_stderr,
        daemon=True
    )

    stderr_thread.start()


    text_parts = []


    print("QA Agent запущен...")


    # =========================================================
    # ЧТЕНИЕ JSON EVENTS
    # =========================================================

    if process.stdout:

        for line in process.stdout:

            line = line.strip()


            if not line:
                continue


            try:

                event = json.loads(line)

                event_type = event.get("type")


                print(
                    "AGENT EVENT:",
                    event_type,
                    flush=True
                )


                if event_type == "text":

                    part = event.get(
                        "part",
                        {}
                    )

                    text = part.get(
                        "text"
                    )


                    if text:

                        text_parts.append(
                            text
                        )


            except json.JSONDecodeError:

                # Печатаем саму строку: без неё невозможно
                # понять, что именно пришло в stdout
                # (например, справка CLI вместо событий).

                print(
                    "Не удалось разобрать "
                    "событие OpenCode:",
                    repr(line[:300]),
                    flush=True
                )


    # =========================================================
    # ЗАВЕРШЕНИЕ QA AGENT
    # =========================================================

    return_code = process.wait()

    stderr_thread.join(
        timeout=5
    )


    stderr = "".join(
        stderr_parts
    )


    agent_response = "\n".join(
        text_parts
    ).strip()


    print()

    print(
        "QA AGENT RETURN CODE:",
        return_code
    )


    # =========================================================
    # ОБРАБОТКА ОШИБКИ QA AGENT
    # =========================================================

    if return_code != 0:

        print(
            "QA Agent завершился с ошибкой."
        )


        if stderr:

            print(stderr)


        for eval_case in page_eval_cases:

            eval_results.append(
                {
                    "id": eval_case["id"],
                    "name": eval_case["name"],
                    "status": "ERROR",
                    "score": 0.0,
                    "expected_properties": [],
                    "forbidden_behavior": []
                }
            )


        continue


    # =========================================================
    # ПРОВЕРКА ПУСТОГО ОТВЕТА
    # =========================================================

    if not agent_response:

        print(
            "QA Agent не вернул "
            "текстовый ответ."
        )


        for eval_case in page_eval_cases:

            eval_results.append(
                {
                    "id": eval_case["id"],
                    "name": eval_case["name"],
                    "status": "ERROR",
                    "score": 0.0,
                    "expected_properties": [],
                    "forbidden_behavior": []
                }
            )


        continue


    # =========================================================
    # ВЫВОД ОТВЕТА QA AGENT
    # =========================================================

    print()
    print("=" * 80)
    print("ОТВЕТ QA AGENT")
    print("=" * 80)

    print(agent_response)

    print("=" * 80)


    # =========================================================
    # EVALUATION
    # =========================================================

    # Один фактический Agent Response
    # проверяется всеми Eval Cases этой страницы.

    for eval_case in page_eval_cases:

        print()
        print()

        print("-" * 80)

        print(
            f"Evaluation: "
            f"{eval_case['id']}"
        )

        print(
            f"Название: "
            f"{eval_case['name']}"
        )

        print("-" * 80)

        print()
        print("Запускаем Evaluator...")


        try:

            evaluation_result = evaluate_response(
                eval_case,
                agent_response
            )


            print()
            print("=" * 80)
            print("РЕЗУЛЬТАТ EVALUATION")
            print("=" * 80)


            print(
                json.dumps(
                    evaluation_result,
                    ensure_ascii=False,
                    indent=2
                )
            )


            print("=" * 80)


            status = evaluation_result[
                "status"
            ]

            score = evaluation_result[
                "score"
            ]


            eval_results.append(
                {
                    "id": eval_case["id"],
                    "name": eval_case["name"],
                    "status": status,
                    "score": score,

                    "expected_properties":
                        evaluation_result[
                            "expected_properties"
                        ],

                    "forbidden_behavior":
                        evaluation_result[
                            "forbidden_behavior"
                        ]
                }
            )


            print()

            print(
                "EVAL CASE:",
                eval_case["id"]
            )

            print(
                "STATUS:",
                status
            )

            print(
                "SCORE:",
                score
            )


        except Exception as error:

            print()
            print("Ошибка Evaluator:")
            print(error)


            eval_results.append(
                {
                    "id": eval_case["id"],
                    "name": eval_case["name"],
                    "status": "ERROR",
                    "score": 0.0,
                    "expected_properties": [],
                    "forbidden_behavior": []
                }
            )


# =============================================================
# EVALUATION SUMMARY
# =============================================================

print()
print()

print("=" * 80)
print("EVALUATION SUMMARY")
print("=" * 80)


# =============================================================
# BASIC METRICS
# =============================================================

total = len(eval_results)


passed = sum(
    1
    for result in eval_results
    if result["status"] == "PASS"
)


failed = sum(
    1
    for result in eval_results
    if result["status"] == "FAIL"
)


errors = sum(
    1
    for result in eval_results
    if result["status"] == "ERROR"
)


# =============================================================
# PASS RATE
# =============================================================

if total > 0:

    pass_rate = (
                        passed / total
                ) * 100

else:

    pass_rate = 0.0


# =============================================================
# AVERAGE SCORE
# =============================================================

if total > 0:

    average_score = (
            sum(
                result["score"]
                for result in eval_results
            )
            / total
    )

else:

    average_score = 0.0


# =============================================================
# EXPECTED PROPERTIES PASS RATE
# =============================================================

total_expected_properties = 0

passed_expected_properties = 0


for result in eval_results:

    expected_properties = result.get(
        "expected_properties",
        []
    )


    for expected_property in expected_properties:

        total_expected_properties += 1


        if expected_property.get(
                "passed"
        ) is True:

            passed_expected_properties += 1


if total_expected_properties > 0:

    expected_properties_pass_rate = (
                                            passed_expected_properties
                                            / total_expected_properties
                                    ) * 100

else:

    expected_properties_pass_rate = 0.0


# =============================================================
# FORBIDDEN BEHAVIOR VIOLATION RATE
# =============================================================

total_forbidden_behaviors = 0

violated_forbidden_behaviors = 0


for result in eval_results:

    forbidden_behaviors = result.get(
        "forbidden_behavior",
        []
    )


    for forbidden_behavior in forbidden_behaviors:

        total_forbidden_behaviors += 1


        if forbidden_behavior.get(
                "violated"
        ) is True:

            violated_forbidden_behaviors += 1


if total_forbidden_behaviors > 0:

    forbidden_behavior_violation_rate = (
                                                violated_forbidden_behaviors
                                                / total_forbidden_behaviors
                                        ) * 100

else:

    forbidden_behavior_violation_rate = 0.0


# =============================================================
# BASIC METRICS OUTPUT
# =============================================================

print()

print(
    f"Total:         {total}"
)

print(
    f"Passed:        {passed}"
)

print(
    f"Failed:        {failed}"
)

print(
    f"Errors:        {errors}"
)

print(
    f"Pass Rate:     "
    f"{pass_rate:.1f}%"
)

print(
    f"Average Score: "
    f"{average_score:.2f}"
)


# =============================================================
# QUALITY METRICS OUTPUT
# =============================================================

print()

print("QUALITY METRICS")

print("-" * 80)


print(
    f"Expected Properties:                 "
    f"{passed_expected_properties}/"
    f"{total_expected_properties}"
)


print(
    f"Expected Properties Pass Rate:       "
    f"{expected_properties_pass_rate:.1f}%"
)


print(
    f"Forbidden Behaviors Violated:        "
    f"{violated_forbidden_behaviors}/"
    f"{total_forbidden_behaviors}"
)


print(
    f"Forbidden Behavior Violation Rate:   "
    f"{forbidden_behavior_violation_rate:.1f}%"
)


# =============================================================
# РЕЗУЛЬТАТЫ ПО КАЖДОМУ EVAL CASE
# =============================================================

print()

print("-" * 80)


for result in eval_results:

    print(
        f"{result['id']:<10}"
        f"{result['status']:<10}"
        f"Score: {result['score']}"
    )


print("-" * 80)


# =============================================================
# QUALITY GATE
# =============================================================

# Теперь решение о допуске принимается
# на основании измеримых метрик.


# -------------------------------------------------------------
# ПРОВЕРКА PASS RATE
# -------------------------------------------------------------

pass_rate_gate = (
        pass_rate
        >= MIN_PASS_RATE
)


# -------------------------------------------------------------
# ПРОВЕРКА EXPECTED PROPERTIES
# -------------------------------------------------------------

expected_properties_gate = (
        expected_properties_pass_rate
        >= MIN_EXPECTED_PROPERTIES_PASS_RATE
)


# -------------------------------------------------------------
# ПРОВЕРКА FORBIDDEN BEHAVIOR
# -------------------------------------------------------------

forbidden_behavior_gate = (
        forbidden_behavior_violation_rate
        <= MAX_FORBIDDEN_BEHAVIOR_VIOLATION_RATE
)


# -------------------------------------------------------------
# ПРОВЕРКА ERRORS
# -------------------------------------------------------------

errors_gate = (
        errors
        <= MAX_ERRORS
)


# =============================================================
# OVERALL QUALITY GATE
# =============================================================

quality_gate_passed = all(
    [
        pass_rate_gate,
        expected_properties_gate,
        forbidden_behavior_gate,
        errors_gate
    ]
)


if quality_gate_passed:

    overall_status = "PASS"

else:

    overall_status = "FAIL"


# =============================================================
# QUALITY GATE OUTPUT
# =============================================================

print()
print("=" * 80)
print("QUALITY GATE")
print("=" * 80)


print()

print(
    f"Pass Rate >= {MIN_PASS_RATE:.1f}%: "
    f"{'PASS' if pass_rate_gate else 'FAIL'} "
    f"(actual: {pass_rate:.1f}%)"
)


print(
    f"Expected Properties >= "
    f"{MIN_EXPECTED_PROPERTIES_PASS_RATE:.1f}%: "
    f"{'PASS' if expected_properties_gate else 'FAIL'} "
    f"(actual: {expected_properties_pass_rate:.1f}%)"
)


print(
    f"Forbidden Behavior <= "
    f"{MAX_FORBIDDEN_BEHAVIOR_VIOLATION_RATE:.1f}%: "
    f"{'PASS' if forbidden_behavior_gate else 'FAIL'} "
    f"(actual: {forbidden_behavior_violation_rate:.1f}%)"
)


print(
    f"Errors <= {MAX_ERRORS}: "
    f"{'PASS' if errors_gate else 'FAIL'} "
    f"(actual: {errors})"
)


print()
print(
    "QUALITY GATE STATUS:",
    overall_status
)

print("=" * 80)


# =============================================================
# СОХРАНЕНИЕ РЕЗУЛЬТАТОВ
# =============================================================

results_dir.mkdir(
    parents=True,
    exist_ok=True
)


# Каждый прогон пишет результат в новый файл версии:
# eval_results_v1.json, eval_results_v2.json, ...
results_file = get_next_results_path()


# =============================================================
# JSON REPORT
# =============================================================

report = {

    # ---------------------------------------------------------
    # SUMMARY
    # ---------------------------------------------------------

    "summary": {

        "total": total,

        "passed": passed,

        "failed": failed,

        "errors": errors,

        "pass_rate": round(
            pass_rate,
            1
        ),

        "average_score": round(
            average_score,
            2
        ),

        "expected_properties_pass_rate": round(
            expected_properties_pass_rate,
            1
        ),

        "forbidden_behavior_violation_rate": round(
            forbidden_behavior_violation_rate,
            1
        ),

        "overall_status": overall_status
    },


    # ---------------------------------------------------------
    # METRICS
    # ---------------------------------------------------------

    "metrics": {

        "expected_properties": {

            "total":
                total_expected_properties,

            "passed":
                passed_expected_properties,

            "pass_rate": round(
                expected_properties_pass_rate,
                1
            )
        },


        "forbidden_behavior": {

            "total":
                total_forbidden_behaviors,

            "violated":
                violated_forbidden_behaviors,

            "violation_rate": round(
                forbidden_behavior_violation_rate,
                1
            )
        }
    },


    # ---------------------------------------------------------
    # QUALITY GATE
    # ---------------------------------------------------------

    "quality_gate": {

        "status": overall_status,

        "criteria": {

            "pass_rate": {
                "threshold": MIN_PASS_RATE,
                "actual": round(
                    pass_rate,
                    1
                ),
                "passed": pass_rate_gate
            },

            "expected_properties_pass_rate": {
                "threshold":
                    MIN_EXPECTED_PROPERTIES_PASS_RATE,

                "actual": round(
                    expected_properties_pass_rate,
                    1
                ),

                "passed":
                    expected_properties_gate
            },

            "forbidden_behavior_violation_rate": {
                "threshold":
                    MAX_FORBIDDEN_BEHAVIOR_VIOLATION_RATE,

                "actual": round(
                    forbidden_behavior_violation_rate,
                    1
                ),

                "passed":
                    forbidden_behavior_gate
            },

            "errors": {
                "threshold": MAX_ERRORS,
                "actual": errors,
                "passed": errors_gate
            }
        }
    },


    # ---------------------------------------------------------
    # EVAL CASE RESULTS
    # ---------------------------------------------------------

    "results": eval_results
}


# =============================================================
# ЗАПИСЬ JSON
# =============================================================

with open(
        results_file,
        "w",
        encoding="utf-8"
) as file:

    json.dump(
        report,
        file,
        ensure_ascii=False,
        indent=2
    )


print()

print(
    f"Результаты сохранены: "
    f"{results_file}"
)