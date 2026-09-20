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
