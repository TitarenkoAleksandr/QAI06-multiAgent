import fs from "fs";
import path from "path";
import readline from "readline";
import { spawn } from "child_process";
import { fileURLToPath } from "url";

import { evaluateResponse } from "./evaluator.js";

// =============================================================
// PATHS
// =============================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectPath = path.resolve(__dirname, "..");

const datasetPath = path.join(__dirname, "dataset", "golden_dataset.json");

// =============================================================
// QUALITY GATE THRESHOLDS
// =============================================================

const MIN_PASS_RATE = 100.0;
const MIN_EXPECTED_PROPERTIES_PASS_RATE = 95.0;
const MAX_FORBIDDEN_BEHAVIOR_VIOLATION_RATE = 0.0;
const MAX_ERRORS = 0;

// =============================================================
// ЗАГРУЗКА GOLDEN DATASET
// =============================================================

const evalCases = JSON.parse(fs.readFileSync(datasetPath, "utf-8"));

const evalResults = [];

// =============================================================
// ГРУППИРОВКА EVAL CASES ПО СТРАНИЦЕ CONFLUENCE
// =============================================================

const casesByPage = {};

for (const evalCase of evalCases) {
    const evalInput = evalCase.input;
    const source = evalInput.source;

    if (source !== "confluence") {
        throw new Error(
            `Eval Case ${evalCase.id} использует неподдерживаемый источник: ${source}`
        );
    }

    const pageId = evalInput.page_id;

    if (!(pageId in casesByPage)) {
        casesByPage[pageId] = [];
    }

    casesByPage[pageId].push(evalCase);
}

// -------------------------------------------------------------
// helpers
// -------------------------------------------------------------

const round1 = (n) => Math.round(n * 10) / 10;
const round2 = (n) => Math.round(n * 100) / 100;

// =============================================================
// ЗАПУСК QA AGENT
// =============================================================

for (const [pageId, pageEvalCases] of Object.entries(casesByPage)) {
    console.log();
    console.log("=".repeat(80));
    console.log("ЗАПУСК QA AGENT");
    console.log("=".repeat(80));

    console.log();
    console.log("Источник требований: Confluence");
    console.log(`pageId: ${pageId}`);
    console.log(
        `Количество Eval Cases для этой страницы: ${pageEvalCases.length}`
    );
    console.log();

    // =========================================================
    // PROMPT ДЛЯ QA AGENT
    // =========================================================

    const prompt = `Получи требования из Confluence со страницы pageId=${pageId} и выполни их анализ.`;

    // =========================================================
    // ЗАПУСК OPENCODE
    // =========================================================

    const child = spawn(
        "opencode",
        ["run", "--format", "json", "--dir", projectPath, prompt],
        {
            cwd: projectPath,
            stdio: ["ignore", "pipe", "pipe"]
        }
    );

    const textParts = [];
    let stderr = "";

    child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
    });

    const exitPromise = new Promise((resolve, reject) => {
        child.on("close", resolve);
        child.on("error", reject);
    });

    console.log("QA Agent запущен...");

    // =========================================================
    // ЧТЕНИЕ JSON EVENTS
    // =========================================================

    const rl = readline.createInterface({ input: child.stdout });

    for await (const rawLine of rl) {
        const line = rawLine.trim();
        if (!line) continue;

        try {
            const event = JSON.parse(line);
            const eventType = event.type;

            console.log("AGENT EVENT:", eventType);

            if (eventType === "text") {
                const text = event.part?.text;
                if (text) {
                    textParts.push(text);
                }
            }
        } catch {
            console.log("Не удалось разобрать событие OpenCode");
        }
    }

    // =========================================================
    // ЗАВЕРШЕНИЕ QA AGENT
    // =========================================================

    const returnCode = await exitPromise;

    const agentResponse = textParts.join("\n").trim();

    console.log();
    console.log("QA AGENT RETURN CODE:", returnCode);

    // =========================================================
    // ОБРАБОТКА ОШИБКИ QA AGENT
    // =========================================================

    if (returnCode !== 0) {
        console.log("QA Agent завершился с ошибкой.");

        if (stderr) {
            console.log(stderr);
        }

        for (const evalCase of pageEvalCases) {
            evalResults.push({
                id: evalCase.id,
                name: evalCase.name,
                status: "ERROR",
                score: 0.0,
                expected_properties: [],
                forbidden_behavior: []
            });
        }

        continue;
    }

    // =========================================================
    // ПРОВЕРКА ПУСТОГО ОТВЕТА
    // =========================================================

    if (!agentResponse) {
        console.log("QA Agent не вернул текстовый ответ.");

        for (const evalCase of pageEvalCases) {
            evalResults.push({
                id: evalCase.id,
                name: evalCase.name,
                status: "ERROR",
                score: 0.0,
                expected_properties: [],
                forbidden_behavior: []
            });
        }

        continue;
    }

    // =========================================================
    // ВЫВОД ОТВЕТА QA AGENT
    // =========================================================

    console.log();
    console.log("=".repeat(80));
    console.log("ОТВЕТ QA AGENT");
    console.log("=".repeat(80));
    console.log(agentResponse);
    console.log("=".repeat(80));

    // =========================================================
    // EVALUATION
    // =========================================================

    for (const evalCase of pageEvalCases) {
        console.log();
        console.log();
        console.log("-".repeat(80));
        console.log(`Evaluation: ${evalCase.id}`);
        console.log(`Название: ${evalCase.name}`);
        console.log("-".repeat(80));
        console.log();
        console.log("Запускаем Evaluator...");

        try {
            const evaluationResult = await evaluateResponse(evalCase, agentResponse);

            console.log();
            console.log("=".repeat(80));
            console.log("РЕЗУЛЬТАТ EVALUATION");
            console.log("=".repeat(80));
            console.log(JSON.stringify(evaluationResult, null, 2));
            console.log("=".repeat(80));

            const status = evaluationResult.status;
            const score = evaluationResult.score;

            evalResults.push({
                id: evalCase.id,
                name: evalCase.name,
                status,
                score,
                expected_properties: evaluationResult.expected_properties,
                forbidden_behavior: evaluationResult.forbidden_behavior
            });

            console.log();
            console.log("EVAL CASE:", evalCase.id);
            console.log("STATUS:", status);
            console.log("SCORE:", score);
        } catch (error) {
            console.log();
            console.log("Ошибка Evaluator:");
            console.log(error);

            evalResults.push({
                id: evalCase.id,
                name: evalCase.name,
                status: "ERROR",
                score: 0.0,
                expected_properties: [],
                forbidden_behavior: []
            });
        }
    }
}

