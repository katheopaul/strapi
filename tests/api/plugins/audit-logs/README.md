# Audit Logs - API Integration Tests (global)

These tests follow the repository-wide API integration test harness (jest.config.api.js) and supertest against a generated Strapi app.

## Run with the audit-logs plugin enabled

Use the `--include-audit-logs` flag to automatically link the plugin and enable it in the test app:

```powershell
node tests/scripts/run-api-tests.js --include-audit-logs
```

This will:
- Generate a fresh test app under `test-apps/api`
- Link all monorepo packages via yalc (including @strapi/plugin-audit-logs)
- Create `config/plugins.js` with `{ 'audit-logs': { enabled: true } }`
- Run the full API test suite including audit-logs tests

### Run with a specific database

```powershell
node tests/scripts/run-api-tests.js --include-audit-logs --db postgres
node tests/scripts/run-api-tests.js --include-audit-logs --db mysql
node tests/scripts/run-api-tests.js --include-audit-logs --db sqlite
```

## Notes

- Without the flag, these tests are skipped (plugin not in the generated app).
- The flag is opt-in, so CI and other contributors won't run these by default.
- Clean-up: `node tests/scripts/run-api-tests.js clean` removes `test-apps/api`.
