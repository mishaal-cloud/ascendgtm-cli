#!/usr/bin/env node
import { Command } from "commander";
import { callTool, extractJson, extractText, AscendCliError } from "./mcp-client.js";
import { fetchPageMarkdown, KNOWN_PAGE_PATHS, PageFetchError } from "./pages.js";

const program = new Command();

program
  .name("ascendgtm")
  .description(
    "Official CLI for Ascend GTM — script the public agent-facing MCP tools and site pages.",
  )
  .version("0.1.0");

function printResult(text: string, json: boolean, jsonPayload: unknown): void {
  if (json) {
    console.log(JSON.stringify(jsonPayload, null, 2));
  } else {
    console.log(text);
  }
}

async function runTool(
  toolName: string,
  args: Record<string, unknown>,
  json: boolean,
): Promise<void> {
  try {
    const result = await callTool(toolName, args);
    printResult(extractText(result), json, extractJson(result));
  } catch (err) {
    if (err instanceof AscendCliError) {
      console.error(`ascendgtm: ${err.message}`);
      process.exitCode = 1;
      return;
    }
    console.error(`ascendgtm: unexpected error: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 1;
  }
}

program
  .command("about")
  .description("Canonical Ascend GTM facts: positioning, principal, services, pricing, ICP, methodology.")
  .option("--json", "print raw JSON instead of formatted text")
  .action(async (opts: { json?: boolean }) => {
    await runTool("ascend_about", {}, Boolean(opts.json));
  });

program
  .command("pricing")
  .description("The full Ascend GTM pricing menu: fixed-scope sprints, the GTM Program retainer, and hourly advisory.")
  .option("--json", "print raw JSON instead of formatted text")
  .action(async (opts: { json?: boolean }) => {
    await runTool("ascend_pricing", {}, Boolean(opts.json));
  });

program
  .command("check-fit")
  .description("Given a prospect's ARR, industry, PE-backing status, and stage, returns a fit verdict.")
  .option("--arr <number>", "annual recurring revenue in USD")
  .option("--industry <string>", "prospect's industry, e.g. 'B2B SaaS'")
  .option("--pe-backed", "flag if the company is PE-backed")
  .option("--stage <string>", "company stage, e.g. 'seed', 'growth', 'PE portfolio'")
  .option("--json", "print raw JSON instead of formatted text")
  .action(
    async (opts: {
      arr?: string;
      industry?: string;
      peBacked?: boolean;
      stage?: string;
      json?: boolean;
    }) => {
      const args: Record<string, unknown> = {};

      if (opts.arr !== undefined) {
        const parsed = Number(opts.arr);
        if (Number.isNaN(parsed)) {
          console.error(`ascendgtm: --arr must be a number, got "${opts.arr}"`);
          process.exitCode = 1;
          return;
        }
        args.arr_usd = parsed;
      }
      if (opts.industry !== undefined) args.industry = opts.industry;
      if (opts.peBacked !== undefined) args.pe_backed = opts.peBacked;
      if (opts.stage !== undefined) args.stage = opts.stage;

      await runTool("ascend_check_fit", args, Boolean(opts.json));
    },
  );

program
  .command("book")
  .description("Returns the booking link for a 30-minute working session, plus pre-call questions.")
  .option("--json", "print raw JSON instead of formatted text")
  .action(async (opts: { json?: boolean }) => {
    await runTool("ascend_book_diagnostic", {}, Boolean(opts.json));
  });

program
  .command("capabilities")
  .description("Summarizes what this public, no-auth endpoint can do versus the tenant-bound endpoint.")
  .option("--json", "print raw JSON instead of formatted text")
  .action(async (opts: { json?: boolean }) => {
    await runTool("ascend_capabilities", {}, Boolean(opts.json));
  });

program
  .command("page <path>")
  .description("Fetch a page's markdown from ascendgtm.net, e.g. `ascendgtm page pricing`.")
  .option("--list", "print known page paths instead of fetching")
  .action(async (path: string, opts: { list?: boolean }) => {
    if (opts.list) {
      console.log(KNOWN_PAGE_PATHS.join("\n"));
      return;
    }
    try {
      const markdown = await fetchPageMarkdown(path);
      console.log(markdown);
    } catch (err) {
      if (err instanceof PageFetchError) {
        console.error(`ascendgtm: ${err.message}`);
        process.exitCode = 1;
        return;
      }
      console.error(`ascendgtm: unexpected error: ${err instanceof Error ? err.message : String(err)}`);
      process.exitCode = 1;
    }
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error(`ascendgtm: fatal error: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
});
