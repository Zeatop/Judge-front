import posthog from "posthog-js";

export function initPostHog() {
  const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
  const host = import.meta.env.VITE_POSTHOG_HOST as string | undefined;

  if (!key || !host) return;

  posthog.init(key, {
    api_host: host,
    capture_pageview: false,
    capture_pageleave: true,
  });
}

export { posthog };
