import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-xl font-semibold">4G 吃到飽 — SERP Entity Dashboard</h1>
      <LoginForm />
    </main>
  );
}
