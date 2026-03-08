// tmp/nfz/src/cli/index.ts
import { resolve as resolve2 } from "node:path";
import consola2 from "consola";

// tmp/nfz/src/cli/core.ts
import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { kebabCase, pascalCase } from "change-case";
import consola from "consola";
function handleCliError(err) {
  const e = err;
  const message = e?.message ? String(e.message) : String(err);
  if (message.startsWith("File already exists:")) {
    consola.error(message);
    consola.info("Tip: re-run the command with --force to overwrite, or choose a different name.");
    process.exitCode = 1;
    return;
  }
  if (e?.stack && typeof e.stack === "string") {
    consola.error(message);
  } else {
    consola.error(message);
  }
  process.exitCode = 1;
}
async function runDoctor(projectRoot) {
  const nuxtConfigPath = findNuxtConfigPath(projectRoot);
  consola.info("NFZ doctor");
  consola.info(`- projectRoot: ${projectRoot}`);
  consola.info(`- nuxt.config: ${nuxtConfigPath ? relativeToCwd(nuxtConfigPath) : "(not found)"}`);
  if (!nuxtConfigPath) {
    consola.warn("No nuxt.config found. Nothing to diagnose.");
    return;
  }
  const cfg = await readFile(nuxtConfigPath, "utf8");
  const hasModule = /\bmodules\s*:\s*\[[^\]]*[\\"\']nuxt-feathers-zod[\\"\']/.test(cfg) || /[\\"\']nuxt-feathers-zod[\\"\']/.test(cfg);
  consola.info(`- modules includes 'nuxt-feathers-zod': ${hasModule ? "yes" : "no"}`);
  const mode = cfg.match(/client\s*:\s*\{[\s\S]*?mode\s*:\s*[\\"\'](embedded|remote)[\\"\']/)?.[1] ?? "embedded(?)";
  consola.info(`- feathers.client.mode: ${mode}`);
  const restPath = cfg.match(/rest\s*:\s*\{[\s\S]*?path\s*:\s*[\\"\']([^\"\']+)[\\"\']/)?.[1] ?? "/feathers";
  consola.info(`- transports.rest.path: ${restPath}`);
  const templatesDirs = cfg.match(/templates\s*:\s*\{[\s\S]*?dirs\s*:\s*\[([^\]]*)\]/)?.[1]?.trim();
  if (templatesDirs) consola.info(`- feathers.templates.dirs: [${templatesDirs}]`);
  const moduleDirs = cfg.match(/moduleDirs\s*:\s*\[([^\]]*)\]/)?.[1]?.trim();
  if (moduleDirs) consola.info(`- feathers.server.moduleDirs: [${moduleDirs}]`);
  const servicesDirsRaw = (() => {
    const arr = cfg.match(/servicesDirs\s*:\s*\[([^\]]*)\]/)?.[1];
    if (arr) return arr;
    const single = cfg.match(/servicesDirs\s*:\s*[\\"\']([^\"\']+)[\\"\']/)?.[1];
    if (single) return JSON.stringify([single]);
    const legacy = cfg.match(/servicesDir\s*:\s*[\\"\']([^\"\']+)[\\"\']/)?.[1];
    if (legacy) return JSON.stringify([legacy]);
    return "";
  })();
  const servicesDirs = [];
  if (servicesDirsRaw) {
    const parts = servicesDirsRaw.replace(/[\[\]]/g, "").split(",").map((v) => v.trim()).filter(Boolean).map((v) => v.replace(/^['"]|['"]$/g, "")).filter(Boolean);
    servicesDirs.push(...parts);
  }
  if (!servicesDirs.length && mode !== "remote") servicesDirs.push("services");
  const absServicesDirs = [];
  const seen = /* @__PURE__ */ new Set();
  for (const dir of servicesDirs) {
    const abs = resolve(projectRoot, dir);
    const key = abs.replace(/\\/g, "/").toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    absServicesDirs.push(abs);
  }
  if (absServicesDirs.length) {
    consola.info(`- servicesDirs: ${absServicesDirs.map(relativeToCwd).join(", ")}`);
  }
  consola.info("Checks:");
  const templatesDirDefault = resolve(projectRoot, "feathers/templates");
  consola.info(`- ${relativeToCwd(templatesDirDefault)} exists: ${existsSync(templatesDirDefault) ? "yes" : "no"}`);
  const serverModulesDefault = resolve(projectRoot, "feathers/server/modules");
  consola.info(`- ${relativeToCwd(serverModulesDefault)} exists: ${existsSync(serverModulesDefault) ? "yes" : "no"}`);
  let hasAnyService = false;
  if (mode !== "remote") {
    for (const d of absServicesDirs) {
      if (!existsSync(d)) continue;
      const entries = await readdir(d).catch(() => []);
      for (const ent of entries) {
        const p = join(d, ent);
        const st = await stat(p).catch(() => null);
        if (st?.isDirectory()) {
          const files = await readdir(p).catch(() => []);
          if (files.some((f) => f.endsWith(".ts"))) {
            hasAnyService = true;
            break;
          }
        }
      }
      if (hasAnyService) break;
    }
    consola.info(`- embedded services detected: ${hasAnyService ? "yes" : "no"}`);
  }
  let likelyMongoAdapter = false;
  if (mode !== "remote") {
    const scanRoots = [
      ...absServicesDirs,
      resolve(projectRoot, "feathers/server")
    ].filter((p) => existsSync(p));
    const candidates = [];
    for (const root of scanRoots) {
      const q = [root];
      while (q.length) {
        const cur = q.pop();
        const st = await stat(cur).catch(() => null);
        if (!st) continue;
        if (st.isDirectory()) {
          const children = await readdir(cur).catch(() => []);
          for (const c of children) q.push(join(cur, c));
        } else if (st.isFile() && cur.endsWith(".ts")) {
          candidates.push(cur);
        }
      }
    }
    for (const f of candidates.slice(0, 800)) {
      const txt = await readFile(f, "utf8").catch(() => "");
      if (txt.includes("mongodbClient") || txt.includes("app.get('mongodbClient')") || txt.includes("@feathersjs/mongodb")) {
        likelyMongoAdapter = true;
        break;
      }
    }
    consola.info(`- mongodb adapter signals detected: ${likelyMongoAdapter ? "yes" : "no"}`);
  }
  const rec = [];
  if (!hasModule) rec.push(`Add module to nuxt.config: modules: ['nuxt-feathers-zod']`);
  if (mode !== "remote" && !hasAnyService) {
    rec.push(`No embedded services found. Generate one: bunx nuxt-feathers-zod add service users`);
    rec.push(`Then test: GET http://localhost:3000${restPath}/users`);
  }
  if (templatesDirs && !existsSync(templatesDirDefault) && mode !== "remote") {
    rec.push(`Initialize template overrides: bunx nuxt-feathers-zod init templates`);
  }
  if (likelyMongoAdapter) {
    rec.push(`MongoDB detected: ensure you configure mongodbClient (server module) or generate services with --adapter memory`);
  }
  if (mode === "remote" && templatesDirs) {
    rec.push(`Note: in remote mode, template overrides are usually optional unless you customize client templates.`);
  }
  if (rec.length) {
    consola.info("Recommendations:");
    for (const r of rec) consola.info(`- ${r}`);
  }
  consola.info("Done.");
}
function findNuxtConfigPath(projectRoot) {
  const candidates = [
    "nuxt.config.ts",
    "nuxt.config.mts",
    "nuxt.config.js",
    "nuxt.config.mjs"
  ].map((f) => resolve(projectRoot, f));
  return candidates.find((f) => existsSync(f)) ?? null;
}
function printHelp() {
  console.log(`
nuxt-feathers-zod CLI

Usage:
  bunx nuxt-feathers-zod <command> [args] [--flags]

Commands:
  init templates                Initialize template overrides (default: feathers/templates)
  init embedded                 Initialize embedded server mode (Feathers inside Nuxt/Nitro)
  init remote                   Initialize remote client mode (Feathers client -> external server)
  remote auth keycloak          Configure remote auth payload mode for Keycloak
  add service <name>            Generate an embedded service (server + schema)
  add custom-service <name>     Generate a custom service (with custom methods)
  add remote-service <name>     Register a remote service (client-only)
  add middleware <name>         Generate middleware (target nitro|feathers)
  doctor                        Diagnose current project configuration

Global flags (most commands):
  --dry                         Dry run (no writes)
  --force                       Overwrite existing files (generators)

Notes:
  - The CLI auto-patches nuxt.config.* to ensure:
    - modules: [..., 'nuxt-feathers-zod']
    - feathers: { ... } minimal defaults required by the chosen command
  - Embedded: generate services via CLI (recommended), then test REST:
      GET http://localhost:3000/feathers/<service>
  - MongoDB adapter requires an embedded mongodbClient (see docs). Default adapter is memory.

Examples:
  bunx nuxt-feathers-zod init templates
  bunx nuxt-feathers-zod init embedded --force
  bunx nuxt-feathers-zod init embedded --force --auth
  bunx nuxt-feathers-zod add service users
  bunx nuxt-feathers-zod add service users --adapter mongodb --collection users
  bunx nuxt-feathers-zod add custom-service actions --methods find,get --customMethods run,preview
  bunx nuxt-feathers-zod init remote --url http://localhost:3030
  bunx nuxt-feathers-zod init remote --url http://localhost:3030 --transport rest
  bunx nuxt-feathers-zod add remote-service users --path users --methods find,get,create,patch,remove
  bunx nuxt-feathers-zod remote auth keycloak --ssoUrl https://sso.example --realm myrealm --clientId myapp
  bunx nuxt-feathers-zod doctor

Flags overview:

  init templates:
    --dir <dir>                (default: feathers/templates)
    --force
    --dry

  init embedded:
    --framework express|koa     (default: express)
    --servicesDir <dir>         (default: services)
    --restPath <path>           (default: /feathers)
    --websocketPath <path>      (default: /socket.io)
    --secureDefaults true|false (default: true)
    --auth true|false           (default: false)
    --swagger true|false        (default: false)
    --force
    --dry

  init remote:
    --url <http(s)://...>       (required)
    --transport socketio|rest   (default: socketio)
    --restPath <path>           (default: /feathers)
    --websocketPath <path>      (default: /socket.io)
    --auth true|false           (default: false)
    --payloadMode jwt|keycloak  (default: jwt)
    --strategy jwt              (default: jwt)
    --tokenField accessToken    (default: accessToken)
    --servicePath authentication (default: authentication)
    --reauth true|false         (default: true)
    --force
    --dry

  remote auth keycloak:
    --ssoUrl <url>              (required)
    --realm <realm>             (required)
    --clientId <id>             (required)
    --dry

  add service <name>:
    --adapter memory|mongodb    (default: memory)
    --schema none|zod|json      (default: none)
    --auth true|false           (default: false)
    --idField id|_id            (default: id; mongodb default: _id)
    --path <servicePath>        (default: /<name>)
    --collection <name>         (mongodb only)
    --docs true|false           (default: false; swagger legacy)
    --servicesDir <dir>         (default: services)
    --force
    --dry

  add custom-service <name>:
    --schema none|zod|json      (default: none)
    --auth true|false           (default: false)
    --path <servicePath>        (default: /<name>)
    --methods find,get,create,patch,remove (optional)
    --customMethods run,preview (optional)
    --docs true|false           (default: false)
    --servicesDir <dir>         (default: services)
    --force
    --dry

  add remote-service <name>:
    --path <servicePath>        (default: <name>)
    --methods find,get,create,patch,remove,custom (optional)
    --dry

  add middleware <name>:
    --target nitro|feathers     (default: nitro)
    --force
    --dry
`);
}
function parseFlags(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a)
      continue;
    if (!a.startsWith("--"))
      continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      out[key] = true;
      continue;
    }
    out[key] = next;
    i++;
  }
  return out;
}
async function tryPatchNuxtConfig(projectRoot, patch, opts) {
  const candidates = [
    "nuxt.config.ts",
    "nuxt.config.mts",
    "nuxt.config.js",
    "nuxt.config.mjs"
  ].map((f) => resolve(projectRoot, f));
  const file = candidates.find((f) => existsSync(f));
  if (!file) {
    consola.warn("[nuxt-feathers-zod] nuxt.config file not found (skip feathers:{} auto-init)");
    return;
  }
  const original = await readFile(file, "utf8");
  const updated = applyNuxtConfigPatch(original, patch);
  if (updated === original) {
    consola.info(`[nuxt-feathers-zod] nuxt.config already contains required feathers:{} settings (${relativeToCwd(file)})`);
    return;
  }
  if (opts.dry) {
    consola.info(`[dry] patch ${relativeToCwd(file)} (feathers:{})`);
    return;
  }
  await writeFile(file, updated, "utf8");
  consola.success(`[nuxt-feathers-zod] patched ${relativeToCwd(file)} (feathers:{})`);
}
function applyNuxtConfigPatch(src, patch) {
  const m = src.match(/defineNuxtConfig\(\s*\{/);
  if (!m || m.index == null) {
    return src;
  }
  let out = ensureNuxtModuleInConfig(src, "nuxt-feathers-zod");
  if (!/\bfeathers\s*:\s*\{/.test(out)) {
    const insertAt = m.index + m[0].length;
    const feathersBlock = buildFeathersBlock(patch);
    out = out.slice(0, insertAt) + feathersBlock + out.slice(insertAt);
    return out;
  }
  const block = locateObjectLiteral(out, /\bfeathers\s*:\s*\{/);
  if (!block) return out;
  const before = out.slice(0, block.start);
  const feathersObj = out.slice(block.start, block.end);
  const after = out.slice(block.end);
  const patchedObj = patchFeathersObjectLiteral(feathersObj, patch);
  return before + patchedObj + after;
}
function ensureNuxtModuleInConfig(src, moduleName) {
  if (new RegExp(`[\\"']${moduleName}[\\"']`).test(src)) {
    return src;
  }
  const m = src.match(/defineNuxtConfig\(\s*\{/);
  if (!m || m.index == null) return src;
  const arr = locateArrayLiteral(src, /\bmodules\s*:\s*\[/);
  if (arr) {
    const before = src.slice(0, arr.start);
    const arrText = src.slice(arr.start, arr.end);
    const after = src.slice(arr.end);
    const insertAt2 = arrText.lastIndexOf("]");
    if (insertAt2 < 0) return src;
    const inner = arrText.slice(1, insertAt2);
    const hasItems = /\S/.test(inner.trim());
    const indentMatch = arrText.match(/\n(\s*)\]$/);
    const itemIndent = indentMatch ? indentMatch[1] : "";
    let insertion = "";
    if (!hasItems) {
      insertion = `'${moduleName}'`;
    } else if (indentMatch) {
      insertion = `,
${itemIndent}'${moduleName}'`;
    } else {
      insertion = `, '${moduleName}'`;
    }
    const patched = arrText.slice(0, insertAt2) + insertion + arrText.slice(insertAt2);
    return before + patched + after;
  }
  const insertAt = m.index + m[0].length;
  const block = `
  modules: ['${moduleName}'],
`;
  return src.slice(0, insertAt) + block + src.slice(insertAt);
}
function buildFeathersBlock(patch) {
  const servicesDir = patch.servicesDir ?? "services";
  const templatesDir = patch.templatesDir;
  const isRemote = patch.clientMode === "remote" || !!patch.remote || !!patch.remoteService;
  const servicesPart = isRemote ? "" : `
      servicesDirs: ['${servicesDir}'],`;
  const authPart = isRemote ? `
      auth: false,` : "";
  const templatesPart = templatesDir ? `
    templates: {
      dirs: ['${templatesDir}'],
      strict: true,
      allow: ['server/*.ts', 'client/*.ts', 'types/*.d.ts']
    },` : "";
  const serverPluginsPart = patch.ensureServerFeathersPluginsDir ? `
    loadFeathersConfig: true,
    server: {
      pluginDirs: ['server/feathers']
    },` : "";
  const embeddedPart = (() => {
    if (!patch.embedded) return "";
    const framework = patch.embedded.framework ?? "express";
    const restPath = patch.embedded.restPath ?? "/feathers";
    const websocketPath = patch.embedded.websocketPath ?? "/socket.io";
    const secureDefaults = patch.embedded.secureDefaults !== false;
    const authEnabled = patch.embedded.auth !== false;
    const swaggerEnabled = Boolean(patch.embedded.swagger);
    return `
    transports: {
      rest: { path: '${restPath}', framework: '${framework}' },
      websocket: { path: '${websocketPath}' }
    },
    server: {
      enabled: true,
      secureDefaults: ${secureDefaults},
    },
    auth: ${authEnabled},
    swagger: ${swaggerEnabled},`;
  })();
  const keycloakPart = patch.keycloak ? `
    keycloak: {${patch.keycloak.serverUrl ? ` serverUrl: '${patch.keycloak.serverUrl}',` : ""}${patch.keycloak.realm ? ` realm: '${patch.keycloak.realm}',` : ""}${patch.keycloak.clientId ? ` clientId: '${patch.keycloak.clientId}',` : ""}${patch.keycloak.onLoad ? ` onLoad: '${patch.keycloak.onLoad}',` : ""}
    },` : "";
  const clientPart = (() => {
    if (!patch.clientMode && !patch.remote && !patch.remoteService)
      return "";
    if (patch.clientMode === "remote" || patch.remote || patch.remoteService) {
      const url = patch.remote?.url ? `'${patch.remote.url}'` : `''`;
      const transport = patch.remote?.transport ? `'${patch.remote.transport}'` : `'auto'`;
      const restPath = patch.remote?.restPath ? `'${patch.remote.restPath}'` : "undefined";
      const websocketPath = patch.remote?.websocketPath ? `'${patch.remote.websocketPath}'` : "undefined";
      const remoteAuth = patch.remote?.auth ? `auth: { ${[
        patch.remote.auth.enabled !== void 0 ? `enabled: ${patch.remote.auth.enabled}` : "",
        patch.remote.auth.payloadMode ? `payloadMode: '${patch.remote.auth.payloadMode}'` : "",
        patch.remote.auth.strategy ? `strategy: '${patch.remote.auth.strategy}'` : "",
        patch.remote.auth.tokenField ? `tokenField: '${patch.remote.auth.tokenField}'` : "",
        patch.remote.auth.servicePath ? `servicePath: '${patch.remote.auth.servicePath}'` : "",
        patch.remote.auth.reauth !== void 0 ? `reauth: ${patch.remote.auth.reauth}` : ""
      ].filter(Boolean).join(", ")} }` : "";
      const servicesEntry = patch.remoteService ? `{ path: '${patch.remoteService.path}'${patch.remoteService.methods?.length ? `, methods: ${JSON.stringify(patch.remoteService.methods)}` : ""} }` : "";
      const services = servicesEntry ? `services: [${servicesEntry}]` : "";
      const remoteObj = `remote: { url: ${url}, transport: ${transport}${restPath !== "undefined" ? `, restPath: ${restPath}` : ""}${websocketPath !== "undefined" ? `, websocketPath: ${websocketPath}` : ""}${remoteAuth ? `, ${remoteAuth}` : ""}${services ? `, ${services}` : ""} }`;
      return `
    client: {
      mode: 'remote',
      ${remoteObj}
    },`;
    }
    return `
    client: { mode: 'embedded' },`;
  })();
  return `
    feathers: {${servicesPart}${authPart}${templatesPart}${serverPluginsPart}${embeddedPart}${keycloakPart}${clientPart}
    },`;
}
function patchFeathersObjectLiteral(feathersObj, patch) {
  let out = feathersObj;
  if (patch.servicesDir) {
    if (/\bservicesDirs\s*:/.test(out)) {
      out = replaceArrayContains(out, "servicesDirs", patch.servicesDir);
    } else {
      out = insertProp(out, `servicesDirs: ['${patch.servicesDir}']`);
    }
  }
  if (patch.templatesDir) {
    if (/\btemplates\s*:/.test(out)) {
      out = ensureNestedTemplatesDirs(out, patch.templatesDir);
    } else {
      out = insertProp(out, `templates: { dirs: ['${patch.templatesDir}'], strict: true, allow: ['server/*.ts', 'client/*.ts', 'types/*.d.ts'] }`);
    }
  }
  if (patch.keycloak) {
    const parts = [];
    if (patch.keycloak.serverUrl) parts.push(`serverUrl: '${patch.keycloak.serverUrl}'`);
    if (patch.keycloak.realm) parts.push(`realm: '${patch.keycloak.realm}'`);
    if (patch.keycloak.clientId) parts.push(`clientId: '${patch.keycloak.clientId}'`);
    if (patch.keycloak.onLoad) parts.push(`onLoad: '${patch.keycloak.onLoad}'`);
    if (/\bkeycloak\s*:/.test(out)) {
      const block = locateObjectLiteral(out, /\bkeycloak\s*:\s*\{/);
      if (block) {
        out = out.slice(0, block.start) + `keycloak: { ${parts.join(", ")} }` + out.slice(block.end);
      }
    } else {
      out = insertProp(out, `keycloak: { ${parts.join(", ")} }`);
    }
  }
  if (patch.ensureServerFeathersPluginsDir) {
    if (!/\bloadFeathersConfig\s*:/.test(out)) {
      out = insertProp(out, `loadFeathersConfig: true`);
    }
    if (/\bserver\s*:/.test(out)) {
      out = ensureNestedServerPluginDirs(out, "server/feathers");
    } else {
      out = insertProp(out, `server: { pluginDirs: ['server/feathers'] }`);
    }
  }
  if (patch.clientMode || patch.remote || patch.remoteService) {
    if (/\bclient\s*:/.test(out)) {
      out = ensureNestedClientRemote(out, patch);
    } else {
      if (patch.clientMode === "embedded") {
        out = insertProp(out, `client: { mode: 'embedded' }`);
      } else {
        const url = patch.remote?.url ? `'${patch.remote.url}'` : `''`;
        const transport = patch.remote?.transport ? `'${patch.remote.transport}'` : `'auto'`;
        const parts = [];
        parts.push(`url: ${url}`);
        parts.push(`transport: ${transport}`);
        if (patch.remote?.restPath) parts.push(`restPath: '${patch.remote.restPath}'`);
        if (patch.remote?.websocketPath) parts.push(`websocketPath: '${patch.remote.websocketPath}'`);
        if (patch.remote?.auth) {
          const a = patch.remote.auth;
          const ap = [];
          if (a.enabled !== void 0) ap.push(`enabled: ${a.enabled}`);
          if (a.payloadMode) ap.push(`payloadMode: '${a.payloadMode}'`);
          if (a.strategy) ap.push(`strategy: '${a.strategy}'`);
          if (a.tokenField) ap.push(`tokenField: '${a.tokenField}'`);
          if (a.servicePath) ap.push(`servicePath: '${a.servicePath}'`);
          if (a.reauth !== void 0) ap.push(`reauth: ${a.reauth}`);
          parts.push(`auth: { ${ap.join(", ")} }`);
        }
        if (patch.remoteService) {
          const entry = `{ path: '${patch.remoteService.path}'${patch.remoteService.methods?.length ? `, methods: ${JSON.stringify(patch.remoteService.methods)}` : ""} }`;
          parts.push(`services: [${entry}]`);
        }
        out = insertProp(out, `client: { mode: 'remote', remote: { ${parts.join(", ")} } }`);
      }
    }
  }
  if (patch.clientMode === "remote" || patch.remote) {
    if (!/\bauth\s*:/.test(out)) {
      out = insertProp(out, `auth: false`);
    }
  }
  if (patch.embedded) {
    const framework = patch.embedded.framework ?? "express";
    const restPath = patch.embedded.restPath ?? "/feathers";
    const websocketPath = patch.embedded.websocketPath ?? "/socket.io";
    if (!/\btransports\s*:/.test(out)) {
      out = insertProp(out, `transports: { rest: { path: '${restPath}', framework: '${framework}' }, websocket: { path: '${websocketPath}' } }`);
    }
    const secureDefaults = patch.embedded.secureDefaults !== false;
    if (/\bserver\s*:/.test(out)) {
      out = ensureNestedServerProp(out, `enabled: true`);
      out = ensureNestedServerProp(out, `secureDefaults: ${secureDefaults}`);
    } else {
      out = insertProp(out, `server: { enabled: true, secureDefaults: ${secureDefaults} }`);
    }
    const authEnabled = patch.embedded.auth !== false;
    if (/\bauth\s*:/.test(out)) {
      out = replacePropValue(out, "auth", authEnabled ? "true" : "false");
    } else {
      out = insertProp(out, `auth: ${authEnabled}`);
    }
    const swaggerEnabled = Boolean(patch.embedded.swagger);
    if (/\bswagger\s*:/.test(out)) {
      out = replacePropValue(out, "swagger", swaggerEnabled ? "true" : "false");
    } else {
      out = insertProp(out, `swagger: ${swaggerEnabled}`);
    }
  }
  return out;
}
function locateObjectLiteral(src, startPattern) {
  const m = startPattern.exec(src);
  if (!m || m.index == null) return null;
  const braceStart = src.indexOf("{", m.index);
  if (braceStart < 0) return null;
  let depth = 0;
  for (let i = braceStart; i < src.length; i++) {
    const ch = src[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        return { start: braceStart, end: i + 1 };
      }
    }
  }
  return null;
}
function locateArrayLiteral(src, startPattern) {
  const m = startPattern.exec(src);
  if (!m || m.index == null) return null;
  const bracketStart = src.indexOf("[", m.index);
  if (bracketStart < 0) return null;
  let depth = 0;
  for (let i = bracketStart; i < src.length; i++) {
    const ch = src[i];
    if (ch === "[") depth++;
    else if (ch === "]") {
      depth--;
      if (depth === 0) {
        return { start: bracketStart, end: i + 1 };
      }
    }
  }
  return null;
}
function insertProp(objLiteral, prop) {
  const idx = objLiteral.indexOf("{");
  if (idx < 0) return objLiteral;
  const insertAt = idx + 1;
  return objLiteral.slice(0, insertAt) + `
    ${prop},` + objLiteral.slice(insertAt);
}
function replacePropValue(objLiteral, prop, newValue) {
  const re = new RegExp(`\\b${prop}\\s*:\\s*([^,}]+)`, "m");
  if (!re.test(objLiteral)) return objLiteral;
  return objLiteral.replace(re, (_m, _old) => `${prop}: ${newValue}`);
}
function replaceArrayContains(objLiteral, propName, value) {
  const re = new RegExp(`(${propName}\\s*:\\s*\\[)([^\\]]*)(\\])`);
  const m = objLiteral.match(re);
  if (!m) return objLiteral;
  const inner = m[2];
  if (new RegExp(`['"]${escapeRegExp(value)}['"]`).test(inner)) return objLiteral;
  const newInner = inner.trim().length ? `${inner.trim().replace(/\s+$/, "")}, '${value}'` : `'${value}'`;
  return objLiteral.replace(re, `$1${newInner}$3`);
}
function ensureNestedTemplatesDirs(objLiteral, value) {
  const block = locateObjectLiteral(objLiteral, /\btemplates\s*:\s*\{/);
  if (!block) return objLiteral;
  const before = objLiteral.slice(0, block.start);
  const tplObj = objLiteral.slice(block.start, block.end);
  const after = objLiteral.slice(block.end);
  let patched = tplObj;
  if (/\bdirs\s*:/.test(patched)) patched = replaceArrayContains(patched, "dirs", value);
  else patched = insertProp(patched, `dirs: ['${value}']`);
  if (!/\bstrict\s*:/.test(patched)) patched = insertProp(patched, `strict: true`);
  if (!/\ballow\s*:/.test(patched)) patched = insertProp(patched, `allow: ['server/*.ts', 'client/*.ts', 'types/*.d.ts']`);
  return before + patched + after;
}
function ensureNestedServerPluginDirs(objLiteral, value) {
  const block = locateObjectLiteral(objLiteral, /\bserver\s*:\s*\{/);
  if (!block) return objLiteral;
  const before = objLiteral.slice(0, block.start);
  const srvObj = objLiteral.slice(block.start, block.end);
  const after = objLiteral.slice(block.end);
  let patched = srvObj;
  if (/\bpluginDirs\s*:/.test(patched)) patched = replaceArrayContains(patched, "pluginDirs", value);
  else patched = insertProp(patched, `pluginDirs: ['${value}']`);
  return before + patched + after;
}
function ensureNestedServerProp(objLiteral, propAssignment) {
  const block = locateObjectLiteral(objLiteral, /\bserver\s*:\s*\{/);
  if (!block) return objLiteral;
  const before = objLiteral.slice(0, block.start);
  const srvObj = objLiteral.slice(block.start, block.end);
  const after = objLiteral.slice(block.end);
  const idx = propAssignment.indexOf(":");
  const key = (idx >= 0 ? propAssignment.slice(0, idx) : propAssignment).trim();
  const value = idx >= 0 ? propAssignment.slice(idx + 1).trim() : "";
  let patched = srvObj;
  if (new RegExp(`\\b${escapeRegExp(key)}\\s*:`).test(patched)) {
    patched = replacePropValue(patched, key, value);
  } else {
    patched = insertProp(patched, propAssignment);
  }
  return before + patched + after;
}
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
var TEMPLATE_KEYS = [
  "server/server.ts",
  "server/plugin.ts",
  "server/mongodb.ts",
  "server/authentication.ts",
  "server/keycloak.ts",
  "client/client.ts",
  "client/connection.ts",
  "client/plugin.ts",
  "client/authentication.ts"
];
async function initTemplates(opts) {
  const { projectRoot, outDir, force, dry } = opts;
  const generatedDirCandidates = [
    resolve(projectRoot, ".nuxt/feathers"),
    resolve(projectRoot, "node_modules/.cache/nuxt/.nuxt/feathers")
  ];
  const generatedDir = generatedDirCandidates.find((d) => existsSync(d));
  if (!dry) {
    await mkdir(outDir, { recursive: true });
  }
  consola.info(`[nuxt-feathers-zod] init templates
  note: embedded server modules load order = scan (server.moduleDirs) then list (server.modules) -> ${outDir}`);
  if (generatedDir)
    consola.info(`[nuxt-feathers-zod] snapshot source detected -> ${generatedDir}`);
  for (const key of TEMPLATE_KEYS) {
    const dst = resolve(outDir, key);
    const dstDir = resolve(dst, "..");
    if (existsSync(dst) && !force) {
      consola.info(`- skip (exists): ${key}`);
      continue;
    }
    if (!dry) {
      await mkdir(dstDir, { recursive: true });
    }
    const snapshotSrc = generatedDir ? resolve(generatedDir, key) : null;
    if (snapshotSrc && existsSync(snapshotSrc)) {
      if (!dry)
        await copyFile(snapshotSrc, dst);
      consola.success(`- ${force ? "overwrite" : "write"} (snapshot): ${key}`);
      continue;
    }
    const placeholder = renderTemplatePlaceholder(key);
    if (!dry)
      await writeFile(dst, placeholder, "utf8");
    consola.success(`- ${force ? "overwrite" : "write"} (placeholder): ${key}`);
  }
  const readmePath = resolve(outDir, "README.md");
  if (!existsSync(readmePath) || force) {
    const readme = `# nuxt-feathers-zod \u2014 Template overrides

This folder contains *override templates* for the Nuxt module \`nuxt-feathers-zod\`.

## How it works

- The module generates runtime files under \`.nuxt/feathers/**\` during dev/build.
- When you enable template overrides, the module will prefer files from this folder when a matching key exists.

A key is the path relative to the \`feathers\` root, e.g.:
- \`server/plugin.ts\`
- \`client/connection.ts\`

## Enable in nuxt.config.ts

\`\`\`ts
export default defineNuxtConfig({
  feathers: {
    templates: {
      dirs: ['feathers/templates'],
      strict: true,
      allow: ['server/*.ts', 'client/*.ts'],
    },
  },
})
\`\`\`

## Tips

- If this folder was initialized from a snapshot, each file is a copy of the currently generated \`.nuxt/feathers/<key>\`.
- If a file is a placeholder, start by copying the generated version from \`.nuxt/feathers/<key>\` then edit.
`;
    if (!dry)
      await writeFile(readmePath, readme, "utf8");
  }
}
function renderTemplatePlaceholder(key) {
  return `// Template override: ${key}
  //
  // This file is used as an override source for:
  //   .nuxt/feathers/${key}
  //
  // How to get started:
  // 1) Run your app once (bun dev) so Nuxt generates .nuxt/feathers/**.
  // 2) Copy the generated file from .nuxt/feathers/${key} into this file.
  // 3) Edit as needed (keep it compatible with Nitro / Nuxt build).
  //
  // NOTE: The module defaults still apply when no override exists.

export {}
`;
}
async function findProjectRoot(start) {
  let dir = resolve(start);
  for (let i = 0; i < 20; i++) {
    if (existsSync(join(dir, "package.json")))
      return dir;
    const parent = resolve(dir, "..");
    if (parent === dir)
      break;
    dir = parent;
  }
  throw new Error(`Could not find project root from ${start}`);
}
function singularize(input) {
  if (input.endsWith("ies"))
    return `${input.slice(0, -3)}y`;
  if (input.endsWith("ses"))
    return input.slice(0, -2);
  if (input.endsWith("s") && input.length > 1)
    return input.slice(0, -1);
  return input;
}
function normalizeServiceName(raw) {
  return kebabCase(raw);
}
function normalizeServicePath(raw) {
  const cleaned = String(raw).trim().replace(/^\/+/, "").replace(/\/+$/, "");
  if (!cleaned)
    throw new Error("Invalid --path: path cannot be empty");
  return cleaned;
}
function normalizeCollectionName(raw) {
  const cleaned = String(raw).trim();
  if (!cleaned)
    throw new Error("Invalid --collection: collection name cannot be empty");
  if (cleaned.includes("/") || cleaned.includes("\\")) {
    throw new Error("Invalid --collection: collection name must not include / or \\");
  }
  if (cleaned.includes("\0")) {
    throw new Error("Invalid --collection: collection name must not include null characters");
  }
  return cleaned;
}
function createServiceIds(serviceNameKebab) {
  const baseKebab = singularize(serviceNameKebab);
  const basePascal = pascalCase(baseKebab);
  const baseCamel = basePascal.charAt(0).toLowerCase() + basePascal.slice(1);
  return {
    serviceNameKebab,
    baseKebab,
    basePascal,
    baseCamel
  };
}
async function generateService(opts) {
  const serviceNameKebab = normalizeServiceName(opts.name);
  const ids = createServiceIds(serviceNameKebab);
  const servicePath = normalizeServicePath(opts.servicePath ?? serviceNameKebab);
  const collectionName = normalizeCollectionName(
    opts.collectionName ?? (servicePath.includes("/") ? serviceNameKebab : servicePath)
  );
  const dir = join(opts.servicesDir, serviceNameKebab);
  const schemaKind = opts.schema ?? "none";
  const schemaFile = join(dir, `${serviceNameKebab}.schema.ts`);
  const classFile = join(dir, `${serviceNameKebab}.class.ts`);
  const hooksFile = join(dir, `${serviceNameKebab}.hooks.ts`);
  const sharedFile = join(dir, `${serviceNameKebab}.shared.ts`);
  const serviceFile = join(dir, `${serviceNameKebab}.ts`);
  const files = [
    ...schemaKind === "zod" ? [{ path: schemaFile, content: renderZodSchema(ids, opts.adapter, opts.idField) }] : schemaKind === "json" ? [{ path: schemaFile, content: renderJsonSchema(ids, opts.adapter, opts.idField) }] : [],
    { path: classFile, content: renderClass(ids, opts.adapter, collectionName, schemaKind) },
    ...schemaKind === "none" ? [{ path: hooksFile, content: renderHooksNoSchema(ids, opts.auth) }] : [],
    { path: sharedFile, content: renderShared(ids, servicePath, schemaKind) },
    { path: serviceFile, content: renderService(ids, opts.auth, opts.docs, schemaKind) }
  ];
  await ensureDir(dir, opts.dry);
  for (const f of files) {
    await writeFileSafe(f.path, f.content, { dry: opts.dry, force: opts.force });
  }
  if (opts.docs) {
    await ensureFeathersSwaggerSupport(opts.projectRoot, { dry: opts.dry, force: opts.force });
  }
  if (!opts.dry) {
    consola.success(`Generated service '${serviceNameKebab}' in ${relativeToCwd(dir)}`);
  }
}
async function ensureFeathersSwaggerSupport(projectRoot, io) {
  const typesDir = join(projectRoot, "types");
  const typesFile = join(typesDir, "feathers-swagger.d.ts");
  const typesContent = `// Auto-generated by nuxt-feathers-zod CLI (required when using feathers-swagger in TypeScript)

import type { ServiceSwaggerOptions } from 'feathers-swagger'

declare module '@feathersjs/feathers' {
  interface ServiceOptions {
    docs?: ServiceSwaggerOptions
  }
}
`;
  await ensureDir(typesDir, io.dry);
  await writeFileSafe(typesFile, typesContent, { dry: io.dry, force: io.force });
  try {
    const pkgPath = join(projectRoot, "package.json");
    if (!existsSync(pkgPath))
      return;
    const pkg = JSON.parse(await readFile(pkgPath, "utf8"));
    const deps = { ...pkg.dependencies ?? {}, ...pkg.devDependencies ?? {} };
    if (!deps["feathers-swagger"]) {
      consola.warn(
        `--docs was used but 'feathers-swagger' is not listed in package.json. Install it (and swagger UI deps if needed): bun add feathers-swagger swagger-ui-dist`
      );
    }
  } catch (e) {
  }
}
async function generateCustomService(opts) {
  const serviceNameKebab = normalizeServiceName(opts.name);
  const ids = createServiceIds(serviceNameKebab);
  const servicePath = normalizeServicePath(opts.servicePath ?? serviceNameKebab);
  const stdMethods = parseCsvMethods(opts.methods ?? "find");
  const customMethods = parseCsvMethods(opts.customMethods ?? "run").filter((m) => !STD_SERVICE_METHODS.has(m));
  if (stdMethods.length === 0 && customMethods.length === 0) {
    throw new Error("Custom service must register at least one method. Use --methods and/or --customMethods.");
  }
  if (stdMethods.length === 0)
    stdMethods.push("find");
  const dir = join(opts.servicesDir, serviceNameKebab);
  const schemaKind = opts.schema ?? "none";
  const schemaFile = join(dir, `${serviceNameKebab}.schema.ts`);
  const classFile = join(dir, `${serviceNameKebab}.class.ts`);
  const sharedFile = join(dir, `${serviceNameKebab}.shared.ts`);
  const serviceFile = join(dir, `${serviceNameKebab}.ts`);
  const hooksFile = join(dir, `${serviceNameKebab}.hooks.ts`);
  const files = [
    { path: classFile, content: renderCustomClass(ids, stdMethods, customMethods) },
    { path: sharedFile, content: renderCustomShared(ids, servicePath, stdMethods, customMethods, schemaKind) },
    { path: serviceFile, content: renderCustomService(ids, servicePath, stdMethods, customMethods, opts.auth, opts.docs, schemaKind) },
    { path: hooksFile, content: renderEmptyHooks(ids) }
  ];
  if (schemaKind === "zod") {
    files.unshift({ path: schemaFile, content: renderCustomSchema(ids, stdMethods, customMethods) });
  }
  await ensureDir(dir, opts.dry);
  for (const f of files) {
    await writeFileSafe(f.path, f.content, { dry: opts.dry, force: opts.force });
  }
  if (opts.docs) {
    await ensureFeathersSwaggerSupport(opts.projectRoot, { dry: opts.dry, force: opts.force });
  }
  if (!opts.dry) {
    consola.success(`Generated custom service '${serviceNameKebab}' in ${dir}`);
  }
}
var STD_SERVICE_METHODS = /* @__PURE__ */ new Set([
  "find",
  "get",
  "create",
  "update",
  "patch",
  "remove"
]);
function parseCsvMethods(value) {
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}
function uniq(arr) {
  return [...new Set(arr)];
}
async function generateMiddleware(opts) {
  const fileBase = kebabCase(opts.name);
  if (opts.target === "nitro") {
    const dir2 = join(opts.projectRoot, "server", "middleware");
    const file2 = join(dir2, `${fileBase}.ts`);
    await ensureDir(dir2, opts.dry);
    await writeFileSafe(file2, renderNitroMiddleware(fileBase), { dry: opts.dry, force: opts.force });
    if (!opts.dry)
      consola.success(`Generated Nitro middleware '${fileBase}' in ${relativeToCwd(file2)}`);
    return;
  }
  const dir = join(opts.projectRoot, "server", "feathers");
  const file = join(dir, `${fileBase}.ts`);
  await ensureDir(dir, opts.dry);
  await writeFileSafe(file, renderFeathersPlugin(fileBase), { dry: opts.dry, force: opts.force });
  if (!opts.dry)
    consola.success(`Generated Feathers server plugin '${fileBase}' in ${relativeToCwd(file)}`);
}
async function ensureDir(dir, dry) {
  if (dry)
    return;
  await mkdir(dir, { recursive: true });
}
async function writeFileSafe(path, content, opts) {
  if (!opts.force && existsSync(path)) {
    throw new Error(`File already exists: ${path} (use --force to overwrite)`);
  }
  if (opts.dry) {
    consola.info(`[dry] write ${relativeToCwd(path)}`);
    return;
  }
  await writeFile(path, content, "utf8");
}
function relativeToCwd(p) {
  try {
    return p.replace(`${resolve(process.cwd())}/`, "");
  } catch (e) {
    return p;
  }
}
function renderZodSchema(ids, adapter, idField) {
  const base = ids.baseCamel;
  const Base = ids.basePascal;
  const serviceClass = `${Base}Service`;
  const idSchemaField = idField;
  const idSchema = adapter === "mongodb" ? `
const objectIdRegex = /^[0-9a-f]{24}$/i
export const objectIdSchema = () => z.string().regex(objectIdRegex, 'Invalid ObjectId')
` : "";
  const mainSchema = adapter === "mongodb" ? `export const ${base}Schema = z.object({
  ${idSchemaField}: objectIdSchema(),
  text: z.string(),
})` : `export const ${base}Schema = z.object({
  ${idSchemaField}: z.number().int(),
  text: z.string(),
})`;
  const pickCreate = adapter === "mongodb" ? `{ text: true }` : `{ text: true }`;
  return `// For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html

import type { HookContext } from 'nuxt-feathers-zod/server'
import type { ${serviceClass} } from './${ids.serviceNameKebab}.class'
import { resolve } from '@feathersjs/schema'
import { zodQuerySyntax } from 'nuxt-feathers-zod/query'
import { getZodValidator } from 'nuxt-feathers-zod/validators'
import { z } from 'zod'
${idSchema}

// Main data model schema
${mainSchema}
export type ${Base} = z.infer<typeof ${base}Schema>
export const ${base}Validator = getZodValidator(${base}Schema, { kind: 'data' })
export const ${base}Resolver = resolve<${Base}, HookContext<${serviceClass}>>({})

export const ${base}ExternalResolver = resolve<${Base}, HookContext<${serviceClass}>>({})

// Schema for creating new entries
export const ${base}DataSchema = ${base}Schema.pick(${pickCreate})
export type ${Base}Data = z.infer<typeof ${base}DataSchema>
export const ${base}DataValidator = getZodValidator(${base}DataSchema, { kind: 'data' })
export const ${base}DataResolver = resolve<${Base}, HookContext<${serviceClass}>>({})

// Schema for updating existing entries
export const ${base}PatchSchema = ${base}Schema.partial()
export type ${Base}Patch = z.infer<typeof ${base}PatchSchema>
export const ${base}PatchValidator = getZodValidator(${base}PatchSchema, { kind: 'data' })
export const ${base}PatchResolver = resolve<${Base}, HookContext<${serviceClass}>>({})

// Schema for allowed query properties
export const ${base}QuerySchema = zodQuerySyntax(${base}Schema)
export type ${Base}Query = z.infer<typeof ${base}QuerySchema>
export const ${base}QueryValidator = getZodValidator(${base}QuerySchema, { kind: 'query' })
export const ${base}QueryResolver = resolve<${Base}Query, HookContext<${serviceClass}>>({})
`;
}
function renderClass(ids, adapter, collectionName, schemaKind) {
  const Base = ids.basePascal;
  const serviceName = ids.serviceNameKebab;
  const useSchema = schemaKind === "zod";
  const serviceClass = `${Base}Service`;
  const paramsName = `${Base}Params`;
  if (schemaKind === "none") {
    return renderClassNoSchema(ids, adapter, collectionName);
  }
  if (adapter === "memory") {
    return `// For more information about this file see https://dove.feathersjs.com/guides/cli/service.class.html#custom-services

import type { Params } from '@feathersjs/feathers'
import type { MemoryServiceOptions } from '@feathersjs/memory'
import type { Application } from 'nuxt-feathers-zod/server'
import type { ${Base}, ${Base}Data, ${Base}Patch, ${Base}Query } from './${serviceName}.schema'
import { MemoryService } from '@feathersjs/memory'

export type { ${Base}, ${Base}Data, ${Base}Patch, ${Base}Query }

export interface ${paramsName} extends Params<${Base}Query> {}

export class ${serviceClass}<ServiceParams extends Params = ${paramsName}> extends MemoryService<
  ${Base},
  ${Base}Data
> {}

export function getOptions(app: Application): MemoryServiceOptions<${Base}> {
  return {
    multi: true,
  }
}
`;
  }
  return `// For more information about this file see https://dove.feathersjs.com/guides/cli/service.class.html#database-services

import type { Params } from '@feathersjs/feathers'
import type { MongoDBAdapterOptions, MongoDBAdapterParams } from '@feathersjs/mongodb'
import type { Application } from 'nuxt-feathers-zod/server'
import type { ${Base}, ${Base}Data, ${Base}Patch, ${Base}Query } from './${serviceName}.schema'
import { MongoDBService } from '@feathersjs/mongodb'

export type { ${Base}, ${Base}Data, ${Base}Patch, ${Base}Query }

export interface ${paramsName} extends MongoDBAdapterParams<${Base}Query> {}

export class ${serviceClass}<ServiceParams extends Params = ${paramsName}> extends MongoDBService<
  ${Base},
  ${Base}Data,
  ${paramsName},
  ${Base}Patch
> {}

export function getOptions(app: Application): MongoDBAdapterOptions {
  const mongoClient = app.get('mongodbClient')
  return {
    paginate: {
      default: 10,
      max: 100,
    },
    multi: true,
    Model: mongoClient.then(db => db.collection('${collectionName}')),
  }
}
`;
}
function renderJsonSchema(ids, adapter, idField) {
  const base = ids.baseCamel;
  const Base = ids.basePascal;
  const serviceClass = `${Base}Service`;
  const idSchemaField = idField;
  const idType = adapter === "mongodb" ? "string" : "number";
  const idSchema = adapter === "mongodb" ? `
const objectIdRegex = '^[0-9a-f]{24}$'
` : "";
  return `// JSON Schema variant (generated by nuxt-feathers-zod CLI)
// For more information about Feathers schemas see https://dove.feathersjs.com/guides/cli/service.schemas.html

import type { HookContext } from 'nuxt-feathers-zod/server'
import type { ${serviceClass} } from './${ids.serviceNameKebab}.class'
import { resolve } from '@feathersjs/schema'
import { getValidator, querySyntax } from '@feathersjs/schema'
import { addFormats, Ajv } from '@feathersjs/schema'
import type { FormatsPluginOptions } from '@feathersjs/schema'
${idSchema}

const formats: FormatsPluginOptions = [
  'date-time',
  'time',
  'date',
  'email',
  'hostname',
  'ipv4',
  'ipv6',
  'uri',
  'uri-reference',
  'uuid',
  'uri-template',
  'json-pointer',
  'relative-json-pointer',
  'regex',
]

const dataValidatorAjv: Ajv = addFormats(new Ajv({}), formats)
const queryValidatorAjv: Ajv = addFormats(new Ajv({ coerceTypes: true }), formats)

// Main data model JSON schema
export const ${base}Schema = {
  $id: '${Base}',
  type: 'object',
  additionalProperties: true,
  properties: {
    ${idSchemaField}: { type: '${idType}' },
    text: { type: 'string' },
  },
} as const

export type ${Base} = {
  ${idSchemaField}: ${adapter === "mongodb" ? "string" : "number"}
  text: string
  [key: string]: any
}

export const ${base}Validator = getValidator(${base}Schema as any, dataValidatorAjv)
export const ${base}Resolver = resolve<${Base}, HookContext<${serviceClass}>>({})
export const ${base}ExternalResolver = resolve<${Base}, HookContext<${serviceClass}>>({})

// Schema for creating new entries
export const ${base}DataSchema = {
  ...${base}Schema,
  $id: '${Base}Data',
  required: ['text'],
  properties: {
    text: { type: 'string' },
  },
} as const

export type ${Base}Data = {
  text: string
  [key: string]: any
}

export const ${base}DataValidator = getValidator(${base}DataSchema as any, dataValidatorAjv)
export const ${base}DataResolver = resolve<${Base}, HookContext<${serviceClass}>>({})

// Schema for updating existing entries
export const ${base}PatchSchema = {
  ...${base}Schema,
  $id: '${Base}Patch',
} as const

export type ${Base}Patch = Partial<${Base}>
export const ${base}PatchValidator = getValidator(${base}PatchSchema as any, dataValidatorAjv)
export const ${base}PatchResolver = resolve<${Base}, HookContext<${serviceClass}>>({})

// Schema for allowed query properties
export const ${base}QuerySchema = querySyntax(${base}Schema as any)
export type ${Base}Query = Record<string, any>
export const ${base}QueryValidator = getValidator(${base}QuerySchema as any, queryValidatorAjv)
export const ${base}QueryResolver = resolve<${Base}Query, HookContext<${serviceClass}>>({})
`;
}
function renderClassNoSchema(ids, adapter, collectionName) {
  const Base = ids.basePascal;
  const serviceName = ids.serviceNameKebab;
  const serviceClass = `${Base}Service`;
  const paramsName = `${Base}Params`;
  const idField = adapter === "mongodb" ? "_id" : "id";
  if (adapter === "memory") {
    return `// For more information about this file see https://dove.feathersjs.com/guides/cli/service.class.html#custom-services

import type { Params } from '@feathersjs/feathers'
import type { MemoryServiceOptions } from '@feathersjs/memory'
import type { Application } from 'nuxt-feathers-zod/server'
import { MemoryService } from '@feathersjs/memory'

// No schema generated (schemaKind=none). Use Record<string, any> for types.
export type ${Base} = Record<string, any>
export type ${Base}Data = Partial<${Base}>
export type ${Base}Patch = Partial<${Base}>
export type ${Base}Query = Record<string, any>

export interface ${paramsName} extends Params<${Base}Query> {}

export class ${serviceClass}<ServiceParams extends Params = ${paramsName}> extends MemoryService<
  ${Base},
  ${Base}Data
> {}

export function getOptions(app: Application): MemoryServiceOptions<${Base}> {
  return {
    multi: true,
  }
}
`;
  }
  return `// For more information about this file see https://dove.feathersjs.com/guides/cli/service.class.html#database-services

import type { Params } from '@feathersjs/feathers'
import type { MongoDBAdapterOptions, MongoDBAdapterParams } from '@feathersjs/mongodb'
import type { Application } from 'nuxt-feathers-zod/server'
import { MongoDBService } from '@feathersjs/mongodb'

// No schema generated (schemaKind=none). Use Record<string, any> for types.
export type ${Base} = Record<string, any>
export type ${Base}Data = Partial<${Base}>
export type ${Base}Patch = Partial<${Base}>
export type ${Base}Query = Record<string, any>

export interface ${paramsName} extends MongoDBAdapterParams<${Base}Query> {}

export class ${serviceClass}<ServiceParams extends Params = ${paramsName}> extends MongoDBService<
  ${Base},
  ${Base}Data,
  ${paramsName},
  ${Base}Patch
> {}

export function getOptions(app: Application): MongoDBAdapterOptions {
  const mongoClient = app.get('mongodbClient')
  return {
    paginate: {
      default: 10,
      max: 100,
    },
    multi: true,
    Model: mongoClient.then(db => db.collection('${collectionName}')),
  }
}
`;
}
function renderShared(ids, servicePath, schemaKind) {
  const base = ids.baseCamel;
  const Base = ids.basePascal;
  const serviceName = ids.serviceNameKebab;
  const useSchema = schemaKind === "zod";
  const serviceClass = `${Base}Service`;
  const methodsConst = `${base}Methods`;
  const pathConst = `${base}Path`;
  const clientFn = `${base}Client`;
  const clientServiceType = `${Base}ClientService`;
  return `// For more information about this file see https://dove.feathersjs.com/guides/cli/service.shared.html

import type { Params } from '@feathersjs/feathers'
import type { ClientApplication } from 'nuxt-feathers-zod/client'
import type { ${Base}, ${Base}Data, ${Base}Patch, ${Base}Query, ${serviceClass} } from './${serviceName}.class'

export type { ${Base}, ${Base}Data, ${Base}Patch, ${Base}Query }

export type ${clientServiceType} = Pick<${serviceClass}<Params<${Base}Query>>, (typeof ${methodsConst})[number]>

export const ${pathConst} = '${servicePath}'

export const ${methodsConst}: Array<keyof ${serviceClass}> = ['find', 'get', 'create', 'patch', 'remove']

export function ${clientFn}(client: ClientApplication) {
  const connection = client.get('connection')

  client.use(${pathConst}, connection.service(${pathConst}), {
    methods: ${methodsConst},
  })
}

declare module 'nuxt-feathers-zod/client' {
  interface ServiceTypes {
    [${pathConst}]: ${clientServiceType}
  }
}
`;
}
function renderService(ids, auth, docs, schemaKind) {
  const base = ids.baseCamel;
  const Base = ids.basePascal;
  const serviceName = ids.serviceNameKebab;
  const useSchema = schemaKind === "zod";
  const serviceClass = `${Base}Service`;
  if (schemaKind === "none") {
    return renderServiceNoSchema(ids, auth, docs);
  }
  const authImports = auth ? "import { authenticate } from '@feathersjs/authentication'\n" : "";
  const swaggerImports = "";
  const swaggerSchemaImports = "";
  const docsBlock = docs ? `
    docs: {
      description: '${Base} service',
      idType: 'string',
${auth ? `      securities: ${base}Methods,
` : ""}      definitions: {
        ${base}: { type: 'object', properties: {} },
        ${base}Data: { type: 'object', properties: {} },
        ${base}Patch: { type: 'object', properties: {} },
        ${base}Query: {
          type: 'object',
          properties: {
            $limit: { type: 'number' },
            $skip: { type: 'number' },
            $sort: { type: 'object', additionalProperties: { type: 'number' } },
          },
        },
      },
    },
` : "";
  const authAround = auth ? `
      find: [authenticate('jwt')],
      get: [authenticate('jwt')],
      create: [],
      patch: [authenticate('jwt')],
      remove: [authenticate('jwt')],
` : `
      find: [],
      get: [],
      create: [],
      patch: [],
      remove: [],
`;
  return `// For more information about this file see https://dove.feathersjs.com/guides/cli/service.html

import type { Application } from 'nuxt-feathers-zod/server'
${authImports}${swaggerImports}import { hooks as schemaHooks } from '@feathersjs/schema'
import { getOptions, ${serviceClass} } from './${serviceName}.class'
import {
${swaggerSchemaImports}  ${base}DataResolver,
  ${base}DataValidator,
  ${base}ExternalResolver,
  ${base}PatchResolver,
  ${base}PatchValidator,
  ${base}QueryResolver,
  ${base}QueryValidator,
  ${base}Resolver,
} from './${serviceName}.schema'
import { ${base}Methods, ${base}Path } from './${serviceName}.shared'

export * from './${serviceName}.class'
export * from './${serviceName}.schema'

export function ${base}(app: Application) {
  app.use(${base}Path, new ${serviceClass}(getOptions(app)), {
    methods: ${base}Methods,
    events: [],${docsBlock}
  })

  app.service(${base}Path).hooks({
    around: {
      all: [schemaHooks.resolveExternal(${base}ExternalResolver), schemaHooks.resolveResult(${base}Resolver)],
${authAround}    },
    before: {
      all: [schemaHooks.validateQuery(${base}QueryValidator), schemaHooks.resolveQuery(${base}QueryResolver)],
      find: [],
      get: [],
      create: [schemaHooks.validateData(${base}DataValidator), schemaHooks.resolveData(${base}DataResolver)],
      patch: [schemaHooks.validateData(${base}PatchValidator), schemaHooks.resolveData(${base}PatchResolver)],
      remove: [],
    },
    after: {
      all: [],
    },
    error: {
      all: [],
    },
  })
}

declare module 'nuxt-feathers-zod/server' {
  interface ServiceTypes {
    [${base}Path]: ${serviceClass}
  }
}
`;
}
function renderServiceNoSchema(ids, auth, docs) {
  const base = ids.baseCamel;
  const Base = ids.basePascal;
  const serviceName = ids.serviceNameKebab;
  const serviceClass = `${Base}Service`;
  const authImports = auth ? "import { authenticate } from '@feathersjs/authentication'\n" : "";
  const docsBlock = docs ? `
    docs: {
      description: '${Base} service',
      idType: 'string',
      definitions: {},
    },
` : "";
  return `// For more information about this file see https://dove.feathersjs.com/guides/cli/service.html

import type { Application } from 'nuxt-feathers-zod/server'
${authImports}import { getOptions, ${serviceClass} } from './${serviceName}.class'
import { ${base}Hooks } from './${serviceName}.hooks'
import { ${base}Methods, ${base}Path } from './${serviceName}.shared'

export * from './${serviceName}.class'
export * from './${serviceName}.shared'

export function ${base}(app: Application) {
  app.use(${base}Path, new ${serviceClass}(getOptions(app)), {
    methods: ${base}Methods,
    events: [],${docsBlock}
  })

  app.service(${base}Path).hooks(${base}Hooks)
}

declare module 'nuxt-feathers-zod/server' {
  interface ServiceTypes {
    [${base}Path]: ${serviceClass}
  }
}
`;
}
function renderHooksNoSchema(ids, auth) {
  const base = ids.baseCamel;
  const Base = ids.basePascal;
  const Service = `${Base}Service`;
  const authImports = auth ? "import { authenticate } from '@feathersjs/authentication'\n" : "";
  const authAround = auth ? `
    find: [authenticate('jwt')],
    get: [authenticate('jwt')],
    create: [],
    patch: [authenticate('jwt')],
    remove: [authenticate('jwt')],
` : `
    find: [],
    get: [],
    create: [],
    patch: [],
    remove: [],
`;
  return `// For more information about this file see https://dove.feathersjs.com/guides/cli/hooks.html

import type { HooksObject } from '@feathersjs/feathers'
${authImports}import type { Application } from 'nuxt-feathers-zod/server'
import type { ${Service} } from './${ids.serviceNameKebab}.class'

// No schema: keep hooks file so the service stays "initiatives-like" and easy to extend.
export const ${base}Hooks: HooksObject<Application, ${Service}> = {
  around: {
    all: [],${authAround}  },
  before: {
    all: [],
    find: [],
    get: [],
    create: [],
    patch: [],
    remove: [],
  },
  after: {
    all: [],
  },
  error: {
    all: [],
  },
}
`;
}
function renderEmptyHooks(_ids) {
  return `// ! Generated by nuxt-feathers-zod - do not change manually

export default {}
`;
}
function renderCustomSchema(ids, stdMethods, customMethods) {
  const Base = ids.basePascal;
  const base = ids.baseCamel;
  const customSchemas = customMethods.length ? customMethods.map((m) => {
    const M = pascalCase(m);
    if (m === "run") {
      return `
export const ${base}${M}DataSchema = z.object({
  action: z.string().min(1),
  payload: z.unknown().optional(),
})
export type ${Base}${M}Data = z.infer<typeof ${base}${M}DataSchema>

export const ${base}${M}ResultSchema = z.object({
  acknowledged: z.boolean(),
  action: z.string(),
  received: z.unknown().optional(),
})
export type ${Base}${M}Result = z.infer<typeof ${base}${M}ResultSchema>
`;
    }
    return `
export const ${base}${M}DataSchema = z.unknown()
export type ${Base}${M}Data = z.infer<typeof ${base}${M}DataSchema>

export const ${base}${M}ResultSchema = z.unknown()
export type ${Base}${M}Result = z.infer<typeof ${base}${M}ResultSchema>
`;
  }).join("\n") : "";
  return `// ! Generated by nuxt-feathers-zod - custom service template
import { z } from 'zod'

${customSchemas}
`;
}
function renderCustomClass(ids, stdMethods, customMethods) {
  const Base = ids.basePascal;
  const serviceClass = `${Base}Service`;
  const stdImpl = uniq(stdMethods).length ? uniq(stdMethods).map((m) => {
    if (m === "find") {
      return `
  async find(_params?: Params) {
    return [{ ok: true, source: '${ids.serviceNameKebab}.${m}' }]
  }`;
    }
    if (m === "get") {
      return `
  async get(id: Id, _params?: Params) {
    return { id, ok: true, source: '${ids.serviceNameKebab}.${m}' }
  }`;
    }
    if (m === "create") {
      return `
  async create(data: any, _params?: Params) {
    return { ok: true, data, source: '${ids.serviceNameKebab}.${m}' }
  }`;
    }
    if (m === "patch") {
      return `
  async patch(id: NullableId, data: any, _params?: Params) {
    return { ok: true, id, data, source: '${ids.serviceNameKebab}.${m}' }
  }`;
    }
    if (m === "remove") {
      return `
  async remove(id: NullableId, _params?: Params) {
    return { ok: true, id, source: '${ids.serviceNameKebab}.${m}' }
  }`;
    }
    if (m === "update") {
      return `
  async update(id: NullableId, data: any, _params?: Params) {
    return { ok: true, id, data, source: '${ids.serviceNameKebab}.${m}' }
  }`;
    }
    return `
  async ${m}(..._args: any[]) {
    throw new Error('${ids.serviceNameKebab}.${m} not implemented')
  }`;
  }).join("\n") : "";
  const customImpl = uniq(customMethods).length ? uniq(customMethods).map((m) => {
    const M = pascalCase(m);
    const DataT = `${Base}${M}Data`;
    const ResT = `${Base}${M}Result`;
    if (m === "run") {
      return `
  async ${m}(data: ${DataT}, _params?: Params): Promise<${ResT}> {
    return {
      acknowledged: true,
      action: data.action,
      received: data.payload,
    }
  }`;
    }
    return `
  async ${m}(data: ${DataT}, _params?: Params): Promise<${ResT}> {
    return data as any
  }`;
  }).join("\n") : "";
  const schemaImports = uniq(customMethods).map((m) => {
    const M = pascalCase(m);
    return `type ${Base}${M}Data, type ${Base}${M}Result`;
  });
  const schemaImportLine = schemaImports.length ? `import { ${schemaImports.join(", ")} } from './${ids.serviceNameKebab}.schema'` : "";
  return `// ! Generated by nuxt-feathers-zod - custom service template
import type { Id, NullableId, Params } from '@feathersjs/feathers'
import type { Application } from 'nuxt-feathers-zod/server'
${schemaImportLine}

export class ${serviceClass} {
  constructor(public app: Application) {}

${stdImpl}

${customImpl}
}
`;
}
function renderCustomShared(ids, servicePath, stdMethods, customMethods, schemaKind) {
  const Base = ids.basePascal;
  const base = ids.baseCamel;
  const serviceName = ids.serviceNameKebab;
  const useSchema = schemaKind === "zod";
  const stdList = uniq(stdMethods);
  const customList = uniq(customMethods);
  const allClientMethods = uniq([...stdList, ...customList]);
  const schemaImports = useSchema ? customList.map((m) => {
    const M = pascalCase(m);
    return `type ${Base}${M}Data, type ${Base}${M}Result`;
  }) : [];
  const schemaImportLine = schemaImports.length ? `import { ${schemaImports.join(", ")} } from './${serviceName}.schema'` : "";
  const patches = customList.length ? customList.map((m) => {
    const M = pascalCase(m);
    const DataT = `${Base}${M}Data`;
    const ResT = `${Base}${M}Result`;
    return `
function attach_${m}(client: ClientApplication, remote: any) {
  if (typeof remote?.${m} === 'function')
    return

  // 1) REST transport
  if (typeof remote?.request === 'function') {
    remote.${m} = (data: ${DataT}, params?: Params) =>
      remote.request({ method: '${m}', body: data }, params)
    return
  }

  // 2) Socket transport (best-effort)
  if (typeof remote?.send === 'function') {
    remote.${m} = (data: ${DataT}, params?: Params) =>
      remote.send('${m}', data, params)
    return
  }

  // 3) Universal HTTP fallback
  remote.${m} = async (data: ${DataT}, params?: Params): Promise<${ResT}> => {
    const cfg: any = useRuntimeConfig()
    const pub = cfg.public?.feathers ?? {}

    const baseURL = pub.restUrl ?? pub.baseURL ?? pub.url ?? ''
    const prefix
      = pub.rest?.path
      ?? pub.restPath
      ?? pub.prefix
      ?? '/feathers'

    const url = joinURL(baseURL, prefix, '${servicePath}', '${m}')

    const headers: Record<string, string> = {}
    const auth = (params as any)?.headers?.authorization || (params as any)?.headers?.Authorization
    if (auth)
      headers.authorization = auth

    return await $fetch<${ResT}>(url, { method: 'POST', body: data, headers })
  }
}
`;
  }).join("\n") : "";
  const attachCalls = customList.map((m) => `    attach_${m}(client, remote)`).join("\n");
  const ssrMethodsList = JSON.stringify(stdList.length ? stdList : ["find"]);
  return `// ! Generated by nuxt-feathers-zod - custom service template
import type { Params } from '@feathersjs/feathers'
import type { ClientApplication } from 'nuxt-feathers-zod/client'
import type { RestService } from '@feathersjs/rest-client'
import { joinURL } from 'ufo'
${schemaImportLine}

export const ${base}Path = '${servicePath}'
export const ${base}Methods = ${JSON.stringify(allClientMethods)} as const

export type ${Base}ClientService = RestService & {
${customList.map((m) => {
    const M = pascalCase(m);
    return `  ${m}(data: ${Base}${M}Data, params?: Params): Promise<${Base}${M}Result>`;
  }).join("\n")}
}

${patches}

export function ${base}Client(client: ClientApplication) {
  const connection: any = client.get('connection')
  const remote: any = connection.service(${base}Path)

  // SSR-safe: register only standard methods on server
  if (import.meta.server) {
    client.use(${base}Path, remote, { methods: ${ssrMethodsList} })
    return
  }

${attachCalls}

  client.use(${base}Path, remote, { methods: ${JSON.stringify(allClientMethods)} })
}

declare module 'nuxt-feathers-zod/client' {
  interface ServiceTypes {
    [${base}Path]: ${Base}ClientService
  }
}
`;
}
function renderCustomService(ids, servicePath, stdMethods, customMethods, auth, docs, schemaKind) {
  const Base = ids.basePascal;
  const base = ids.baseCamel;
  const serviceName = ids.serviceNameKebab;
  const useSchema = schemaKind === "zod";
  const serviceClass = `${Base}Service`;
  const authImports = auth ? "import { authenticate } from '@feathersjs/authentication'\n" : "";
  const allMethods = uniq([...stdMethods, ...customMethods]);
  const methodsConst = `${base}Methods`;
  const hookBefore = auth ? `      all: [authenticate('jwt')],
` : "";
  const schemaHookImports = customMethods.length ? "import { schemaHooks } from '@feathersjs/schema'\n" : "";
  const schemaImports = customMethods.length ? customMethods.map((m) => {
    const M = pascalCase(m);
    return `${base}${M}DataSchema, ${base}${M}ResultSchema`;
  }).join(", ") : "";
  const customHookBlocks = customMethods.length ? customMethods.map((m) => {
    const M = pascalCase(m);
    return `      ${m}: [
        schemaHooks.validateData(${base}${M}DataSchema),
        schemaHooks.resolveData(async (ctx) => ctx),
      ],`;
  }).join("\n") : "";
  const customAroundBlocks = customMethods.length ? customMethods.map((m) => {
    const M = pascalCase(m);
    return `      ${m}: [
        async (context) => {
          ${base}${M}ResultSchema.parse(context.result)
          return context
        },
      ],`;
  }).join("\n") : "";
  return `// ! Generated by nuxt-feathers-zod - custom service template
import type { Application } from 'nuxt-feathers-zod/server'
${authImports}${schemaHookImports}import { ${serviceClass} } from './${serviceName}.class'
${customMethods.length ? `import { ${schemaImports} } from './${serviceName}.schema'
` : ""}

export const ${base}Path = '${servicePath}'
export const ${methodsConst} = ${JSON.stringify(allMethods)} as const

export function ${base}(app: Application) {
  app.use(${base}Path, new ${serviceClass}(app), {
    methods: ${methodsConst} as unknown as string[],
    events: [],
  })

  app.service(${base}Path).hooks({
    around: {
      all: [],
      ${customMethods.length ? customAroundBlocks : ""}
    },
    before: {
${hookBefore}${customMethods.length ? customHookBlocks : ""}
    },
    after: {
      all: [],
    },
  })
}

declare module 'nuxt-feathers-zod/server' {
  interface ServiceTypes {
    [${base}Path]: ${serviceClass}
  }
}
`;
}
function renderNitroMiddleware(name) {
  const nice = name.replace(/-/g, " ");
  return `// Nitro middleware: ${nice}
// Runs on every request (or conditionally based on route rules).

export default defineEventHandler(async (event) => {
  // Example: attach a request id
  // event.context.requestId = crypto.randomUUID()
})
`;
}
function renderFeathersPlugin(name) {
  const nice = name.replace(/-/g, " ");
  return `// Feathers server plugin: ${nice}
// Loaded by Nuxt Nitro server (see playground/server/feathers/*.ts for examples)

import type { HookContext, NextFunction } from 'nuxt-feathers-zod/server'
import { defineFeathersServerPlugin } from 'nuxt-feathers-zod/server'

export default defineFeathersServerPlugin((app) => {
  app.hooks({
    setup: [
      async (context: HookContext, next: NextFunction) => {
        // Place initialization logic here
        await next()
      },
    ],
  })
})
`;
}
function ensureNestedClientRemote(objLiteral, patch) {
  const block = locateObjectLiteral(objLiteral, /\bclient\s*:\s*\{/);
  if (!block) return objLiteral;
  const before = objLiteral.slice(0, block.start);
  const clientObj = objLiteral.slice(block.start, block.end);
  const after = objLiteral.slice(block.end);
  let patchedClient = clientObj;
  const wantsRemote = patch.clientMode === "remote" || !!patch.remote || !!patch.remoteService;
  const wantsEmbedded = patch.clientMode === "embedded";
  if (wantsEmbedded) {
    if (/\bmode\s*:/.test(patchedClient)) {
      patchedClient = patchedClient.replace(/\bmode\s*:\s*['"][^'"]+['"]/, "mode: 'embedded'");
    } else {
      patchedClient = insertProp(patchedClient, "mode: 'embedded'");
    }
    return before + patchedClient + after;
  }
  if (wantsRemote) {
    if (/\bmode\s*:/.test(patchedClient)) {
      patchedClient = patchedClient.replace(/\bmode\s*:\s*['"][^'"]+['"]/, "mode: 'remote'");
    } else {
      patchedClient = insertProp(patchedClient, "mode: 'remote'");
    }
    if (/\bremote\s*:/.test(patchedClient)) {
      patchedClient = patchNestedRemoteObject(patchedClient, patch);
    } else {
      const parts = [];
      if (patch.remote?.url) parts.push(`url: '${patch.remote.url}'`);
      if (patch.remote?.transport) parts.push(`transport: '${patch.remote.transport}'`);
      if (patch.remote?.restPath) parts.push(`restPath: '${patch.remote.restPath}'`);
      if (patch.remote?.websocketPath) parts.push(`websocketPath: '${patch.remote.websocketPath}'`);
      if (patch.remote?.auth) {
        const a = patch.remote.auth;
        const ap = [];
        if (a.enabled !== void 0) ap.push(`enabled: ${a.enabled}`);
        if (a.payloadMode) ap.push(`payloadMode: '${a.payloadMode}'`);
        if (a.strategy) ap.push(`strategy: '${a.strategy}'`);
        if (a.tokenField) ap.push(`tokenField: '${a.tokenField}'`);
        if (a.servicePath) ap.push(`servicePath: '${a.servicePath}'`);
        if (a.reauth !== void 0) ap.push(`reauth: ${a.reauth}`);
        parts.push(`auth: { ${ap.join(", ")} }`);
      }
      if (patch.remoteService) {
        const entry = `{ path: '${patch.remoteService.path}'${patch.remoteService.methods?.length ? `, methods: ${JSON.stringify(patch.remoteService.methods)}` : ""} }`;
        parts.push(`services: [${entry}]`);
      }
      patchedClient = insertProp(patchedClient, `remote: { ${parts.join(", ")} }`);
    }
  }
  return before + patchedClient + after;
}
function patchNestedRemoteObject(clientObjLiteral, patch) {
  const block = locateObjectLiteral(clientObjLiteral, /\bremote\s*:\s*\{/);
  if (!block) return clientObjLiteral;
  const before = clientObjLiteral.slice(0, block.start);
  const remoteObj = clientObjLiteral.slice(block.start, block.end);
  const after = clientObjLiteral.slice(block.end);
  let patched = remoteObj;
  if (patch.remote?.url) {
    if (/\burl\s*:/.test(patched)) {
      patched = patched.replace(/\burl\s*:\s*['"][^'"]*['"]/, `url: '${patch.remote.url}'`);
    } else {
      patched = insertProp(patched, `url: '${patch.remote.url}'`);
    }
  }
  if (patch.remote?.transport) {
    if (/\btransport\s*:/.test(patched)) {
      patched = patched.replace(/\btransport\s*:\s*['"][^'"]*['"]/, `transport: '${patch.remote.transport}'`);
    } else {
      patched = insertProp(patched, `transport: '${patch.remote.transport}'`);
    }
  }
  if (patch.remote?.restPath) {
    if (/\brestPath\s*:/.test(patched)) {
      patched = patched.replace(/\brestPath\s*:\s*['"][^'"]*['"]/, `restPath: '${patch.remote.restPath}'`);
    } else {
      patched = insertProp(patched, `restPath: '${patch.remote.restPath}'`);
    }
  }
  if (patch.remote?.websocketPath) {
    if (/\bwebsocketPath\s*:/.test(patched)) {
      patched = patched.replace(/\bwebsocketPath\s*:\s*['"][^'"]*['"]/, `websocketPath: '${patch.remote.websocketPath}'`);
    } else {
      patched = insertProp(patched, `websocketPath: '${patch.remote.websocketPath}'`);
    }
  }
  if (patch.remote?.auth) {
    const a = patch.remote.auth;
    if (/\bauth\s*:/.test(patched)) {
      patched = patchNestedAuthObject(patched, a);
    } else {
      const ap = [];
      if (a.enabled !== void 0) ap.push(`enabled: ${a.enabled}`);
      if (a.payloadMode) ap.push(`payloadMode: '${a.payloadMode}'`);
      if (a.strategy) ap.push(`strategy: '${a.strategy}'`);
      if (a.tokenField) ap.push(`tokenField: '${a.tokenField}'`);
      if (a.servicePath) ap.push(`servicePath: '${a.servicePath}'`);
      if (a.reauth !== void 0) ap.push(`reauth: ${a.reauth}`);
      patched = insertProp(patched, `auth: { ${ap.join(", ")} }`);
    }
  }
  if (patch.remoteService) {
    const entry = `{ path: '${patch.remoteService.path}'${patch.remoteService.methods?.length ? `, methods: ${JSON.stringify(patch.remoteService.methods)}` : ""} }`;
    if (/\bservices\s*:/.test(patched)) {
      if (!new RegExp(`paths*:s*['"]${escapeRegExp(patch.remoteService.path)}['"]`).test(patched)) {
        patched = patched.replace(/(\bservices\s*:\s*\[)([\s\S]*?)(\])/, (all, a, inner, b) => {
          const trimmed = String(inner).trim();
          const nextInner = trimmed.length ? `${trimmed.replace(/\s+$/, "")}, ${entry}` : `${entry}`;
          return `${a}${nextInner}${b}`;
        });
      }
    } else {
      patched = insertProp(patched, `services: [${entry}]`);
    }
  }
  return before + patched + after;
}
function patchNestedAuthObject(remoteObjLiteral, auth) {
  const block = locateObjectLiteral(remoteObjLiteral, /\bauth\s*:\s*\{/);
  if (!block) return remoteObjLiteral;
  const before = remoteObjLiteral.slice(0, block.start);
  const authObj = remoteObjLiteral.slice(block.start, block.end);
  const after = remoteObjLiteral.slice(block.end);
  let patched = authObj;
  if (auth?.enabled !== void 0) {
    if (/\benabled\s*:/.test(patched)) patched = patched.replace(/\benabled\s*:\s*(true|false)/, `enabled: ${auth.enabled}`);
    else patched = insertProp(patched, `enabled: ${auth.enabled}`);
  }
  if (auth?.payloadMode) {
    if (/\bpayloadMode\s*:/.test(patched)) patched = patched.replace(/\bpayloadMode\s*:\s*['"][^'"]*['"]/, `payloadMode: '${auth.payloadMode}'`);
    else patched = insertProp(patched, `payloadMode: '${auth.payloadMode}'`);
  }
  if (auth?.strategy) {
    if (/\bstrategy\s*:/.test(patched)) patched = patched.replace(/\bstrategy\s*:\s*['"][^'"]*['"]/, `strategy: '${auth.strategy}'`);
    else patched = insertProp(patched, `strategy: '${auth.strategy}'`);
  }
  if (auth?.tokenField) {
    if (/\btokenField\s*:/.test(patched)) patched = patched.replace(/\btokenField\s*:\s*['"][^'"]*['"]/, `tokenField: '${auth.tokenField}'`);
    else patched = insertProp(patched, `tokenField: '${auth.tokenField}'`);
  }
  if (auth?.servicePath) {
    if (/\bservicePath\s*:/.test(patched)) patched = patched.replace(/\bservicePath\s*:\s*['"][^'"]*['"]/, `servicePath: '${auth.servicePath}'`);
    else patched = insertProp(patched, `servicePath: '${auth.servicePath}'`);
  }
  if (auth?.reauth !== void 0) {
    if (/\breauth\s*:/.test(patched)) patched = patched.replace(/\breauth\s*:\s*(true|false)/, `reauth: ${auth.reauth}`);
    else patched = insertProp(patched, `reauth: ${auth.reauth}`);
  }
  return before + patched + after;
}

// tmp/nfz/src/cli/index.ts
async function runCli(argv, opts) {
  try {
    const cwd = resolve2(opts.cwd);
    const [cmd, subcmd, nameOrTarget, ...rest] = argv;
    if (!cmd || cmd === "-h" || cmd === "--help") {
      printHelp();
      return;
    }
    if (cmd === "doctor") {
      const projectRoot2 = await findProjectRoot(cwd);
      await runDoctor(projectRoot2);
      return;
    }
    if (cmd === "remote" && subcmd === "auth" && nameOrTarget === "keycloak") {
      const flags2 = parseFlags(rest);
      const projectRoot2 = await findProjectRoot(cwd);
      const dry2 = Boolean(flags2.dry);
      const ssoUrl = typeof flags2.ssoUrl === "string" ? String(flags2.ssoUrl) : typeof flags2.url === "string" ? String(flags2.url) : "";
      const realm = typeof flags2.realm === "string" ? String(flags2.realm) : "";
      const clientId = typeof flags2.clientId === "string" ? String(flags2.clientId) : "";
      if (!ssoUrl || !realm || !clientId) {
        consola2.error("Missing required flags: --ssoUrl <url> --realm <realm> --clientId <id>");
        printHelp();
        process.exitCode = 1;
        return;
      }
      await tryPatchNuxtConfig(projectRoot2, {
        clientMode: "remote",
        remote: {
          url: "",
          auth: { enabled: true, payloadMode: "keycloak", strategy: "jwt", tokenField: "accessToken", servicePath: "authentication", reauth: true }
        },
        keycloak: {
          serverUrl: ssoUrl,
          realm,
          clientId,
          onLoad: "check-sso"
        }
      }, { dry: dry2 });
      return;
    }
    if (cmd === "init") {
      const initTarget = subcmd;
      if (initTarget !== "templates" && initTarget !== "embedded" && initTarget !== "remote") {
        consola2.error(`Unknown init target: ${initTarget ?? "(missing)"}`);
        printHelp();
        process.exitCode = 1;
        return;
      }
      const flags2 = parseFlags([nameOrTarget, ...rest].filter(Boolean));
      const projectRoot2 = await findProjectRoot(cwd);
      const dry2 = Boolean(flags2.dry);
      if (initTarget === "templates") {
        const dir = typeof flags2.dir === "string" ? String(flags2.dir) : "feathers/templates";
        const force2 = Boolean(flags2.force);
        await initTemplates({ projectRoot: projectRoot2, outDir: resolve2(projectRoot2, dir), force: force2, dry: dry2 });
        await tryPatchNuxtConfig(projectRoot2, { templatesDir: dir }, { dry: dry2 });
        return;
      }
      if (initTarget === "embedded") {
        const servicesDir = typeof flags2.servicesDir === "string" ? String(flags2.servicesDir) : "services";
        const framework = typeof flags2.framework === "string" ? String(flags2.framework) : "express";
        const restPath2 = typeof flags2.restPath === "string" ? String(flags2.restPath) : "/feathers";
        const websocketPath2 = typeof flags2.websocketPath === "string" ? String(flags2.websocketPath) : "/socket.io";
        const secureDefaults = flags2.secureDefaults === void 0 ? true : Boolean(flags2.secureDefaults);
        const enableAuth = flags2.auth === void 0 ? false : Boolean(flags2.auth);
        const enableSwagger = flags2.swagger === void 0 ? false : Boolean(flags2.swagger);
        await tryPatchNuxtConfig(projectRoot2, {
          clientMode: "embedded",
          servicesDir,
          embedded: {
            framework,
            restPath: restPath2,
            websocketPath: websocketPath2,
            secureDefaults,
            auth: enableAuth,
            swagger: enableSwagger
          }
        }, { dry: dry2 });
        return;
      }
      const flagsUrl = typeof flags2.url === "string" ? String(flags2.url) : "";
      const transport = typeof flags2.transport === "string" ? String(flags2.transport) : "socketio";
      const restPath = typeof flags2.restPath === "string" ? String(flags2.restPath) : "/feathers";
      const websocketPath = typeof flags2.websocketPath === "string" ? String(flags2.websocketPath) : "/socket.io";
      if (!flagsUrl) {
        consola2.error("Missing required flag: --url <http(s)://...>");
        printHelp();
        process.exitCode = 1;
        return;
      }
      const authEnabled = Boolean(flags2.auth);
      const payloadMode = typeof flags2.payloadMode === "string" ? String(flags2.payloadMode) : "jwt";
      const strategy = typeof flags2.strategy === "string" ? String(flags2.strategy) : "jwt";
      const tokenField = typeof flags2.tokenField === "string" ? String(flags2.tokenField) : "accessToken";
      const servicePath = typeof flags2.servicePath === "string" ? String(flags2.servicePath) : "authentication";
      const reauth = flags2.reauth === void 0 ? true : Boolean(flags2.reauth);
      await tryPatchNuxtConfig(projectRoot2, {
        clientMode: "remote",
        remote: {
          url: flagsUrl,
          transport,
          restPath,
          websocketPath,
          auth: authEnabled ? { enabled: true, payloadMode, strategy, tokenField, servicePath, reauth } : { enabled: false }
        }
      }, { dry: dry2 });
      return;
    }
    if (cmd !== "add") {
      consola2.error(`Unknown command: ${cmd}`);
      printHelp();
      process.exitCode = 1;
      return;
    }
    if (subcmd !== "service" && subcmd !== "custom-service" && subcmd !== "remote-service" && subcmd !== "middleware") {
      consola2.error(`Unknown add target: ${subcmd ?? "(missing)"}`);
      printHelp();
      process.exitCode = 1;
      return;
    }
    if (!nameOrTarget) {
      consola2.error("Missing <name>.");
      printHelp();
      process.exitCode = 1;
      return;
    }
    const flags = parseFlags(rest);
    if (subcmd === "service") {
      const adapter = flags.adapter ?? "memory";
      const auth = Boolean(flags.auth);
      const idField = flags.idField ?? (adapter === "mongodb" ? "_id" : "id");
      const servicePath = typeof flags.path === "string" ? String(flags.path) : void 0;
      const collectionName = typeof flags.collection === "string" ? String(flags.collection) : void 0;
      const docs = Boolean(flags.docs);
      const schema = flags.schema ?? "none";
      const dry2 = Boolean(flags.dry);
      const force2 = Boolean(flags.force);
      const projectRoot2 = await findProjectRoot(cwd);
      const servicesDirName = typeof flags.servicesDir === "string" ? String(flags.servicesDir) : "services";
      const servicesDir = resolve2(projectRoot2, servicesDirName);
      await generateService({
        projectRoot: projectRoot2,
        servicesDir,
        name: nameOrTarget,
        adapter,
        auth,
        idField,
        servicePath,
        collectionName,
        docs,
        schema,
        dry: dry2,
        force: force2
      });
      await tryPatchNuxtConfig(projectRoot2, { servicesDir: servicesDirName }, { dry: dry2 });
      return;
    }
    if (subcmd === "custom-service") {
      const auth = Boolean(flags.auth);
      const servicePath = typeof flags.path === "string" ? String(flags.path) : void 0;
      const methods = typeof flags.methods === "string" ? String(flags.methods) : void 0;
      const customMethods = typeof flags.customMethods === "string" ? String(flags.customMethods) : void 0;
      const docs = Boolean(flags.docs);
      const schema = flags.schema ?? "none";
      const dry2 = Boolean(flags.dry);
      const force2 = Boolean(flags.force);
      const projectRoot2 = await findProjectRoot(cwd);
      const servicesDirName = typeof flags.servicesDir === "string" ? String(flags.servicesDir) : "services";
      const servicesDir = resolve2(projectRoot2, servicesDirName);
      await generateCustomService({
        projectRoot: projectRoot2,
        servicesDir,
        name: nameOrTarget,
        auth,
        servicePath,
        methods,
        customMethods,
        docs,
        schema,
        dry: dry2,
        force: force2
      });
      await tryPatchNuxtConfig(projectRoot2, { servicesDir: servicesDirName }, { dry: dry2 });
      return;
    }
    if (subcmd === "remote-service") {
      const dry2 = Boolean(flags.dry);
      const projectRoot2 = await findProjectRoot(cwd);
      const methods = typeof flags.methods === "string" ? String(flags.methods).split(",").map((s) => s.trim()).filter(Boolean) : void 0;
      const path = typeof flags.path === "string" ? String(flags.path) : nameOrTarget;
      await tryPatchNuxtConfig(projectRoot2, {
        clientMode: "remote",
        remoteService: { path, methods }
      }, { dry: dry2 });
      return;
    }
    const target = flags.target ?? "nitro";
    const dry = Boolean(flags.dry);
    const force = Boolean(flags.force);
    const projectRoot = await findProjectRoot(cwd);
    await generateMiddleware({
      projectRoot,
      name: nameOrTarget,
      target,
      dry,
      force
    });
    if (target === "feathers") {
      await tryPatchNuxtConfig(projectRoot, { ensureServerFeathersPluginsDir: true }, { dry });
    }
  } catch (err) {
    handleCliError(err);
  }
}
export {
  generateCustomService,
  generateService,
  runCli
};
