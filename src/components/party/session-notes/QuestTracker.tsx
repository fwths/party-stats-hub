import React, { useState, useEffect } from "react";
import { ListTodo, Plus, CheckCircle2, Circle, Trash2 } from "lucide-react";
import { TodoItem, TODO_KEY, BADGES } from "./types";

export default function QuestTracker() {
  const [todos, setTodos] = useState<TodoItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(TODO_KEY);
        return stored ? JSON.parse(stored) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  const [newTodoText, setNewTodoText] = useState("");
  const [newTodoType, setNewTodoType] = useState<TodoItem["type"]>("main");
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");

  // Save todos whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(TODO_KEY, JSON.stringify(todos));
    } catch (e) {
      console.warn("Failed to save todos to localStorage:", e);
    }
  }, [todos]);

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoText.trim()) return;

    const newItem: TodoItem = {
      id: crypto.randomUUID(),
      text: newTodoText.trim(),
      completed: false,
      type: newTodoType,
      createdAt: Date.now(),
    };

    setTodos((prev) => [newItem, ...prev]);
    setNewTodoText("");
  };

  const handleToggleTodo = (id: string) => {
    setTodos((prev) =>
      prev.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item)),
    );
  };

  const handleDeleteTodo = (id: string) => {
    setTodos((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearCompleted = () => {
    if (window.confirm("Remove all completed quests/tasks?")) {
      setTodos((prev) => prev.filter((item) => !item.completed));
    }
  };

  const filteredTodos = todos.filter((t) => {
    if (filter === "active") return !t.completed;
    if (filter === "completed") return t.completed;
    return true;
  });

  const activeCount = todos.filter((t) => !t.completed).length;

  return (
    <div className="xl:col-span-5 flex flex-col border-t xl:border-t-0 xl:border-l border-border/20 pt-5 xl:pt-0 xl:pl-6">
      <div className="flex items-center justify-between border-b border-border/20 pb-2 mb-3 select-none">
        <div className="flex items-center gap-1.5">
          <ListTodo size={14} className="text-gold" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Quests & Tasks
          </span>
        </div>
        <span className="rounded-full bg-gold/10 border border-gold/25 px-1.5 py-0.5 text-[9px] font-bold text-gold font-mono">
          {activeCount} Active
        </span>
      </div>

      {/* Add quest form */}
      <form onSubmit={handleAddTodo} className="space-y-2 mb-4 select-text">
        <div className="relative">
          <input
            type="text"
            value={newTodoText}
            onChange={(e) => setNewTodoText(e.target.value)}
            placeholder="Log a new quest..."
            className="w-full rounded-lg bg-secondary/15 border border-border/40 focus:border-gold/50 focus:ring-1 focus:ring-gold/20 pl-3 pr-8 py-1.5 text-xs text-foreground placeholder-muted-foreground/50 focus:outline-none transition-all duration-300"
          />
          <button
            type="submit"
            disabled={!newTodoText.trim()}
            className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-md bg-gold/15 hover:bg-gold/25 border border-gold/30 text-gold disabled:opacity-40 disabled:hover:bg-gold/15 transition-all duration-200 cursor-pointer"
          >
            <Plus size={14} />
          </button>
        </div>

        <div className="flex items-center gap-1">
          {(Object.keys(BADGES) as Array<TodoItem["type"]>).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setNewTodoType(type)}
              className={`rounded border px-1.5 py-0.5 text-[8px] font-medium transition-all duration-200 cursor-pointer capitalize ${
                newTodoType === type
                  ? "bg-gold/20 border-gold text-gold"
                  : "bg-secondary/20 border-border/30 text-muted-foreground hover:text-foreground"
              }`}
            >
              {BADGES[type].label.split(" ")[0]}
            </button>
          ))}
        </div>
      </form>

      {/* Filter Toolbar */}
      <div className="flex items-center justify-between border-b border-border/20 pb-1.5 mb-2.5 text-[10px] select-none">
        <div className="flex items-center gap-1">
          {(["all", "active", "completed"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilter(mode)}
              className={`px-1.5 py-0.5 capitalize rounded transition-colors duration-200 cursor-pointer font-medium ${
                filter === mode
                  ? "text-gold bg-gold/5 font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
        {todos.some((t) => t.completed) && (
          <button
            onClick={handleClearCompleted}
            className="font-bold uppercase tracking-wider text-rose-400/80 hover:text-rose-400 transition-colors duration-200 cursor-pointer"
          >
            Clear Done
          </button>
        )}
      </div>

      {/* Quest Scrollable List */}
      <div className="flex-1 overflow-y-auto max-h-[260px] space-y-1.5 pr-1 custom-scrollbar">
        {filteredTodos.length === 0 ? (
          <div className="text-center py-6 select-none">
            <p className="text-[10px] text-muted-foreground italic">No quests found.</p>
          </div>
        ) : (
          filteredTodos.map((todo) => {
            const badge = BADGES[todo.type];
            return (
              <div
                key={todo.id}
                className={`group flex items-start justify-between gap-2.5 rounded-lg border p-2.5 transition-all duration-300 ${
                  todo.completed
                    ? "bg-secondary/5 border-border/20 opacity-60"
                    : "bg-secondary/10 border-border/30 hover:border-border/50 hover:bg-secondary/15"
                }`}
              >
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleToggleTodo(todo.id)}
                    className="mt-0.5 text-muted-foreground hover:text-gold transition-colors duration-200 cursor-pointer flex-shrink-0"
                  >
                    {todo.completed ? (
                      <CheckCircle2 size={14} className="text-gold" />
                    ) : (
                      <Circle size={14} />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-xs leading-normal break-words text-foreground select-text ${todo.completed ? "line-through text-muted-foreground" : ""}`}
                    >
                      {todo.text}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 select-none">
                      <span
                        className={`rounded-full border px-1 py-0.2 text-[7px] font-bold tracking-wide uppercase ${badge.color}`}
                      >
                        {badge.label.split(" ")[0]}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteTodo(todo.id)}
                  className="text-muted-foreground hover:text-rose-400 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-200 cursor-pointer flex-shrink-0 p-0.5"
                  title="Delete quest"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
