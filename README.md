# CareBuddy MCP
 
**A voice-first caregiver companion for Alexa+, built as a self-hosted MCP server.**
 
Built for the Amazon hackathon, **Alexa+ track** (with the **Open Source** mini challenge).
 
CareBuddy lets family caregivers look after an older relative by voice: track medications, log daily check-ins, and get a plain-language summary that flags anything worth a phone call.
 
> "Alexa, Mum took her Metformin."
> "Alexa, log a check-in for Mum, mood 4, she went for a walk."
> "Alexa, how is Mum doing today?"
 
---
 
## The problem
 
Millions of people care for a parent or grandparent who lives alone, often in another city. Missed medication and unnoticed low mood are two of the biggest risks, and caregivers mostly find out too late or by worrying. Voice is the interface that older adults and busy caregivers already use, so the answer should be one sentence away.
 
## What it does
 
CareBuddy exposes four tools to Alexa+ over the Model Context Protocol:
 
| Tool | What it does | Example phrase |
|---|---|---|
| `list_medications` | Lists today's medications with taken/pending status; can show pending only | "What medicines are left today?" |
| `mark_medication_taken` | Records that a medication was taken (case-insensitive name match) | "Mum took her Metformin" |
| `log_checkin` | Saves a mood score (1-5) and an optional note | "Check-in, mood 4, she went for a walk" |
| `daily_summary` | Combines adherence and mood into one summary and flags concerns | "How is Mum doing today?" |
 
`daily_summary` flags three situations: doses still pending, a low average mood (2 or below), and no check-in yet today. If none apply, it reports that all is good.
 
## How it works
 
```
 Alexa+  ──(MCP, Streamable HTTP, JSON-RPC)──▶  POST /mcp  ──▶  Express app
                                                                   │
                                          new McpServer + StreamableHTTPServerTransport per request
                                                                   │
                                     list_medications · mark_medication_taken
                                     log_checkin · daily_summary   (zod-validated inputs)
                                                                   │
                                                          in-memory demo data
```
 
- **Protocol:** MCP spec **2025-11-25**, **Streamable HTTP** transport, using the official `@modelcontextprotocol/sdk`.
- **Stateless:** every request builds a fresh server and transport (`sessionIdGenerator: undefined`), which keeps the server simple and easy to scale horizontally.
- **Validation:** every tool input is described and validated with `zod` (for example, mood must be an integer from 1 to 5).
- **Errors:** an unknown medication returns an MCP `isError` result instead of crashing.
- **Data:** the demo uses in-memory data (three sample medications) and resets on restart.
Everything lives in one readable file, [`server.mjs`](server.mjs).
 
## Getting started
 
**Requirements:** Node.js 18 or newer.
 
```bash
git clone https://github.com/OmkarMishra56/carebuddy-mcp
cd carebuddy-mcp
npm install
npm start
```
 
The server listens on `http://localhost:3000/mcp` (set `PORT` to change it). A health check is available at `http://localhost:3000/health`.
 
### Try it with the MCP Inspector
 
In a second terminal:
 
```bash
npx @modelcontextprotocol/inspector
```
 
Set **Transport Type** to *Streamable HTTP*, **URL** to `http://localhost:3000/mcp`, click **Connect**, open the **Tools** tab, and run the tools in this order:
 
1. `list_medications`: three pending doses
2. `mark_medication_taken` with `Metformin`
3. `log_checkin` with mood `2` and a note
4. `daily_summary`: it flags the pending doses and the low mood
### Try it with curl
 
```bash
curl http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"daily_summary","arguments":{}}}'
```
 
The `Accept` header must list both `application/json` and `text/event-stream`, as the Streamable HTTP spec requires.
 
### Connecting to Alexa+
 
Alexa+ needs a publicly reachable HTTPS URL. Deploy the server (for example on AWS App Runner or any container host), or tunnel it for testing, then register the `/mcp` URL as your MCP integration in the Alexa+ developer tooling.
 
## Project structure
 
```
carebuddy-mcp/
├── server.mjs      # MCP server: Express app, transport, four tools
├── package.json
├── LICENSE         # MIT
└── README.md
```
 
## Roadmap
 
- Persist data in DynamoDB, with one record set per care recipient
- OAuth account linking so each caregiver sees only their own family
- Scheduled reminders and push alerts when a dose is missed
- Weekly trends for adherence and mood
- Bedrock-generated natural-language summaries
- Multiple care recipients and multiple caregivers per household
## Limitations
 
This is a hackathon demo. It has no authentication, stores data in memory, and has not been tested against a live Alexa+ device. It is not a medical device and does not give medical advice.
 
## Hackathon submission notes
 
- **Track:** Alexa+ (self-hosted MCP server, spec 2025-11-25, Streamable HTTP)
- **Mini challenge:** Open Source (MIT licensed)
- **Code that uses the track technology:** `server.mjs` imports `McpServer` and `StreamableHTTPServerTransport` and serves them at `/mcp`.
- **New or existing project:** Built entirely during the submission window.
### Demo video outline (under 3 minutes)
 
| Time | Show |
|---|---|
| 0:00-0:15 | The problem: "My mum lives far away. Did she take her pills?" |
| 0:15-0:45 | The repo, `npm start`, and the four tools in the code |
| 0:45-2:00 | MCP Inspector: list meds, mark one taken, log a low mood, run the summary with its flags |
| 2:00-2:30 | The code: tool registration and the stateless Streamable HTTP transport |
| 2:30-2:50 | Roadmap and why voice matters for caregivers |
 
## License
 
MIT. See [LICENSE](LICENSE).
 
