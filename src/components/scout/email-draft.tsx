"use client";

import * as React from "react";

import { draft } from "@/app/(account)/research/actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { CheckboxRow } from "@/components/ui/checkbox";
import { EMAIL_NOTICE } from "@/lib/scout/copy";
import { templateDraft, type EmailDraft } from "@/lib/scout/email-template";
import type { Author, Paper } from "@/lib/scout/types";

/**
 * Drafting an email to a researcher. There is no send button, on purpose: the person copies
 * the text, or opens it in their own email program, and sends it themselves. See
 * `src/lib/scout/email-draft.ts`.
 *
 * The form is not saved anywhere. What they write about themselves is gone when the panel
 * closes.
 */
export function EmailDraftPanel({
  author,
  paper,
  claudeOn,
  onClose,
}: {
  author: Author;
  paper: Paper;
  claudeOn: boolean;
  onClose: () => void;
}) {
  const [aboutMe, setAboutMe] = React.useState("");
  const [questionOne, setQuestionOne] = React.useState("");
  const [questionTwo, setQuestionTwo] = React.useState("");
  const [willing, setWilling] = React.useState(true);
  const [location, setLocation] = React.useState("London");
  const [signOff, setSignOff] = React.useState("");
  const [result, setResult] = React.useState<EmailDraft | null>(null);
  const [body, setBody] = React.useState("");
  const [copied, setCopied] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const headingRef = React.useRef<HTMLHeadingElement>(null);

  React.useEffect(() => headingRef.current?.focus(), []);

  const input = () => ({
    researcherName: author.name,
    paperTitle: paper.title,
    paperYear: paper.published_date?.slice(0, 4) ?? null,
    paperJournal: paper.journal,
    paperDoi: paper.doi,
    aboutMe,
    questions: [questionOne, questionTwo].map((question) => question.trim()).filter(Boolean),
    willingToTakePart: willing,
    signOff,
    location,
  });

  const show = (next: EmailDraft) => {
    setResult(next);
    setBody(next.body);
    setCopied(false);
  };

  const fromTemplate = () => show(templateDraft(input()));

  const withClaude = () => {
    startTransition(async () => {
      try {
        show(await draft(input()));
      } catch {
        fromTemplate();
      }
    });
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`Subject: ${result?.subject ?? ""}\n\n${body}`);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const mailto =
    author.public_email && result
      ? `mailto:${author.public_email}?subject=${encodeURIComponent(result.subject)}&body=${encodeURIComponent(body)}`
      : null;

  return (
    <section aria-labelledby={`email-${author.id}`} className="mt-6 rounded-card border border-forest-200 bg-white p-5">
      <h4 id={`email-${author.id}`} ref={headingRef} tabIndex={-1} className="text-title focus-visible:outline-none">
        An email to {author.name}
      </h4>
      <p className="mt-2 text-small text-muted">{EMAIL_NOTICE}</p>

      <div className="mt-5 space-y-5">
        <Field label="About you" hint="What you live with and why this paper caught your eye. Only what you are happy for a stranger to read.">
          {(props) => <Textarea {...props} value={aboutMe} maxLength={1200} onChange={(event) => setAboutMe(event.target.value)} />}
        </Field>
        <Field label="Your first question">
          {(props) => <Input {...props} value={questionOne} maxLength={500} onChange={(event) => setQuestionOne(event.target.value)} />}
        </Field>
        <Field label="A second question">
          {(props) => <Input {...props} value={questionTwo} maxLength={500} onChange={(event) => setQuestionTwo(event.target.value)} />}
        </Field>
        <CheckboxRow
          name="willing"
          label="Say I would be willing to take part in research"
          checked={willing}
          onCheckedChange={setWilling}
        />
        {willing ? (
          <Field label="Where you live" hint="A city or region is enough.">
            {(props) => <Input {...props} value={location} maxLength={100} onChange={(event) => setLocation(event.target.value)} />}
          </Field>
        ) : null}
        <Field label="Sign off as">
          {(props) => <Input {...props} value={signOff} maxLength={100} onChange={(event) => setSignOff(event.target.value)} />}
        </Field>

        <div className="flex flex-wrap gap-3">
          <Button type="button" size="sm" onClick={fromTemplate}>
            Make a draft
          </Button>
          {claudeOn ? (
            <Button type="button" variant="secondary" size="sm" onClick={withClaude} disabled={pending}>
              {pending ? "Writing…" : "Ask Claude to help with the wording"}
            </Button>
          ) : null}
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {result ? (
        <div className="mt-6 space-y-4 border-t border-line pt-5" aria-live="polite">
          <p className="text-small text-muted">
            {result.written_by === "claude" ? "Worded by Claude from what you wrote. Read it carefully before you send it." : "Made from what you wrote."}{" "}
            Change anything you like.
          </p>
          <p className="text-small">
            <span className="font-semibold text-ink">Subject:</span> <span className="text-ink-soft">{result.subject}</span>
          </p>
          <Field label="Your email">
            {(props) => <Textarea {...props} value={body} onChange={(event) => setBody(event.target.value)} className="min-h-72" />}
          </Field>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="secondary" size="sm" onClick={copy}>
              {copied ? "Copied" : "Copy the email"}
            </Button>
            {mailto ? (
              <Button asChild variant="secondary" size="sm">
                <a href={mailto}>Open in my email program</a>
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
