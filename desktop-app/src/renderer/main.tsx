import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { ErrorBoundary } from "./ErrorBoundary";
import "./styles.css";

const rootElement = document.getElementById("root");

if (rootElement === null) {
  throw new Error("Missing root element.");
}

// Uncaught errors and rejections outside React still get logged so nothing that blanks the app goes unrecorded.
const logRendererError = ({
  message,
  source,
  stack,
}: {
  message: string;
  source: string;
  stack: string | null;
}) => {
  if (window.branchmaster === undefined) {
    return;
  }

  void window.branchmaster
    .logRendererError({ message, source, stack })
    .catch(() => {});
};

window.addEventListener("error", (event) => {
  logRendererError({
    message: event.message,
    source: "window.error",
    stack: event.error instanceof Error ? (event.error.stack ?? null) : null,
  });
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;

  logRendererError({
    message: reason instanceof Error ? reason.message : String(reason),
    source: "window.unhandledrejection",
    stack: reason instanceof Error ? (reason.stack ?? null) : null,
  });
});

createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
