#!/usr/bin/env bun
import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { extname, join, relative } from "path";

const PORT = Number(
  process.env[process.env.DEMO_RUNTIME_PORT ?? "DEMO_RUNTIME_PORT"] ??
    process.env.DEMO_RUNTIME_PORT ??
    0,
);

const EXCLUDE_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  ".next",
  ".nuxt",
  ".svelte-kit",
  ".astro",
  ".output",
  ".vercel",
  ".netlify",
  "coverage",
]);

export interface FileTreeNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileTreeNode[];
}

export interface FileMetadata {
  name: string;
  path: string;
  absolutePath: string;
  size: number;
  extension: string;
  isDirectory: boolean;
  modified: number;
  created: number;
  lines?: number;
}

function buildFileTree(dirPath: string, rootPath: string): FileTreeNode[] {
  const entries = readdirSync(dirPath, { withFileTypes: true });
  const nodes: FileTreeNode[] = [];

  for (const entry of entries) {
    if (EXCLUDE_DIRS.has(entry.name)) continue;
    if (entry.name.startsWith(".") && entry.name !== ".env.example") continue;

    const fullPath = join(dirPath, entry.name);
    const relativePath = relative(rootPath, fullPath).replace(/\\/g, "/");

    if (entry.isDirectory()) {
      nodes.push({
        name: entry.name,
        path: relativePath,
        type: "directory" as const,
        children: buildFileTree(fullPath, rootPath),
      });
    } else {
      nodes.push({
        name: entry.name,
        path: relativePath,
        type: "file" as const,
      });
    }
  }

  return nodes.sort((a, b) => {
    const aIsDir = a.type === "directory";
    const bIsDir = b.type === "directory";
    if (aIsDir !== bIsDir) return aIsDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(),
    },
  });
}

const server = Bun.serve({
  port: PORT || 0,
  async fetch(req) {
    const url = new URL(req.url);
    const { pathname } = url;

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (pathname === "/api/version") {
      return json({ version: "1.0.0", status: "running" });
    }

    if (pathname === "/api/files") {
      const cwd = process.cwd();
      const tree = buildFileTree(cwd, cwd);
      return json(tree);
    }

    if (pathname.startsWith("/api/files/")) {
      const filePath = decodeURIComponent(pathname.slice("/api/files/".length));
      const fullPath = join(process.cwd(), filePath);

      if (!existsSync(fullPath)) {
        return json({ error: "Not found" }, 404);
      }

      const stat = statSync(fullPath);
      const isDirectory = stat.isDirectory();
      const extension = extname(filePath).toLowerCase();
      const TEXT_EXTENSIONS = new Set([
        ".ts",
        ".tsx",
        ".js",
        ".jsx",
        ".mjs",
        ".cjs",
        ".vue",
        ".svelte",
        ".astro",
        ".json",
        ".jsonc",
        ".yaml",
        ".yml",
        ".toml",
        ".md",
        ".mdx",
        ".html",
        ".css",
        ".scss",
        ".sass",
        ".less",
        ".txt",
        ".sh",
        ".bash",
        ".env",
        ".gitignore",
      ]);

      let lines: number | undefined;
      if (!isDirectory && (TEXT_EXTENSIONS.has(extension) || !extension)) {
        try {
          const content = readFileSync(fullPath, "utf-8");
          lines = content.split("\n").length;
        } catch {
          // Binary or unreadable file — skip
        }
      }

      const meta: FileMetadata = {
        name: filePath.split("/").pop() ?? filePath,
        path: filePath,
        absolutePath: fullPath,
        size: stat.size,
        extension,
        isDirectory,
        modified: stat.mtimeMs,
        created: stat.birthtimeMs,
        lines,
      };
      return json(meta);
    }

    return json({ error: "Not found" }, 404);
  },
});

console.warn(`Demo runtime listening on port ${server.port}`);
