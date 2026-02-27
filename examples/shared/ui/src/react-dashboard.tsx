import {
  type DashboardActionState,
  type DashboardControllerState,
  type DashboardFrameworkId,
  type DashboardTableSection,
  createDashboardController,
} from "demo/dashboard";
import { Moon, Play, Plus, RotateCcw, Square, Sun } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Tabs } from "universa-ui/components";

import { isTableSection, resolveRuntimeView } from "./dashboard";
import {
  frameworkIconSvg,
  getFrameworkVisual,
  viteBadgeIconSvg,
} from "./frameworks";
import { Button, Card, CardContent, CardHeader, CardTitle } from "./react";
import { createRuntimeTabItems } from "./runtime-tab-panels";
import { type Theme, applyTheme, getInitialTheme, toggleTheme } from "./theme";

interface ReactDashboardPageProps {
  frameworkId: DashboardFrameworkId;
}

function createTabsContentSignature(input: {
  runtimeSections: DashboardTableSection[];
  runtimeError: string | null;
}): string {
  const sectionShape = input.runtimeSections.map((section) => ({
    id: section.id,
    title: section.title,
    rows: section.rows,
  }));
  return JSON.stringify({
    sections: sectionShape,
    runtimeError: input.runtimeError ?? null,
  });
}

export function ReactDashboardPage({ frameworkId }: ReactDashboardPageProps) {
  const framework = getFrameworkVisual(frameworkId);
  const controller = useMemo(
    () =>
      createDashboardController({
        currentFrameworkId: frameworkId,
      }),
    [frameworkId],
  );
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const tabsHostRef = useRef<HTMLDivElement | null>(null);
  const summaryRef = useRef<HTMLParagraphElement | null>(null);
  const activeSectionIdRef = useRef<string | null>(null);
  const tabsSignatureRef = useRef<string>("");
  const runtimeSummaryRef = useRef<string>("");
  const startButtonRef = useRef<HTMLButtonElement | null>(null);
  const startLabelRef = useRef<HTMLSpanElement | null>(null);
  const stopButtonRef = useRef<HTMLButtonElement | null>(null);
  const stopLabelRef = useRef<HTMLSpanElement | null>(null);
  const restartButtonRef = useRef<HTMLButtonElement | null>(null);
  const restartLabelRef = useRef<HTMLSpanElement | null>(null);

  const syncActionButtons = (actions: DashboardActionState[]) => {
    const startAction = actions.find((action) => action.id === "start") ?? null;
    const stopAction = actions.find((action) => action.id === "stop") ?? null;
    const restartAction =
      actions.find((action) => action.id === "restart") ?? null;

    const setButtonVisibility = (
      button: HTMLButtonElement,
      visible: boolean,
    ) => {
      button.style.display = visible ? "" : "none";
      button.setAttribute("aria-hidden", visible ? "false" : "true");
    };

    if (startButtonRef.current && startLabelRef.current) {
      if (startAction) {
        const actionLabel = startAction.loading
          ? startAction.loadingLabel
          : startAction.label;
        startLabelRef.current.textContent = actionLabel;
        startButtonRef.current.disabled = startAction.disabled;
        setButtonVisibility(startButtonRef.current, true);
        startButtonRef.current.setAttribute("aria-label", actionLabel);
        startButtonRef.current.setAttribute("title", actionLabel);
      } else {
        startLabelRef.current.textContent = "Start";
        startButtonRef.current.disabled = true;
        setButtonVisibility(startButtonRef.current, true);
        startButtonRef.current.setAttribute("aria-label", "Start");
        startButtonRef.current.setAttribute("title", "Start");
      }
    }

    if (stopButtonRef.current && stopLabelRef.current) {
      if (stopAction) {
        const actionLabel = stopAction.loading
          ? stopAction.loadingLabel
          : stopAction.label;
        stopLabelRef.current.textContent = actionLabel;
        stopButtonRef.current.disabled = stopAction.disabled;
        setButtonVisibility(stopButtonRef.current, true);
        stopButtonRef.current.setAttribute("aria-label", actionLabel);
        stopButtonRef.current.setAttribute("title", actionLabel);
      } else {
        stopLabelRef.current.textContent = "Stop";
        stopButtonRef.current.disabled = true;
        setButtonVisibility(stopButtonRef.current, true);
        stopButtonRef.current.setAttribute("aria-label", "Stop");
        stopButtonRef.current.setAttribute("title", "Stop");
      }
    }

    if (restartButtonRef.current && restartLabelRef.current) {
      if (restartAction) {
        const actionLabel = restartAction.loading
          ? restartAction.loadingLabel
          : restartAction.label;
        restartLabelRef.current.textContent = actionLabel;
        restartButtonRef.current.disabled = restartAction.disabled;
        setButtonVisibility(restartButtonRef.current, true);
        restartButtonRef.current.setAttribute("aria-label", actionLabel);
        restartButtonRef.current.setAttribute("title", actionLabel);
      } else {
        restartLabelRef.current.textContent = "Restart";
        restartButtonRef.current.disabled = true;
        setButtonVisibility(restartButtonRef.current, true);
        restartButtonRef.current.setAttribute("aria-label", "Restart");
        restartButtonRef.current.setAttribute("title", "Restart");
      }
    }
  };

  useEffect(() => {
    const initialTheme = getInitialTheme();
    setTheme(initialTheme);
    applyTheme(initialTheme);

    const tabsHost = tabsHostRef.current;
    if (!tabsHost) {
      throw new Error("Missing runtime tabs host");
    }

    const tabs = new Tabs({
      className: "dp-runtime-tabs",
      listClassName: "dp-runtime-tabs-list",
      orientation: "horizontal",
      variant: "default",
      items: [],
      onChange: (value) => {
        activeSectionIdRef.current = value;
      },
    });
    tabsHost.replaceChildren(tabs.getElement());

    const syncRuntime = (state: DashboardControllerState) => {
      const runtimeView = resolveRuntimeView(state);
      if (summaryRef.current) {
        if (runtimeSummaryRef.current !== runtimeView.summary) {
          runtimeSummaryRef.current = runtimeView.summary;
          summaryRef.current.textContent = runtimeView.summary;
        }
      }

      const controlsSection = runtimeView.sections.find(
        (section) => section.id === "controls",
      );
      const controls =
        controlsSection && controlsSection.id === "controls"
          ? controlsSection.actions
          : [];
      syncActionButtons(controls);

      const runtimeSections = runtimeView.sections.filter(isTableSection);
      const runtimeError = state.live.errorMessage;
      const nextTabsSignature = createTabsContentSignature({
        runtimeSections,
        runtimeError,
      });
      if (tabsSignatureRef.current !== nextTabsSignature) {
        tabsSignatureRef.current = nextTabsSignature;
        const nextItems = createRuntimeTabItems(runtimeSections, runtimeError);
        tabs.setItems(nextItems);
      }

      const selectedSection =
        activeSectionIdRef.current &&
        runtimeSections.some(
          (section) => section.id === activeSectionIdRef.current,
        )
          ? activeSectionIdRef.current
          : (runtimeSections[0]?.id ?? null);

      if (selectedSection && tabs.getValue() !== selectedSection) {
        tabs.setValue(selectedSection);
      }
      activeSectionIdRef.current = tabs.getValue();
    };

    const unsubscribe = controller.subscribe(syncRuntime);
    controller.start();

    return () => {
      tabs.destroy();
      unsubscribe();
      controller.stop();
    };
  }, [controller]);

  const handleThemeToggle = () => {
    const next = toggleTheme(theme);
    setTheme(next);
    applyTheme(next);
  };

  return (
    <div
      className="dp-page universa-ui-root universa-ui-surface"
      data-theme={theme}
    >
      <div className="dp-container">
        <header className="dp-header">
          <div className="dp-header-left">
            <h1 className="dp-title">Demo</h1>
            <div className="dp-pill-row">
              <div
                className="dp-pill"
                style={{
                  backgroundColor: framework.pillBg,
                  color: framework.pillFg,
                }}
              >
                <span
                  className="dp-pill-icon"
                  aria-hidden="true"
                  dangerouslySetInnerHTML={{
                    __html: frameworkIconSvg(frameworkId),
                  }}
                />
                <span>{framework.pillLabel}</span>
              </div>
              {framework.usesVite ? (
                <div className="dp-vite-tag" aria-label="Powered by Vite">
                  <Plus
                    className="dp-vite-tag-plus-icon"
                    size={14}
                    aria-hidden="true"
                  />
                  <span
                    className="dp-vite-tag-icon"
                    aria-hidden="true"
                    dangerouslySetInnerHTML={{ __html: viteBadgeIconSvg() }}
                  />
                  <span>Vite</span>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <div className="dp-top-controls">
          <Button
            className="dp-action-btn"
            ref={startButtonRef}
            onClick={() => void controller.runAction("start")}
            aria-label="Start"
            title="Start"
          >
            <Play size={14} aria-hidden="true" />
            <span ref={startLabelRef}>Start</span>
          </Button>
          <Button
            className="dp-action-btn"
            ref={stopButtonRef}
            onClick={() => void controller.runAction("stop")}
            aria-label="Stop"
            title="Stop"
          >
            <Square size={14} aria-hidden="true" />
            <span ref={stopLabelRef}>Stop</span>
          </Button>
          <Button
            className="dp-action-btn"
            ref={restartButtonRef}
            onClick={() => void controller.runAction("restart")}
            aria-label="Restart"
            title="Restart"
          >
            <RotateCcw size={14} aria-hidden="true" />
            <span ref={restartLabelRef}>Restart</span>
          </Button>
        </div>

        <div className="dp-dashboard-grid">
          <div className="dp-column">
            <Card className="dp-dashboard-card" radius="2xl" shadow="none">
              <CardHeader
                description=""
                descriptionClassName="dp-runtime-summary"
                descriptionRef={summaryRef}
              >
                <div className="dp-card-header-row">
                  <CardTitle>Runtime</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div ref={tabsHostRef} />
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="dp-bottom-controls">
          <Button
            className="dp-theme-toggle"
            size="icon"
            onClick={handleThemeToggle}
            aria-label="Toggle theme"
            title="Toggle theme"
          >
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          </Button>
        </div>
      </div>
    </div>
  );
}
