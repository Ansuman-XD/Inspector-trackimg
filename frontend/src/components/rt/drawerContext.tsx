import { createContext, useContext } from "react";

export const TaskDrawerContext = createContext<{ open: (id: string) => void; photo: (id: string) => void }>({ open: () => {}, photo: () => {} });
export const useTaskDrawer = () => useContext(TaskDrawerContext);
