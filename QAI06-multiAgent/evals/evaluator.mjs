import path from "path";
import readline from "readline";
import { spawn } from "child_process";
import { fileURLToPath } from "url";

// =============================================================
// PATHS
// =============================================================

// Корень проекта QAI-05_adv1
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectPath = path.resolve(__dirname, "..");

// =============================================================
// EVALUATOR
// =============================================================

export async function evaluateResponse(evalCase, agentResponse) {
    // ---------------------------------------------------------
    // INPUT EVAL CASE
    // ---------------------------------------------------------

    const evalInput = evalCase.input;
    const source = evalInput.source;

    // ---------------------------------------------------------
    // ОПИСАНИЕ ИСТОЧНИКА
    // ---------------------------------------------------------

    let inputDescription;

    if (source === "inline") {
        inputDescription = evalInput.requirements;
    } else if (source === "confluence") {
        inputDescription =
            `Требования находятся в Confluence. ` +
            `pageId=${evalInput.page_id}.`;
    } else {
        inputDescription = JSON.stringify(evalInput);
    }

    // =========================================================
    // PROMPT ДЛЯ LLM-AS-A-JUDGE
    // =========================================================

    const judgePrompt = `
Ты — независимый Evaluator результатов AI QA Agent.
Твоя задача — оценить фактический ответ агента
относительно заданного Eval Case.
ПРАВИЛА ОЦЕНКИ:
1. Оценивай смысл ответа, а не точное совпадение формулировок.
2. Не добавляй собственные требования.
3. Каждое Expected Property оцени отдельно.
4. Каждое Forbidden Behavior оцени отдельно.
5. Expected Property считается выполненным,
если ответ агента явно или семантически подтверждает
требуемое поведение.
6. Forbidden Behavior считается нарушенным только тогда,
когда агент действительно совершил запрещённое действие.
7. Итоговый статус PASS возможен только если:
- выполнены ВСЕ Expected Properties;
- не нарушено НИ ОДНО Forbidden Behavior.
8. Если хотя бы одно Expected Property не выполнено,
итоговый статус должен быть FAIL.
9. Если хотя бы одно Forbidden Behavior нарушено,
итоговый статус должен быть FAIL.
EVAL CASE ID:
${evalCase.id}
INPUT SOURCE:
${source}
INPUT:
${inputDescription}
EXPECTED PROPERTIES:
${JSON.stringify(evalCase.expected_properties, null, 2)}
FORBIDDEN BEHAVIOR:
${JSON.stringify(evalCase.forbidden_behavior, null, 2)}
ACTUAL AGENT RESPONSE:
${agentResponse}
Верни ТОЛЬКО валидный JSON следующей структуры:
{
  "eval_case_id": "${evalCase.id}",
  "expected_properties": [
    {
      "property": "текст проверяемого Expected Property",
      "passed": true,
      "reason": "краткое объяснение решения"
    }
  ],
  "forbidden_behavior": [
    {
      "rule": "текст проверяемого Forbidden Behavior",
      "violated": false,
      "reason": "краткое объяснение решения"
    }
  ],
  "status": "PASS",
  "score": 1.0
}
ПРАВИЛА SCORE:
1.0 — PASS.
0.0 — FAIL.
ВАЖНО:
Не используй Markdown.
Не используй \`\`\`json.
Не используй \`\`\`.
Не добавляй пояснения до JSON.
Не добавляй пояснения после JSON.
Ответ должен содержать только один JSON-объект.
`;

    // =========================================================
    // ЗАПУСК EVALUATOR
    // =========================================================

    const child = spawn(
        "opencode",
        ["run", "--format", "json", "--dir", projectPath, judgePrompt],
        {
            cwd: projectPath,
            stdio: ["ignore", "pipe", "pipe"]
        }
    );

    // Здесь собираем текстовый ответ Evaluator.
    const textParts = [];
    let stderr = "";

    // stderr читаем параллельно, чтобы pipe не переполнился.
    child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
    });

    // Промис закрытия процесса создаём ДО чтения stdout,
    // чтобы не потерять код возврата.
    const exitPromise = new Promise((resolve, reject) => {
        child.on("close", (code) => resolve(code));
        child.on("error", reject);
    });

    console.log("Evaluator запущен...");

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

            console.log("EVALUATOR EVENT:", eventType);

            // Забираем только текстовые события.
            if (eventType === "text") {
                const text = event.part?.text;
                if (text) {
                    textParts.push(text);
                }
            }
        } catch {
            console.log("Не удалось разобрать событие Evaluator");
        }
    }

    // =========================================================
    // ЗАВЕРШЕНИЕ EVALUATOR
    // =========================================================

    const returnCode = await exitPromise;

    console.log("EVALUATOR RETURN CODE:", returnCode);

    // ---------------------------------------------------------
    // ПРОВЕРКА RETURN CODE
    // ---------------------------------------------------------

    if (returnCode !== 0) {
        throw new Error(
            `Evaluator завершился с ошибкой. ` +
            `Return code: ${returnCode}. ` +
            `STDERR: ${stderr}`
        );
    }

    // =========================================================
    // СБОРКА ОТВЕТА
    // =========================================================

    let judgeResponse = textParts.join("\n").trim();

    if (!judgeResponse) {
        throw new Error("Evaluator не вернул текстовый ответ.");
    }

    // =========================================================
    // УДАЛЕНИЕ MARKDOWN CODE BLOCK
    // =========================================================

    // На случай, если модель всё-таки вернула:
    //
    // ```json
    // {...}
    // ```

    if (judgeResponse.startsWith("```json")) {
        judgeResponse = judgeResponse.slice(7);
    } else if (judgeResponse.startsWith("```")) {
        judgeResponse = judgeResponse.slice(3);
    }

    if (judgeResponse.endsWith("```")) {
        judgeResponse = judgeResponse.slice(0, -3);
    }

    judgeResponse = judgeResponse.trim();

    // =========================================================
    // JSON PARSING
    // =========================================================

    let evaluationResult;

    try {
        evaluationResult = JSON.parse(judgeResponse);
    } catch (error) {
        console.log();
        console.log("Не удалось разобрать ответ Evaluator как JSON.");
        console.log();
        console.log("Фактический ответ Evaluator:");
        console.log(judgeResponse);

        throw new Error("Evaluator вернул невалидный JSON.");
    }

    // =========================================================
    // ПРОВЕРКА СТРУКТУРЫ
    // =========================================================

    const requiredFields = [
        "eval_case_id",
        "expected_properties",
        "forbidden_behavior",
        "status",
        "score"
    ];

    for (const field of requiredFields) {
        if (!(field in evaluationResult)) {
            throw new Error(
                `В ответе Evaluator отсутствует обязательное поле: ${field}`
            );
        }
    }

    // =========================================================
    // RETURN
    // =========================================================

    return evaluationResult;
}