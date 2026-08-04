import { createFileRoute, redirect } from "@tanstack/react-router";

// A aba "Visão Geral" foi substituída pelo DRE, que agora é a página inicial.
// A rota raiz ("/") apenas redireciona para "/dre".
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/dre" });
  },
});
