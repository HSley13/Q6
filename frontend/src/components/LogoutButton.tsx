import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";

export function LogoutButton() {
  const navigate = useNavigate();

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  return (
    <button onClick={handleLogout} className="text-sm text-slate-600 underline">
      Sign out
    </button>
  );
}
