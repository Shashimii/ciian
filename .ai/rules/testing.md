---
paths:
  - "**"
---

# Tests Only On Request

The project is in beta and is deliberately not building an automated suite yet.
Treat the absence of tests as a current decision, not an oversight to correct.

- Do NOT create, write, or generate test files unless the user explicitly asks for tests.
- Do NOT add new test cases to existing test files unless the user explicitly asks.
- This includes Pest/PHPUnit feature tests, unit tests, browser tests, and any frontend tests.
- Skip test scaffolding even when creating models, controllers, or other files that would normally get a test.
- If verification is needed and the user has not asked for tests, prefer manual reasoning or ask before writing any test.
