import { createFileRoute } from "@tanstack/react-router";
import { DrePage } from "./dre";

export const Route = createFileRoute("/")({ component: Index });

function Index() {
  return <DrePage />;
}
