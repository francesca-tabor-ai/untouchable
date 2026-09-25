import { describe, expect, it } from "vitest";

import { supportTopic, supportTopicsFor } from "@/lib/safety/support-topics";

/**
 * Support has to match what the page is about.
 *
 * It did not. The crisis contacts — NHS 111, 999, Samaritans — went on everything, and the
 * only specialist block fired when a flagged *medicine* was attached to the story. So an
 * addiction story with no medicine showed no FRANK, and a story about childhood sexual
 * abuse would have offered a bereavement line and nothing else. Being given only the wrong
 * number reads as nobody having thought about you.
 */
describe("support matched to the topic", () => {
  it("offers Rape Crisis on a sexual violence page", () => {
    const [topic] = supportTopicsFor([{ supportTopic: "sexual_violence" }]);

    expect(topic.contacts.map((c) => c.contact)).toContain("0808 500 2222");
  });

  it("says plainly that it does not matter how long ago it was", () => {
    // The single most likely reason somebody does not ring about childhood abuse.
    const [topic] = supportTopicsFor([{ supportTopic: "sexual_violence" }]);

    expect(`${topic.intro} ${topic.contacts.map((c) => c.detail).join(" ")}`).toMatch(
      /how long ago|whenever it happened|a long time ago/i,
    );
  });

  it("offers FRANK on an addiction page, with no medicine involved", () => {
    const [topic] = supportTopicsFor([{ supportTopic: "substance" }]);

    expect(topic.contacts.map((c) => c.contact).join(" ")).toContain("0300 123 6600");
  });

  it("offers Macmillan on a cancer page", () => {
    const [topic] = supportTopicsFor([{ supportTopic: "cancer" }]);

    expect(topic.contacts.map((c) => c.contact)).toContain("0808 808 00 00");
  });

  it("offers a cancer reader somewhere to go that is not a phone call", () => {
    // On the day you cannot face ringing anyone, a drop-in with no referral is the one that
    // still works. Both numbers being helplines would have missed that.
    const [topic] = supportTopicsFor([{ supportTopic: "cancer" }]);

    expect(topic.contacts.some((c) => c.external)).toBe(true);
  });

  it("does not put cancer support on a page about something else", () => {
    const topics = supportTopicsFor([{ supportTopic: "substance" }]);

    expect(topics.flatMap((t) => t.contacts).map((c) => c.contact)).not.toContain("0808 808 00 00");
  });

  it("offers Drinkline and AA on an alcohol page", () => {
    const [topic] = supportTopicsFor([{ supportTopic: "alcohol" }]);
    const numbers = topic.contacts.map((c) => c.contact);

    expect(numbers).toContain("0300 123 1110");
    expect(numbers).toContain("0800 917 7650");
  });

  it("warns about stopping suddenly before it offers a single number", () => {
    // These blocks sit under stories about people who got sober. The NHS says stopping
    // suddenly when you are dependent can cause seizures. A page that reads as encouragement
    // to stop tonight, with that left out, is the thing to avoid.
    const [topic] = supportTopicsFor([{ supportTopic: "alcohol" }]);

    expect(topic.intro).toMatch(/suddenly/i);
    expect(topic.intro).toMatch(/dangerous|seizure/i);
  });

  it("offers Beat on an eating disorder page", () => {
    const [topic] = supportTopicsFor([{ supportTopic: "eating_disorder" }]);

    expect(topic.contacts.map((c) => c.contact)).toContain("0808 801 0677");
  });

  it("does not make somebody qualify before it offers them help", () => {
    // Andi Oliver was asked whether she was anorexic, then whether she was bulimic, and on
    // two noes was told there was nothing available and put on a diet. Being turned away for
    // not being ill enough is the reason people stop asking, so the block says the opposite
    // before it gives a number.
    const [topic] = supportTopicsFor([{ supportTopic: "eating_disorder" }]);

    expect(topic.intro).toMatch(/do not have to be underweight|not have to be diagnosed/i);
    expect(topic.intro).toMatch(/ask again/i);
  });

  it("offers the Sickle Cell Society on a sickle cell page", () => {
    const [topic] = supportTopicsFor([{ supportTopic: "sickle_cell" }]);

    expect(topic.contacts.map((c) => c.contact)).toContain("020 8961 7795");
  });

  it("speaks to carriers as well as to people with sickle cell", () => {
    // Sickle cell trait is found by a screening test, often in pregnancy, by someone who was
    // not looking for it and has nobody to ask.
    const [topic] = supportTopicsFor([{ supportTopic: "sickle_cell" }]);

    expect(`${topic.intro} ${topic.contacts.map((c) => c.detail).join(" ")}`).toMatch(
      /carrier|trait/i,
    );
  });

  it("offers the SIA support line after a spinal cord injury", () => {
    const [topic] = supportTopicsFor([{ supportTopic: "spinal_cord_injury" }]);

    expect(topic.contacts.map((c) => c.contact)).toContain("0800 980 0501");
  });

  it("offers a spinal cord injury reader's family somewhere of their own", () => {
    // Ed Jackson's partner went to find help without telling him. The people around an
    // injury get asked how the injured person is and never how they are.
    const [topic] = supportTopicsFor([{ supportTopic: "spinal_cord_injury" }]);

    expect(`${topic.intro} ${topic.contacts.map((c) => c.detail).join(" ")}`).toMatch(
      /famil|partner/i,
    );
  });

  it("offers Changing Faces on a burns page", () => {
    const [topic] = supportTopicsFor([{ supportTopic: "burns" }]);

    expect(topic.contacts.map((c) => c.contact)).toContain("0300 012 0275");
  });

  it("tells a burn survivor it does not matter how long ago it was", () => {
    // Scars tighten for years and people stare for longer. The emergency is the short part.
    const [topic] = supportTopicsFor([{ supportTopic: "burns" }]);

    expect(`${topic.intro} ${topic.contacts.map((c) => c.detail).join(" ")}`).toMatch(
      /how long ago/i,
    );
  });

  it("offers perinatal support after a birth, and does not print a dead helpline", () => {
    // Directories still list a PANDAS phone line that PANDAS itself no longer runs. A number
    // that rings out is worse than no number for somebody who had to work up to dialling it.
    const [topic] = supportTopicsFor([{ supportTopic: "perinatal_mental_health" }]);

    expect(topic.contacts.map((c) => c.href)).toContain(
      "https://pandasfoundation.org.uk/how-we-can-support-you/",
    );
    expect(topic.contacts.every((c) => !c.href.startsWith("tel:"))).toBe(true);
  });

  it("does not imply a struggling parent is a bad one", () => {
    const [topic] = supportTopicsFor([{ supportTopic: "perinatal_mental_health" }]);

    expect(topic.intro).toMatch(/bad parent/i);
  });

  it("offers SOBS and Cruse after a suicide, and says it is not their fault", () => {
    // Guilt is the thing Mind names first for people bereaved by suicide, and the story this
    // block was written for is a grandson going over what he said to her that weekend.
    const [topic] = supportTopicsFor([{ supportTopic: "suicide_bereavement" }]);

    expect(topic.contacts.map((c) => c.contact)).toEqual(["0300 111 5065", "0808 808 1677"]);
    expect(topic.intro).toMatch(/none of it means you are to blame/i);
    expect(topic.intro).toMatch(/how long ago/i);
  });

  it("adds nothing to a condition with no topic", () => {
    expect(supportTopicsFor([{ supportTopic: null }, {}])).toEqual([]);
  });

  it("does not repeat a block when two conditions share a topic", () => {
    const topics = supportTopicsFor([{ supportTopic: "substance" }, { supportTopic: "substance" }]);

    expect(topics).toHaveLength(1);
  });

  it("ignores a topic we have not written yet rather than breaking the page", () => {
    // A condition row can name a topic before the block exists. Losing the extra support is
    // bad; taking down the page that carries the crisis contacts is worse.
    expect(supportTopicsFor([{ supportTopic: "not_written_yet" }])).toEqual([]);
    expect(supportTopic("not_written_yet")).toBeNull();
  });
});
