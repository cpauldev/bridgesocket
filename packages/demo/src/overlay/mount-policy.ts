export function isBrowserRuntime(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

export function isLikelyLocalHost(hostname: string): boolean {
  if (!hostname) return false;
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1"
  ) {
    return true;
  }
  if (hostname.endsWith(".local") || hostname.endsWith(".localhost")) {
    return true;
  }

  const ipv4 = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4) return false;

  const octets = ipv4.slice(1).map((value) => Number(value));
  const [a, b] = octets;
  return (
    a === 10 ||
    a === 127 ||
    (a === 192 && b === 168) ||
    (a === 172 && b >= 16 && b <= 31)
  );
}

function getNodeEnv(): string | undefined {
  return typeof process !== "undefined" ? process.env?.NODE_ENV : undefined;
}

export function shouldAutoBootstrapOverlay(): boolean {
  if (!isBrowserRuntime()) return false;

  const importMeta = import.meta as ImportMeta & {
    env?: { DEV?: boolean; MODE?: string };
  };
  if (importMeta.env?.DEV === true || importMeta.env?.MODE === "development") {
    return true;
  }

  const env = getNodeEnv();
  if (env === "development") return true;

  const configWindow = window as Window & {
    __DEMO_OVERLAY_ENABLED__?: boolean;
  };
  if (configWindow.__DEMO_OVERLAY_ENABLED__ === true) return true;

  return window.location.search.includes("demoOverlay=1");
}

export function isDevLikeEnvironment(): boolean {
  if (!isBrowserRuntime()) return false;

  const env = getNodeEnv();
  if (env === "development" || env === "test") return true;
  if (env && env !== "development" && env !== "test") return false;

  if (isLikelyLocalHost(window.location.hostname)) return true;

  return window.location.search.includes("demoOverlay=1");
}
