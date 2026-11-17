// V2-плагин: получение страницы Confluence по pageId (read-only).
// Порт `.opencode/tools/confluence.ts` (V1 API) на OpenCode V2 plugin API.
// Требует переменные окружения: CONFLUENCE_URL, CONFLUENCE_EMAIL, CONFLUENCE_API_TOKEN.
import { Plugin } from "@opencode/plugin"

export default Plugin.define({
  id: "confluence",
  async setup(ctx) {
    await ctx.tool.transform((editor) => {
      editor.add({
        name: "confluence",
        description: "Получить страницу Confluence по pageId (read-only, API v2, body-format=storage)",
        input: {
          type: "object",
          properties: {
            pageId: {
              type: "string",
              description: "Идентификатор страницы Confluence, например 2129922",
            },
          },
          required: ["pageId"],
          additionalProperties: false,
        },
        options: { codemode: true },
        async execute(input, context) {
          const pageId = (input as { pageId: string }).pageId

          if (!pageId?.trim()) {
            throw new Error("Параметр pageId обязателен")
          }

          const baseUrl = process.env.CONFLUENCE_URL
          const email = process.env.CONFLUENCE_EMAIL
          const token = process.env.CONFLUENCE_API_TOKEN

          if (!baseUrl || !email || !token) {
            throw new Error(
              "Не заданы переменные окружения Confluence: CONFLUENCE_URL, CONFLUENCE_EMAIL, CONFLUENCE_API_TOKEN",
            )
          }

          const auth = Buffer.from(`${email}:${token}`).toString("base64")
          const url = `${baseUrl.replace(/\/+$/, "")}/wiki/api/v2/pages/${encodeURIComponent(pageId)}?body-format=storage`

          const response = await fetch(url, {
            method: "GET",
            headers: {
              Authorization: `Basic ${auth}`,
              Accept: "application/json",
            },
            signal: context.signal,
          })

          if (!response.ok) {
            throw new Error(`Confluence API error: ${response.status} ${response.statusText}`)
          }

          const data = await response.json()

          return { content: JSON.stringify(data) }
        },
      })
    })
  },
})
