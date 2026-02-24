---
id: til-rmo1
status: closed
deps: []
links: []
created: 2026-02-24T19:54:18Z
type: task
priority: 2
assignee: John Wilkinson
parent: til-wmtr
---
# Extract model config into worker/models.json

Models are currently hardcoded constants in worker/src/index.ts (MODEL and WHISPER_MODEL on lines 6-7), and worker/src/index.test.ts duplicates WHISPER_MODEL. Create worker/models.json with model IDs and operational settings only -- no pricing data. Example: {"text":{"id":"@cf/meta/llama-3.1-8b-instruct-awq","maxTokens":1024},"whisper":{"id":"@cf/openai/whisper"}}. Update worker/src/index.ts to import model IDs from this config. Update worker/src/index.test.ts to import from the same config and remove the duplicated WHISPER_MODEL constant. The file must be checked in (not gitignored). The rl.ts cost command will also read this file for model IDs when querying the Cloudflare API.