// =============================================================
// EVALUATION SUMMARY
// =============================================================

console.log();
console.log();
console.log("=".repeat(80));
console.log("EVALUATION SUMMARY");
console.log("=".repeat(80));

// =============================================================
// BASIC METRICS
// =============================================================

const total = evalResults.length;

const passed = evalResults.filter((r) => r.status === "PASS").length;
const failed = evalResults.filter((r) => r.status === "FAIL").length;
const errors = evalResults.filter((r) => r.status === "ERROR").length;

// =============================================================
// PASS RATE
// =============================================================

const passRate = total > 0 ? (passed / total) * 100 : 0.0;

// =============================================================
// AVERAGE SCORE
// =============================================================

const averageScore =
    total > 0
        ? evalResults.reduce((sum, r) => sum + r.score, 0) / total
        : 0.0;

// =============================================================
// EXPECTED PROPERTIES PASS RATE
// =============================================================

let totalExpectedProperties = 0;
let passedExpectedProperties = 0;

for (const result of evalResults) {
    const expectedProperties = result.expected_properties ?? [];

    for (const expectedProperty of expectedProperties) {
        totalExpectedProperties += 1;

        if (expectedProperty.passed === true) {
            passedExpectedProperties += 1;
        }
    }
}

const expectedPropertiesPassRate =
    totalExpectedProperties > 0
        ? (passedExpectedProperties / totalExpectedProperties) * 100
        : 0.0;

// =============================================================
// FORBIDDEN BEHAVIOR VIOLATION RATE
// =============================================================

let totalForbiddenBehaviors = 0;
let violatedForbiddenBehaviors = 0;

for (const result of evalResults) {
    const forbiddenBehaviors = result.forbidden_behavior ?? [];

    for (const forbiddenBehavior of forbiddenBehaviors) {
        totalForbiddenBehaviors += 1;

        if (forbiddenBehavior.violated === true) {
            violatedForbiddenBehaviors += 1;
        }
    }
}

const forbiddenBehaviorViolationRate =
    totalForbiddenBehaviors > 0
        ? (violatedForbiddenBehaviors / totalForbiddenBehaviors) * 100
        : 0.0;

// =============================================================
// BASIC METRICS OUTPUT
// =============================================================

console.log();
console.log(`Total:         ${total}`);
console.log(`Passed:        ${passed}`);
console.log(`Failed:        ${failed}`);
console.log(`Errors:        ${errors}`);
console.log(`Pass Rate:     ${passRate.toFixed(1)}%`);
console.log(`Average Score: ${averageScore.toFixed(2)}`);

// =============================================================
// QUALITY METRICS OUTPUT
// =============================================================

console.log();
console.log("QUALITY METRICS");
console.log("-".repeat(80));

console.log(
    `Expected Properties:                 ${passedExpectedProperties}/${totalExpectedProperties}`
);
console.log(
    `Expected Properties Pass Rate:       ${expectedPropertiesPassRate.toFixed(1)}%`
);
console.log(
    `Forbidden Behaviors Violated:        ${violatedForbiddenBehaviors}/${totalForbiddenBehaviors}`
);
console.log(
    `Forbidden Behavior Violation Rate:   ${forbiddenBehaviorViolationRate.toFixed(1)}%`
);

