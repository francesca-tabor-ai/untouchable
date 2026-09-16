import { Callout } from "@/components/ui/callout";
import { YELLOW_CARD_URL } from "@/lib/safety/constants";

/**
 * The MHRA Yellow Card scheme — brief 7.8: "After any logged side effect, show a link to the
 * MHRA Yellow Card scheme."
 *
 * Two things this has to say plainly, and does:
 *
 * 1. Recording a side effect here is **not** reporting it to the MHRA. If somebody thinks it
 *    is, they will not report, and the whole point of the signpost is lost.
 * 2. It is theirs to decide. No pressure, no count of how many people reported, no nudge.
 *
 * `SideEffectReport.yellowCardShownAt` is stamped by the same write that creates the report,
 * and the screen that receives a report always renders this. The two are tested together.
 */
export function YellowCardNote() {
  return (
    <Callout tone="care" title="Reporting a side effect to the MHRA">
      <p>
        What you have recorded here stays in your own record. It does not go to anybody else.
      </p>
      <p className="mt-2">
        The MHRA runs the Yellow Card scheme for reporting suspected side effects of medicines
        and medical devices in the UK. Anyone can use it, including patients.
      </p>
      <p className="mt-2">
        <a href={YELLOW_CARD_URL} target="_blank" rel="noopener noreferrer">
          Report it on the MHRA Yellow Card site
        </a>{" "}
        (opens in a new tab).
      </p>
      <p className="mt-2">
        If a side effect is frightening you or getting in the way of your life, your GP, your
        pharmacist or your clinical team are the people to talk to — and they are the people to
        talk to before changing anything you have been prescribed. UnTouchable does not give
        medical advice.
      </p>
    </Callout>
  );
}
