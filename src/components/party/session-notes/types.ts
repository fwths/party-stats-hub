export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  type: "main" | "side" | "bounty" | "personal";
  createdAt: number;
}

export interface NotionPage {
  id: string;
  title: string;
  url: string;
  createdAt: string;
  object?: string;
  parent?: {
    type: string;
    page_id?: string;
    database_id?: string;
    workspace?: boolean;
  };
}

export const NOTE_KEY = "mob.session-notes.v1";
export const TODO_KEY = "mob.todos.v1";
export const HISTORY_KEY = "mob.notes-history.v1";

export const BADGES = {
  main: { label: "Main Quest", color: "bg-red-500/10 text-red-400 border-red-500/25" },
  side: { label: "Side Quest", color: "bg-sky-500/10 text-sky-400 border-sky-500/25" },
  bounty: { label: "Bounty", color: "bg-amber-500/10 text-amber-400 border-amber-500/25" },
  personal: { label: "Personal", color: "bg-purple-500/10 text-purple-400 border-purple-500/25" },
};
