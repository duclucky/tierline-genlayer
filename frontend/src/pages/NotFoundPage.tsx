import { Compass } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";

export function NotFoundPage() {
  return <EmptyState icon={Compass} title="Page not found" description="This Tierline route does not exist or may have moved." action={<Link className="button primary" to="/">Return home</Link>} />;
}