// =============================================================
// РЕЗУЛЬТАТЫ ПО КАЖДОМУ EVAL CASE
// =============================================================

console.log();
console.log("-".repeat(80));

for (const result of evalResults) {
    console.log(
        `${String(result.id).padEnd(10)}${String(result.status).padEnd(10)}Score: ${result.score}`
    );
}

console.log("-".repeat(80));

// =============================================================
// QUALITY GATE
// =============================================================

const passRateGate = passRate >= MIN_PASS_RATE;
const expectedPropertiesGate =
    expectedPropertiesPassRate >= MIN_EXPECTED_PROPERTIES_PASS_RATE;
const forbiddenBehaviorGate =
    forbiddenBehaviorViolationRate <= MAX_FORBIDDEN_BEHAVIOR_VIOLATION_RATE;
const errorsGate = errors <= MAX_ERRORS;

const qualityGatePassed = [
    passRateGate,
    expectedPropertiesGate,
    forbiddenBehaviorGate,
    errorsGate
].every(Boolean);

const overallStatus = qualityGatePassed ? "PASS" : "FAIL";

// =============================================================
// QUALITY GATE OUTPUT
// =============================================================

console.log();
console.log("=".repeat(80));
console.log("QUALITY GATE");
console.log("=".repeat(80));
console.log();

console.log(
    `Pass Rate >= ${MIN_PASS_RATE.toFixed(1)}%: ` +
    `${passRateGate ? "PASS" : "FAIL"} (actual: ${passRate.toFixed(1)}%)`
);
console.log(
    `Expected Properties >= ${MIN_EXPECTED_PROPERTIES_PASS_RATE.toFixed(1)}%: ` +
    `${expectedPropertiesGate ? "PASS" : "FAIL"} (actual: ${expectedPropertiesPassRate.toFixed(1)}%)`
);
console.log(
    `Forbidden Behavior <= ${MAX_FORBIDDEN_BEHAVIOR_VIOLATION_RATE.toFixed(1)}%: ` +
    `${forbiddenBehaviorGate ? "PASS" : "FAIL"} (actual: ${forbiddenBehaviorViolationRate.toFixed(1)}%)`
);
console.log(
    `Errors <= ${MAX_ERRORS}: ` +
    `${errorsGate ? "PASS" : "FAIL"} (actual: ${errors})`
);

console.log();
console.log("QUALITY GATE STATUS:", overallStatus);
console.log("=".repeat(80));

// =============================================================
// СОХРАНЕНИЕ РЕЗУЛЬТАТОВ
// =============================================================

const resultsDir = path.join(__dirname, "results");
fs.mkdirSync(resultsDir, { recursive: true });

const resultsFile = path.join(resultsDir, "eval_results.json");

// =============================================================
// JSON REPORT
// =============================================================

const report = {
    // ---------------------------------------------------------
    // SUMMARY
    // ---------------------------------------------------------

    summary: {
        total,
        passed,
        failed,
        errors,
        pass_rate: round1(passRate),
        average_score: round2(averageScore),
        expected_properties_pass_rate: round1(expectedPropertiesPassRate),
        forbidden_behavior_violation_rate: round1(forbiddenBehaviorViolationRate),
        overall_status: overallStatus
    },

    // ---------------------------------------------------------
    // METRICS
    // ---------------------------------------------------------

    metrics: {
        expected_properties: {
            total: totalExpectedProperties,
            passed: passedExpectedProperties,
            pass_rate: round1(expectedPropertiesPassRate)
        },

        forbidden_behavior: {
            total: totalForbiddenBehaviors,
            violated: violatedForbiddenBehaviors,
            violation_rate: round1(forbiddenBehaviorViolationRate)
        }
    },

    // ---------------------------------------------------------
    // QUALITY GATE
    // ---------------------------------------------------------

    quality_gate: {
        status: overallStatus,

        criteria: {
            pass_rate: {
                threshold: MIN_PASS_RATE,
                actual: round1(passRate),
                passed: passRateGate
            },

            expected_properties_pass_rate: {
                threshold: MIN_EXPECTED_PROPERTIES_PASS_RATE,
                actual: round1(expectedPropertiesPassRate),
                passed: expectedPropertiesGate
            },

            forbidden_behavior_violation_rate: {
                threshold: MAX_FORBIDDEN_BEHAVIOR_VIOLATION_RATE,
                actual: round1(forbiddenBehaviorViolationRate),
                passed: forbiddenBehaviorGate
            },

            errors: {
                threshold: MAX_ERRORS,
                actual: errors,
                passed: errorsGate
            }
        }
    },

    // ---------------------------------------------------------
    // EVAL CASE RESULTS
    // ---------------------------------------------------------

    results: evalResults
};

// =============================================================
// ЗАПИСЬ JSON
// =============================================================

fs.writeFileSync(resultsFile, JSON.stringify(report, null, 2), "utf-8");

console.log();
console.log(`Результаты сохранены: ${resultsFile}`);