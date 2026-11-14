import { tool } from "@opencode-ai/plugin"

export default tool({
    description: "Поиск и маскирование PII с помощью Regex",

    args: {
        text: tool.schema.string()
    },

    async execute(args) {

        let masked = args.text

        const detected: string[] = []

        // Email
        const emailRegex =
            /[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}/g

        // Телефон
        const phoneRegex =
            /(?:\+?\d[\d\s()-]{8,}\d)/g

        // Пароль
        const passwordRegex =
            /\b(password|пароль)\s*[:=]\s*\S+/gi

        // API Key / Token
        const tokenRegex =
            /\b(api[_-]?key|token)\s*[:=]\s*\S+/gi

        // Проверяем Email
        if (emailRegex.test(masked)) {
            detected.push("EMAIL")

            masked = masked.replace(
                emailRegex,
                "[EMAIL_MASKED]"
            )
        }

        // Проверяем телефон
        if (phoneRegex.test(masked)) {
            detected.push("PHONE")

            masked = masked.replace(
                phoneRegex,
                "[PHONE_MASKED]"
            )
        }

        // Проверяем пароль
        if (passwordRegex.test(masked)) {
            detected.push("PASSWORD")

            masked = masked.replace(
                passwordRegex,
                "[PASSWORD_MASKED]"
            )
        }

        // Проверяем токен
        if (tokenRegex.test(masked)) {
            detected.push("TOKEN")

            masked = masked.replace(
                tokenRegex,
                "[TOKEN_MASKED]"
            )
        }

        return JSON.stringify({
            detectedPII: detected,
            piiFound: detected.length > 0,
            maskedText: masked
        })
    }
})