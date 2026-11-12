import { createContext, useContext } from "react";
import type { Session } from "@/types";

export const EmployeeSessionContext = createContext<{ session: Session; logout: () => void } | null>(null);
export function useEmployeeSession() {
  const c = useContext(EmployeeSessionContext);
  if (!c) throw new Error("Employee session missing");
  return c;
}
