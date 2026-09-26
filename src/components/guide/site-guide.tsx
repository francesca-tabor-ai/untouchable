"use client";

import { MessageCircle, Send, X } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import {
  answerGuide,
  GUIDE_GREETING,
  GUIDE_STARTERS,
  type GuideLink,
  type GuideReplyKind,
} from "@/lib/guide/answer";

interface Message {
  id: number;
  from: "person" | "guide";
  text: string;
  kind?: GuideReplyKind;
  links?: GuideLink[];
}

/**
 * The "Ask us where" panel, fixed to the bottom-right of every public and signed-in page.
 *
 * Every reply comes from `answerGuide`, which is a fixed map of the site and not an AI — see
 * the comment at the top of `src/lib/guide/answer.ts` for why. Nothing typed here is sent,
 * logged or stored: the conversation is React state and is gone when the tab closes. It is
 * not kept in browser storage either, on purpose; phones get shared.
 *
 * It is a non-modal dialog. The page behind it stays usable, Escape closes it and puts focus
 * back on the button that opened it, and new replies are announced through a polite live
 * region so a screen reader hears them without losing its place.
 */
export function SiteGuide() {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [messages, setMessages] = React.useState<Message[]>([
    { id: 0, from: "guide", text: GUIDE_GREETING },
  ]);

  const launcherRef = React.useRef<HTMLButtonElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const logRef = React.useRef<HTMLDivElement>(null);
  const nextId = React.useRef(1);

  const panelId = React.useId();
  const titleId = React.useId();
  const inputId = React.useId();

  const close = React.useCallback(() => {
    setOpen(false);
    launcherRef.current?.focus();
  }, []);

  React.useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  React.useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages, open]);

  function ask(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const reply = answerGuide(trimmed);
    const personId = nextId.current++;
    const guideId = nextId.current++;
    setMessages((previous) => [
      ...previous,
      { id: personId, from: "person", text: trimmed },
      { id: guideId, from: "guide", text: reply.text, kind: reply.kind, links: reply.links },
    ]);
    setDraft("");
  }

  const hasAsked = messages.some((message) => message.from === "person");

  return (
    <>
      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          className="rounded-card border-line shadow-lift fixed inset-x-4 bottom-22 z-50 flex max-h-[min(34rem,calc(100dvh-8rem))] flex-col border bg-white sm:right-6 sm:left-auto sm:w-96"
        >
          <div className="border-line flex items-start justify-between gap-3 border-b px-5 py-4">
            <div>
              <h2 id={titleId} className="font-display text-title">
                Find your way
              </h2>
              <p className="text-legal text-muted mt-1">
                Nothing you type here is saved or sent anywhere.
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              className="rounded-pill text-ink-soft hover:bg-cream-50 -mr-2 flex h-11 w-11 shrink-0 items-center justify-center"
            >
              <X aria-hidden className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </button>
          </div>

          <div
            ref={logRef}
            role="log"
            aria-live="polite"
            aria-label="Conversation"
            className="flex-1 space-y-4 overflow-y-auto px-5 py-4"
          >
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} onNavigate={() => setOpen(false)} />
            ))}

            {!hasAsked ? (
              <ul aria-label="Things you can ask" className="flex flex-wrap gap-2">
                {GUIDE_STARTERS.map((starter) => (
                  <li key={starter}>
                    <button
                      type="button"
                      onClick={() => ask(starter)}
                      className="rounded-pill border-line bg-cream-50 text-small text-forest-700 hover:border-line-strong min-h-11 border px-4 py-2 font-medium"
                    >
                      {starter}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <form
            className="border-line flex items-center gap-2 border-t p-3"
            onSubmit={(event) => {
              event.preventDefault();
              ask(draft);
            }}
          >
            <label htmlFor={inputId} className="sr-only">
              What are you looking for?
            </label>
            <input
              ref={inputRef}
              id={inputId}
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={500}
              autoComplete="off"
              placeholder="What are you looking for?"
              className="rounded-pill border-line-strong text-body text-ink placeholder:text-muted h-11 min-w-0 flex-1 border bg-white px-4"
            />
            <button
              type="submit"
              className="rounded-pill bg-forest-800 hover:bg-forest-900 flex h-11 w-11 shrink-0 items-center justify-center text-white"
            >
              <Send aria-hidden className="h-5 w-5" />
              <span className="sr-only">Send</span>
            </button>
          </form>
        </div>
      ) : null}

      <button
        ref={launcherRef}
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => (open ? close() : setOpen(true))}
        className="rounded-pill bg-forest-800 text-body shadow-lift hover:bg-forest-900 fixed right-4 bottom-4 z-50 flex h-14 items-center gap-2 px-5 font-medium text-white sm:right-6 sm:bottom-6"
      >
        {open ? (
          <X aria-hidden className="h-5 w-5" />
        ) : (
          <MessageCircle aria-hidden className="h-5 w-5" />
        )}
        {open ? "Close" : "Ask us where"}
      </button>
    </>
  );
}

function MessageBubble({ message, onNavigate }: { message: Message; onNavigate: () => void }) {
  if (message.from === "person") {
    return (
      <div className="flex justify-end">
        <p className="rounded-card bg-forest-800 text-small max-w-[85%] px-4 py-2.5 text-white">
          <span className="sr-only">You said: </span>
          {message.text}
        </p>
      </div>
    );
  }

  const crisis = message.kind === "crisis";

  return (
    <div
      className={
        crisis
          ? "rounded-card border-forest-200 bg-forest-50 border px-4 py-3"
          : "rounded-card bg-cream-50 max-w-[90%] px-4 py-3"
      }
    >
      <p className="text-small text-ink">
        <span className="sr-only">UnTouchable said: </span>
        {message.text}
      </p>
      {message.links?.length ? (
        <ul className="mt-2 space-y-1">
          {message.links.map((link) => (
            <li key={link.href}>
              {link.external ? (
                <a
                  href={link.href}
                  {...(link.href.startsWith("http")
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                  className="text-small text-forest-600 hover:text-forest-800 inline-flex min-h-11 items-center font-medium underline underline-offset-4"
                >
                  {link.label}
                  {link.href.startsWith("http") ? (
                    <span className="sr-only"> (opens in a new tab)</span>
                  ) : null}
                </a>
              ) : (
                <Link
                  href={link.href}
                  onClick={onNavigate}
                  className="text-small text-forest-600 hover:text-forest-800 inline-flex min-h-11 items-center font-medium underline underline-offset-4"
                >
                  {link.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
