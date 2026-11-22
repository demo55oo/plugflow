import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { ComposioIcon } from "./icon";

const composioPlugin: IntegrationPlugin = {
  type: "composio",
  label: "Composio",
  description: "Run any tool from 1,000+ apps with managed authentication",

  icon: ComposioIcon,

  formFields: [
    {
      id: "composioApiKey",
      label: "API Key",
      type: "password",
      placeholder: "ak_...",
      configKey: "composioApiKey",
      envVar: "COMPOSIO_API_KEY",
      helpText: "Get your API key from ",
      helpLink: {
        text: "platform.composio.dev",
        url: "https://platform.composio.dev",
      },
    },
    {
      id: "composioUserId",
      label: "User ID",
      type: "text",
      placeholder: "default",
      configKey: "composioUserId",
      envVar: "COMPOSIO_USER_ID",
      helpText:
        "The Composio user whose connected accounts are used. Leave empty for default.",
    },
  ],

  testConfig: {
    getTestFunction: async () => {
      const { testComposio } = await import("./test");
      return testComposio;
    },
  },

  actions: [
    {
      slug: "execute-tool",
      label: "Execute Tool",
      description: "Run any Composio tool by its slug",
      category: "Composio",
      stepFunction: "composioExecuteToolStep",
      stepImportPath: "execute-tool",
      outputFields: [
        { field: "data", description: "Data returned by the tool" },
        { field: "logId", description: "Composio execution log ID" },
      ],
      configFields: [
        {
          key: "toolSlug",
          label: "Tool",
          type: "template-input",
          placeholder: "GITHUB_CREATE_AN_ISSUE",
          example: "GMAIL_SEND_EMAIL",
          required: true,
        },
        {
          key: "toolArguments",
          label: "Arguments (JSON)",
          type: "template-textarea",
          placeholder:
            '{"owner": "acme", "repo": "website", "title": "{{Trigger.title}}"}',
          example: '{"owner": "vercel", "repo": "next.js", "title": "Bug"}',
          rows: 6,
        },
        {
          key: "userId",
          label: "User ID (optional)",
          type: "template-input",
          placeholder: "Overrides the User ID set on the connection",
        },
      ],
    },
  ],
};

// Auto-register on import
registerIntegration(composioPlugin);

export default composioPlugin;
