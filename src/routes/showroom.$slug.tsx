import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/showroom/$slug")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/s/$slug", params: { slug: params.slug } });
  },
  component: () => null,
});
