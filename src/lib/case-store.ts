// Module-level store so the applicant flow and analyst dashboard share one case across routes.
import { useSyncExternalStore } from "react";
import { initialCase, type CaseState } from "./case";

let state: CaseState = initialCase();
const listeners = new Set<() => void>();
const SERVER = initialCase();

export function getCase() {
  return state;
}

export function updateCase(fn: (s: CaseState, now: Date) => CaseState) {
  state = fn(state, new Date());
  listeners.forEach((l) => l());
}

export function resetCase() {
  const id = `CASE-${Math.floor(1000 + Math.random() * 9000)}`;
  updateCase(() => initialCase(id));
}

export function useCase(): CaseState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => SERVER,
  );
}
