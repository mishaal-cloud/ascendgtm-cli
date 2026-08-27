import { describe, it, expect, vi, afterEach } from "vitest";
import { Command } from "commander";

/**
 * These tests exercise argument parsing for `check-fit` by rebuilding the
 * relevant slice of the CLI's command definition and asserting on the
 * options object commander produces — without invoking the real network
 * call (mcp-client is not imported/exercised here; see mcp-client.test.ts
 * for the network-call behavior).
 */
function buildCheckFitCommand(onAction: (opts: Record<string, unknown>) => void): Command {
  const program = new Command();
  program.exitOverride(); // throw instead of process.exit on parse errors, for testability

  program
    .command("check-fit")
    .option("--arr <number>", "annual recurring revenue in USD")
    .option("--industry <string>", "prospect's industry")
    .option("--pe-backed", "flag if the company is PE-backed")
    .option("--stage <string>", "company stage")
    .option("--json", "print raw JSON instead of formatted text")
    .action((opts: Record<string, unknown>) => {
      onAction(opts);
    });

  return program;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("check-fit argument parsing", () => {
  it("parses all flags into camelCase options", () => {
    let captured: Record<string, unknown> | undefined;
    const program = buildCheckFitCommand((opts) => {
      captured = opts;
    });

    program.parse(
      [
        "check-fit",
        "--arr",
        "5000000",
        "--industry",
        "B2B SaaS",
        "--pe-backed",
        "--stage",
        "growth",
        "--json",
      ],
      { from: "user" },
    );

    expect(captured).toEqual({
      arr: "5000000",
      industry: "B2B SaaS",
      peBacked: true,
      stage: "growth",
      json: true,
    });
  });

  it("leaves unset flags undefined when omitted", () => {
    let captured: Record<string, unknown> | undefined;
    const program = buildCheckFitCommand((opts) => {
      captured = opts;
    });

    program.parse(["check-fit"], { from: "user" });

    expect(captured).toEqual({});
  });

  it("accepts --arr as a numeric string that later converts cleanly", () => {
    let captured: Record<string, unknown> | undefined;
    const program = buildCheckFitCommand((opts) => {
      captured = opts;
    });

    program.parse(["check-fit", "--arr", "1200000"], { from: "user" });

    expect(captured?.arr).toBe("1200000");
    expect(Number(captured?.arr)).toBe(1200000);
  });
});
