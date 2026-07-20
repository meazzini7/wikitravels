export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-10">
      {children}
    </main>
  );
}
