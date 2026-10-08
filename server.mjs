import express from "express";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

// In-memory demo data (swap for DynamoDB etc. in production)
const meds = [
  { id: "m1", name: "Metformin", dose: "500 mg", time: "08:00", taken: false },
  { id: "m2", name: "Lisinopril", dose: "10 mg", time: "08:00", taken: false },
  { id: "m3", name: "Atorvastatin", dose: "20 mg", time: "20:00", taken: false },
];
const checkins = [];

function build() {
  const s = new McpServer({ name: "carebuddy", version: "1.0.0" });
  const text = (t) => ({ content: [{ type: "text", text: t }] });

  s.registerTool("list_medications",
    { description: "List today's medications for the person being cared for, with taken/pending status.",
      inputSchema: { pending_only: z.boolean().optional() } },
    async ({ pending_only }) => {
      const l = meds.filter(m => !pending_only || !m.taken);
      return text(l.length ? l.map(m => `${m.name} ${m.dose} at ${m.time}: ${m.taken ? "taken" : "pending"}`).join("\n") : "All medications are taken.");
    });

  s.registerTool("mark_medication_taken",
    { description: "Record that a medication was taken. Match by name.",
      inputSchema: { name: z.string() } },
    async ({ name }) => {
      const m = meds.find(x => x.name.toLowerCase() === name.toLowerCase());
      if (!m) return { isError: true, ...text(`No medication named ${name}.`) };
      m.taken = true;
      return text(`Marked ${m.name} as taken.`);
    });

  s.registerTool("log_checkin",
    { description: "Log a wellbeing check-in with mood (1-5) and an optional note.",
      inputSchema: { mood: z.number().int().min(1).max(5), note: z.string().max(500).optional() } },
    async ({ mood, note }) => {
      checkins.push({ at: new Date().toISOString(), mood, note: note ?? "" });
      return text(`Check-in saved. Mood ${mood}/5.`);
    });

  s.registerTool("daily_summary",
    { description: "Summarize today's medication adherence and mood for a caregiver. Flags concerns.",
      inputSchema: {} },
    async () => {
      const taken = meds.filter(m => m.taken).length;
      const avg = checkins.length ? checkins.reduce((a, c) => a + c.mood, 0) / checkins.length : null;
      const flags = [];
      if (taken < meds.length) flags.push(`${meds.length - taken} dose(s) still pending`);
      if (avg !== null && avg <= 2) flags.push("low mood reported, consider calling");
      if (!checkins.length) flags.push("no check-in yet today");
      return text(`${taken}/${meds.length} medications taken. Average mood: ${avg ?? "n/a"}. ${flags.length ? "Attention: " + flags.join("; ") + "." : "All good."}`);
    });
  return s;
}

const app = express();
app.use(express.json());
// Stateless Streamable HTTP: fresh server+transport per request
app.post("/mcp", async (req, res) => {
  const server = build();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on("close", () => { transport.close(); server.close(); });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});
app.get("/mcp", (_, res) => res.status(405).json({ error: "Method not allowed" }));
app.get("/health", (_, res) => res.json({ ok: true }));
app.listen(process.env.PORT || 3000, () => console.log("CareBuddy MCP on /mcp"));
