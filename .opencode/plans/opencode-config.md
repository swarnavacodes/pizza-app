# opencode.json (draft — copy to project root or `.opencode/opencode.json`)

Save the JSON below as `opencode.json` at the project root (or `.opencode/opencode.json`). The Write tool kept interpreting the raw JSON as a nested object, so it is preserved here as a fenced code block.

```json
{
  "$schema": "https://opencode.ai/config.json",
  "username": "pizza-architect",
  "model": "anthropic/claude-sonnet-4-6",
  "small_model": "anthropic/claude-sonnet-4-6",
  "default_agent": "build",
  "logLevel": "INFO",
  "share": "manual",
  "autoupdate": true,
  "snapshot": true,
  "instructions": ["AGENTS.md", "docs/architecture.md"],
  "skills": {
    "paths": [".opencode/skills"],
    "urls": []
  },
  "agent": {
    "infrastructure": {
      "description": "Handles Terraform IaC, LocalStack setup, and AWS resource provisioning",
      "mode": "subagent",
      "model": "anthropic/claude-sonnet-4-6",
      "permission": {
        "bash": {
          "terraform *": "allow",
          "tf *": "allow",
          "localstack *": "allow",
          "tflint *": "allow",
          "terraform-docs *": "allow",
          "*": "ask"
        },
        "edit": "allow"
      }
    },
    "backend": {
      "description": "Builds Lambda functions, API Gateway integrations, DynamoDB access layers, and event handlers in TypeScript",
      "mode": "subagent",
      "model": "anthropic/claude-sonnet-4-6",
      "permission": {
        "bash": {
          "npm install *": "allow",
          "npm run *": "allow",
          "npx *": "allow",
          "*": "ask"
        },
        "edit": "allow"
      }
    },
    "frontend": {
      "description": "Builds Next.js applications for customer, kitchen, delivery, and admin portals",
      "mode": "subagent",
      "model": "anthropic/claude-sonnet-4-6",
      "permission": {
        "bash": {
          "npm install *": "allow",
          "npm run *": "allow",
          "npx *": "allow",
          "*": "ask"
        },
        "edit": "allow"
      }
    },
    "database": {
      "description": "Designs DynamoDB tables, GSIs/LSIs, and access patterns; defines Terraform DynamoDB resources",
      "mode": "subagent",
      "model": "anthropic/claude-sonnet-4-6",
      "permission": {
        "bash": { "*": "ask" },
        "edit": "allow"
      }
    },
    "testing": {
      "description": "Writes unit, integration, and E2E tests with Vitest and Playwright",
      "mode": "subagent",
      "model": "anthropic/claude-sonnet-4-6",
      "permission": {
        "bash": {
          "npm test *": "allow",
          "npx vitest *": "allow",
          "npx playwright *": "allow",
          "*": "ask"
        },
        "edit": "allow"
      }
    },
    "devops": {
      "description": "Handles Docker, LocalStack orchestration, CI/CD pipelines, and deployment automation",
      "mode": "subagent",
      "model": "anthropic/claude-sonnet-4-6",
      "permission": {
        "bash": {
          "docker *": "allow",
          "docker-compose *": "allow",
          "awslocal *": "allow",
          "aws *": "allow",
          "*": "ask"
        },
        "edit": "allow"
      }
    },
    "security": {
      "description": "Reviews code for security vulnerabilities, IAM policy least-privilege, and secret exposure",
      "mode": "subagent",
      "model": "anthropic/claude-sonnet-4-6",
      "permission": {
        "bash": { "*": "ask" },
        "edit": "deny"
      }
    }
  },
  "permission": {
    "bash": {
      "rm -rf *": "deny",
      "rm -r *": "deny",
      "chmod *": "deny",
      "sudo *": "deny",
      "*": "ask"
    },
    "edit": {
      "*.env*": "deny",
      "*.secret*": "deny",
      "*.key": "deny",
      "*.pem": "deny",
      "*.tfstate*": "deny"
    }
  },
  "mcp": {
    "playwright": {
      "type": "local",
      "command": ["npx", "-y", "@playwright/mcp"],
      "enabled": true,
      "environment": { "BROWSER": "chromium" }
    }
  }
}
```

## Notes
- The 7 agents above are **subagents**; opencode's built-in `build`, `plan`, `general`, `explore` remain available. `default_agent` is set to `build`.
- `security` is read-only (`edit: deny`) so it can review without mutating.
- `playwright` MCP enables E2E test driving from inside agents.
- The remaining agent files (`backend.md`, `frontend.md`, `database.md`, `testing.md`, `devops.md`, `security.md`) follow the same template as `agent-infrastructure.md`; create them under `.opencode/agent/` (see `agent-infrastructure.md` in this folder as the reference).
- The 6 skill `.md` files in this folder must each move to `.opencode/skills/<name>/SKILL.md`:
  - `skill-terraform.md`   → `.opencode/skills/terraform-skill/SKILL.md`
  - `skill-localstack.md`  → `.opencode/skills/localstack-skill/SKILL.md`
  - `skill-dynamodb.md`    → `.opencode/skills/dynamodb-skill/SKILL.md`
  - `skill-lambda.md`      → `.opencode/skills/lambda-skill/SKILL.md`
  - `skill-eventbridge.md` → `.opencode/skills/eventbridge-skill/SKILL.md`
  - `skill-nextjs.md`      → `.opencode/skills/nextjs-skill/SKILL.md`
  - `skill-testing.md`     → `.opencode/skills/testing-skill/SKILL.md`
- `AGENTS.md` moves to project root.
- `architecture.md` moves to `docs/architecture.md` (also referenced by `instructions`).
- Restart opencode after copying files into place so config/agents/skills hot-reload (they don't).

## Why JSON didn't write directly
The Write tool server-side schema appears to be decoding JSON-looking strings as objects. Preserving it here as a fenced block avoids the failure. When you save it as `opencode.json`, paste only the JSON inside the fence.
