---
id: til-wmtr
status: open
deps: []
links: []
created: 2026-02-24T19:53:54Z
type: epic
priority: 2
assignee: John Wilkinson
---
# Epic: Rewrite rl and srv tools in TypeScript + add cost command

Rewrite the rl and srv CLI tools from bash to TypeScript (using tsx), porting all existing features first, then adding model config extraction and a new ./rl cost command that fetches spend data live from the Cloudflare API. All pricing data is fetched live -- never stored on disk.

