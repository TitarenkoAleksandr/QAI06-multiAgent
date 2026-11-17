// V2-плагин: поиск и маскирование PII с помощью Regex.
// Порт `.opencode/tools/PII-scanner.ts` (V1 API) на OpenCode V2 plugin API.
// Собственных переменных окружения не требует.
import { Plugin } from "@opencode/plugin"

const EMAIL_REGEX = /[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}/g
const PHONE_REGEX = /(?:\+?\d[\d\s()-]{8,}\d)/g
const PASSWORD_REGEX = /\b(password|пароль)\s*[:=]\s*\S+/gi
const TOKEN_REGEX = /\b(api[_-]?key|token)\s*[:=]\s*\S+/gi

interface Rule {
  readonly label: string
  readonly regex: RegExp
  readonly mask: string
}

// Порядок важен: пароли и токены маскируются раньше телефонов,
// иначе цифровые значения внутри секретов могут быть приняты за телефон.
const RULES: readonly Rule[] = [
  { label: "PASSWORD", regex: PASSWORD_REGEX, mask: "[PASSWORD_MASKED]" },
  { label: "TOKEN", regex: TOKEN_REGEX, mask: "[TOKEN_MASKED]" },
  { label: "EMAIL", regex: EMAIL_REGEX, mask: "[EMAIL_MASKED]" },
  { label: "PHONE", regex: PHONE_REGEX, mask: "[PHONE_MASKED]" },
]

function scanAndMask(text: string): { detectedPII: string[]; piiFound: boolean; maskedText: string } {
  const detectedPII: string[] = []
  let maskedText = text

  for (const rule of RULES) {
    // `g`-regex хранит lastIndex между вызовами — сбрасываем перед каждым использованием.
    rule.regex.lastIndex = 0
    if (!rule.regex.test(maskedText)) continue

    detectedPII.push(rule.label)
    rule.regex.lastIndex = 0
    maskedText = maskedText.replace(rule.regex, rule.mask)
  }

  return { detectedPII, piiFound: detectedPII.length > 0, maskedText }
}

export default Plugin.define({
  id: "pii-scanner",
  async setup(ctx) {
    await ctx.tool.transform((editor) => {
      editor.add({
        name: "pii_scanner",
        description:
          "Поиск и маскирование PII с помощью Regex (email, телефон, пароль, api-key/token). Возвращает JSON: detectedPII, piiFound, maskedText",
        input: {
          type: "object",
          properties: {
            text: {
              type: "string",
              description: "Текст для проверки на персональные данные",
            },
          },
          required: ["text"],
          additionalProperties: false,
        },
        options: { codemode: true },
        async execute(input) {
          const text = (input as { text: string }).text

          if (typeof text !== "string") {
            throw new Error("Параметр text обязателен и должен быть строкой")
          }

          return { content: JSON.stringify(scanAndMask(text)) }
        },
      })
    })
  },
})
