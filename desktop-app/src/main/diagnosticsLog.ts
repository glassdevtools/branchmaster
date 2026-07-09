import { appendFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

const DIAGNOSTICS_LOG_FILE_NAME = "diagnostics.log";
// TODO: AI-PICKED-VALUE: A 5 MB cap keeps the crash log useful without letting it grow without bound over months.
const DIAGNOSTICS_LOG_MAX_BYTE_COUNT = 5 * 1024 * 1024;

export type DiagnosticsLogger = {
  logDiagnosticsEvent: (event: {
    category: string;
    message: string;
    detail?: { [key: string]: unknown };
  }) => Promise<void>;
  readDiagnosticsLog: () => Promise<string>;
};

// The diagnostics log survives across relaunches so a blank-screen crash leaves a breadcrumb to read afterward.
export const createDiagnosticsLogger = ({
  userDataPath,
}: {
  userDataPath: string;
}): DiagnosticsLogger => {
  const diagnosticsLogPath = join(userDataPath, DIAGNOSTICS_LOG_FILE_NAME);
  // Writes are chained so concurrent events cannot interleave partial lines in the file.
  let writeChain: Promise<void> = Promise.resolve();

  const appendDiagnosticsLine = async (line: string) => {
    try {
      await mkdir(userDataPath, { recursive: true });

      try {
        const logStat = await stat(diagnosticsLogPath);

        // A log past the cap is rewritten to its most recent half so the newest crashes stay readable.
        if (logStat.size > DIAGNOSTICS_LOG_MAX_BYTE_COUNT) {
          const existingLog = await readFile(diagnosticsLogPath, "utf8");
          const trimmedLog = existingLog.slice(
            Math.floor(existingLog.length / 2),
          );

          await writeFile(diagnosticsLogPath, trimmedLog, "utf8");
        }
      } catch {
        // A missing or unreadable log just starts fresh.
      }

      await appendFile(diagnosticsLogPath, line, "utf8");
    } catch (error) {
      console.error("Failed to write diagnostics log.", error);
    }
  };

  const logDiagnosticsEvent: DiagnosticsLogger["logDiagnosticsEvent"] = ({
    category,
    message,
    detail,
  }) => {
    const line = `${new Date().toISOString()} [${category}] ${message}${
      detail === undefined ? "" : ` ${JSON.stringify(detail)}`
    }\n`;

    console.error(`[diagnostics] ${line.trimEnd()}`);
    writeChain = writeChain.then(() => appendDiagnosticsLine(line));

    return writeChain;
  };

  const readDiagnosticsLog = async () => {
    try {
      return await readFile(diagnosticsLogPath, "utf8");
    } catch {
      return "";
    }
  };

  return { logDiagnosticsEvent, readDiagnosticsLog };
};
