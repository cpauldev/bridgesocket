import { mountVanillaDashboard } from "example-ui/vanilla-dashboard";
import { useEffect, useRef } from "react";

export default function App() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      throw new Error("Missing dashboard root");
    }

    const cleanup = mountVanillaDashboard({
      root,
      frameworkId: "react",
    });
    return () => {
      cleanup();
    };
  }, []);

  return <div ref={rootRef} />;
}
