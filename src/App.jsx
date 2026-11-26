import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";

import Signup from "./pages/signup";
import Login from "./pages/login";
import Todos from "./pages/todos";
import supabase from "./supabase";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check existing login session
    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (!error) {
        setUser(data.session?.user ?? null);
      }

      setLoading(false);
    };

    checkSession();

    // Listen for login and logout changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="screen-message">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Signup Page */}
        <Route
          path="/"
          element={user ? <Navigate to="/todos" replace /> : <Signup />}
        />

        {/* Login Page */}
        <Route
          path="/login"
          element={user ? <Navigate to="/todos" replace /> : <Login />}
        />

        {/* Private Todos Page */}
        <Route
          path="/todos"
          element={
            user ? (
              <Todos key={user.id} user={user} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Invalid URL */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
