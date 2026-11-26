import { useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  LogOut,
  ListTodo,
  CheckCircle2,
  Clock,
  Loader2,
} from "lucide-react";

import supabase from "../supabase";
import "../css/todos.css";

function Todos({ user }) {
  const [input, setInput] = useState("");
  const [todos, setTodos] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [signingOut, setSigningOut] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [error, setError] = useState("");

  // VERIFY SESSION WITH THE SERVER, THEN GET TODOS
  useEffect(() => {
    let active = true;

    const fetchTodos = async () => {
      try {
        const { error: userError } = await supabase.auth.getUser();

        if (userError) {
          // Invalid or deleted account: log out (App then shows Login).
          if (
            userError.name === "AuthSessionMissingError" ||
            userError.status === 401 ||
            userError.status === 403
          ) {
            await supabase.auth.signOut({ scope: "local" });
            return;
          }
          throw userError;
        }

        // Only fetch current user's todos (RLS also enforces this)
        const { data, error } = await supabase
          .from("todos")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        if (active) {
          setTodos(data || []);
          setLoadFailed(false);
          setError("");
        }
      } catch (err) {
        if (active) {
          setLoadFailed(true);
          setError(err.message || "Could not load your tasks.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchTodos();

    return () => {
      active = false;
    };
  }, [user.id, reloadKey]);

  const retryLoad = () => {
    setLoading(true);
    setLoadFailed(false);
    setError("");
    setReloadKey((key) => key + 1);
  };

  // ADD TODO
  const addTodo = async (e) => {
    e.preventDefault();

    if (!input.trim()) {
      setError("Please enter a task");
      return;
    }

    setSaving(true);
    setError("");

    const { data, error } = await supabase
      .from("todos")
      .insert([{ title: input.trim(), user_id: user.id, completed: false }])
      .select()
      .single();

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    setTodos((prev) => [data, ...prev]);
    setInput("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
    setError("");
  };

  // DELETE TODO
  const deleteTodo = async (id) => {
    setError("");
    setBusyId(id);

    // .select().single() reports an error if no row was actually deleted
    const { error } = await supabase
      .from("todos")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    setBusyId(null);

    if (error) {
      setError(error.message);
      return;
    }

    setTodos((prev) => prev.filter((todo) => todo.id !== id));

    if (editingId === id) cancelEdit();
  };

  // START EDIT
  const startEdit = (todo) => {
    setEditingId(todo.id);
    setEditText(todo.title);
    setError("");
  };

  // SHARED UPDATE (used by edit and complete)
  const saveChange = async (id, changes) => {
    setError("");
    setBusyId(id);

    const { data, error } = await supabase
      .from("todos")
      .update(changes)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    setBusyId(null);

    if (error) {
      setError(error.message);
      return false;
    }

    setTodos((prev) => prev.map((todo) => (todo.id === id ? data : todo)));
    return true;
  };

  // UPDATE TODO
  const updateTodo = async (e, id) => {
    e.preventDefault();

    if (!editText.trim()) {
      setError("Task cannot be empty");
      return;
    }

    if (await saveChange(id, { title: editText.trim() })) cancelEdit();
  };

  // COMPLETE TODO
  const toggleTodo = (todo) =>
    saveChange(todo.id, { completed: !todo.completed });

  // SIGN OUT (App shows the Login page when the session ends)
  const handleLogout = async () => {
    setSigningOut(true);
    const { error } = await supabase.auth.signOut();

    if (error) {
      setError(error.message);
      setSigningOut(false);
    }
  };

  const completedCount = todos.filter((todo) => todo.completed).length;

  const pendingCount = todos.filter((todo) => !todo.completed).length;

  return (
    <div className="todos-page">
      <div className="todos-wrapper">
        {/* HEADER */}
        <header className="todos-header">
          <div className="brand">
            <div className="brand-icon">
              <Check size={24} />
            </div>

            <h2>TaskFlow</h2>
          </div>

          <button
            className="signout-btn"
            onClick={handleLogout}
            disabled={signingOut}
          >
            <LogOut size={17} />
            {signingOut ? "Signing out..." : "Sign Out"}
          </button>
        </header>

        {/* WELCOME */}
        <section className="welcome-section">
          <span className="welcome-tag">YOUR PERSONAL WORKSPACE</span>

          <h1>My Todos</h1>

          <p>Welcome back, {user.user_metadata?.full_name || user.email}</p>
        </section>

        {/* STATS */}
        <div className="todo-stats">
          <div className="todo-stat-card">
            <div className="stat-icon purple">
              <ListTodo size={22} />
            </div>
            <div>
              <h3>{todos.length}</h3>
              <p>Total Tasks</p>
            </div>
          </div>

          <div className="todo-stat-card">
            <div className="stat-icon orange">
              <Clock size={22} />
            </div>
            <div>
              <h3>{pendingCount}</h3>
              <p>Pending</p>
            </div>
          </div>

          <div className="todo-stat-card">
            <div className="stat-icon green">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <h3>{completedCount}</h3>
              <p>Completed</p>
            </div>
          </div>
        </div>

        {/* MAIN CARD */}
        <main className="todo-main-card">
          <div className="section-heading">
            <div>
              <h2>Add New Task</h2>
              <p>What would you like to accomplish today?</p>
            </div>
          </div>

          {/* ADD TASK FORM */}
          <form className="todo-input-group" onSubmit={addTodo}>
            <input
              type="text"
              placeholder="Enter your task here..."
              aria-label="New task"
              maxLength={500}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={saving || loading}
            />

            <button type="submit" disabled={saving || loading}>
              {saving ? (
                <Loader2 size={18} className="spin" />
              ) : (
                <Plus size={19} />
              )}

              {saving ? "Adding..." : "Add Task"}
            </button>
          </form>

          {/* ERROR */}
          {error && (
            <p className="todo-error" role="alert">
              {error}
            </p>
          )}

          {/* TODO LIST */}
          <section className="task-list-section">
            <div className="task-list-heading">
              <h2>Your Tasks</h2>

              <span className="task-count">
                {todos.length} {todos.length === 1 ? "Task" : "Tasks"}
              </span>
            </div>

            {loading ? (
              <div className="empty-state">
                <Loader2 size={30} className="spin" />
                <p>Loading your tasks...</p>
              </div>
            ) : loadFailed ? (
              <div className="empty-state">
                <p>Your tasks could not be loaded.</p>
                <button className="retry-btn" onClick={retryLoad}>
                  Try Again
                </button>
              </div>
            ) : todos.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <ListTodo size={35} />
                </div>

                <h3>No tasks yet!</h3>
                <p>Add your first task using the form above.</p>
              </div>
            ) : (
              <div className="task-list">
                {todos.map((todo) => (
                  <div
                    className={`task-item ${todo.completed ? "completed" : ""}`}
                    key={todo.id}
                  >
                    <button
                      className="complete-btn"
                      onClick={() => toggleTodo(todo)}
                      disabled={busyId !== null}
                      title={todo.completed ? "Mark pending" : "Mark complete"}
                      aria-label={
                        todo.completed ? "Mark pending" : "Mark complete"
                      }
                      aria-pressed={todo.completed}
                    >
                      {todo.completed && <Check size={16} />}
                    </button>

                    <div className="task-content">
                      {editingId === todo.id ? (
                        <form
                          className="edit-group"
                          onSubmit={(e) => updateTodo(e, todo.id)}
                        >
                          <input
                            type="text"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onKeyDown={(e) => e.key === "Escape" && cancelEdit()}
                            aria-label="Edit task"
                            maxLength={500}
                            autoFocus
                          />

                          <button
                            type="submit"
                            className="save-edit-btn"
                            disabled={busyId !== null}
                            title="Save"
                            aria-label="Save"
                          >
                            <Check size={17} />
                          </button>

                          <button
                            type="button"
                            className="cancel-edit-btn"
                            onClick={cancelEdit}
                            title="Cancel"
                            aria-label="Cancel"
                          >
                            <X size={17} />
                          </button>
                        </form>
                      ) : (
                        <>
                          <h3 className="task-title">{todo.title}</h3>

                          <span className="task-status">
                            {todo.completed ? "Completed" : "In Progress"}
                          </span>
                        </>
                      )}
                    </div>

                    {editingId !== todo.id && (
                      <div className="task-actions">
                        <button
                          className="edit-btn"
                          onClick={() => startEdit(todo)}
                          disabled={busyId !== null}
                          title="Edit task"
                          aria-label="Edit task"
                        >
                          <Pencil size={17} />
                        </button>

                        <button
                          className="delete-btn"
                          onClick={() => deleteTodo(todo.id)}
                          disabled={busyId !== null}
                          title="Delete task"
                          aria-label="Delete task"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>

        {/* FOOTER */}
        <footer className="todos-footer">
          <p>Made with care using TaskFlow</p>
        </footer>
      </div>
    </div>
  );
}

export default Todos;
