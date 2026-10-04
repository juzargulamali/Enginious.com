// LOCAL REHEARSAL of scripts/hosted-verify/run.cjs against the stand-ins. This proves the script works; it is NOT a hosted result.
const { spawnSync } = require("child_process");
const r = spawnSync("node", ["scripts/hosted-verify/run.cjs"], { stdio: "inherit", env: { ...process.env, HOSTED_MODE: "local-rehearsal", HOSTED_BASE_URL: process.argv[2] || "http://localhost:3300", ADMIN_EMAIL: "admin@test.local", ADMIN_PASSWORD: "correct-horse-battery", EDITOR_EMAIL: "editor@test.local", EDITOR_PASSWORD: "correct-horse-battery", HOSTED_RESULT_FILE: "/tmp/claude-0/final/rehearsal.json" } });
process.exit(r.status ?? 1);
