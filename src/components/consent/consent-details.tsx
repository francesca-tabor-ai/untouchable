/**
 * The explanation shown for one consent purpose. Deliberately the same four questions every
 * time — what we collect, who sees it, what it is for, and what happens if you say no — so
 * that a person can compare five choices without re-reading five different shapes of prose.
 *
 * Shared by the onboarding screen and the settings screen. There is only one wording, and
 * only one layout for it, because a consent that is easier to give than to take back is not
 * really a consent.
 */
export interface ConsentChoiceView {
  purpose: string;
  title: string;
  label: string;
  required: boolean;
  whatWeCollect: string;
  whoSeesIt: string;
  whatItIsFor: string;
  ifYouSayNo: string;
  /** Where this person stands today. Optional purposes are false until someone says yes. */
  granted: boolean;
}

export function ConsentDetails({ choice }: { choice: ConsentChoiceView }) {
  return (
    <dl className="space-y-3 text-small">
      <Detail term="What we collect" detail={choice.whatWeCollect} />
      <Detail term="Who sees it" detail={choice.whoSeesIt} />
      <Detail term="What it is for" detail={choice.whatItIsFor} />
      <Detail
        term={choice.required ? "If you say no" : "If you leave this off"}
        detail={choice.ifYouSayNo}
      />
    </dl>
  );
}

function Detail({ term, detail }: { term: string; detail: string }) {
  return (
    <div>
      <dt className="font-semibold text-ink">{term}</dt>
      <dd className="mt-1 text-ink-soft">{detail}</dd>
    </div>
  );
}
