import type { BranchTrackerApi } from "../shared/types";

declare module "*.css";

declare global {
  interface Window {
    branchtracker: BranchTrackerApi;
  }
}
