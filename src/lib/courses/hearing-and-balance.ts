/**
 * Hearing and balance: the first listening course.
 *
 * Written by hand and checked against the sources on each lesson. It is a course about the
 * inner ear and its neighbours, not about anybody's ears: the later lessons explain how
 * doctors think about ringing in the ears, spinning dizziness and toothache felt in the ear,
 * because those are the questions people come with, but nothing here tells a listener what
 * they have. See DECISIONS.md LC-01.
 *
 * One lesson is scripted. The rest are outline, shown as "not written yet", so the voice and
 * tone can be settled on one lesson before fifteen are written in it.
 */

import type { Course, CourseModule, Lesson } from "./types";

const COURSE_ID = "hearing-and-balance";

type LessonDraft = Omit<Lesson, "module_id" | "order" | "audio_url" | "audio_status" | "duration_sec">;

function outline(id: string, slug: string, title: string, summary: string): LessonDraft {
  return {
    id,
    slug,
    title,
    summary,
    script_text: null,
    pronunciation_guide: [],
    sources: [],
    source_paper_ids: [],
  };
}

const SNAIL_SHELL_SCRIPT = `
Here is a question to start us off. Somebody across a busy room says your name, quite quietly, and you turn round before you have even decided to. In that moment, nothing touched you. Only air moved. So how does a little shiver in the air become your own name? That is what this lesson is about, and the answer runs through one of the most beautiful objects in the body.

There are three parts to the journey. The first is getting the sound into the ear. The second is turning a movement in the air into a movement in liquid. And the third, which is the real star today, is how that liquid movement gets sorted into high notes and low notes. We will go through them one at a time.

Start with what a sound actually is. When someone speaks, their voice pushes on the air in front of them, then pulls back, then pushes again, very fast. Each push squeezes the air a tiny bit, and that squeeze travels outwards, the way a ripple spreads across a pond when you throw a stone in. That is all a sound is. A travelling ripple of squeezed and stretched air. A high sound is a ripple that comes very quickly, hundreds or even thousands of times every second. A low sound is a slower, lazier ripple.

The outer part of your ear, the curled bit you can touch, works like a funnel. It gathers those ripples and sends them along the ear canal, a short tunnel into the side of your head. At the end of the tunnel is the eardrum. The eardrum is a thin, tight skin, rather like the skin of a real drum, and when the ripples arrive it starts to shiver along with them. Fast ripples, fast shivering. Slow ripples, slow shivering.

Now for the second part, and a small puzzle. Deeper inside your head, the part of the ear that actually hears is filled with liquid. And moving liquid is hard work. If you have ever shouted to a friend who was underwater in a swimming pool, you will know that most of the sound just bounces off the surface. Air is thin and water is heavy, so a ripple in air barely moves it at all.

The body's answer is a chain of three tiny bones, sitting just behind the eardrum in a small pocket of air called the middle ear. They have lovely old names. The hammer, the anvil and the stirrup. In Latin, the malleus, the incus and the stapes. The stapes, the stirrup, is the smallest bone in your whole body. It is smaller than a grain of rice.

These three bones work like a lever. The eardrum is quite broad, and the flat end of the stapes, where the chain finishes, is tiny. So all the gentle pushing gathered across the whole eardrum gets focused down onto one very small spot. Think of the difference between someone standing on your foot in trainers and someone standing on your foot in a stiletto heel. Same person, same weight, but all of it pressed into one small point. That is the trick. By the time the push reaches the liquid, it is concentrated enough to move it.

Here is something to notice, if you like. Press the little flap at the front of your ear gently over the opening, and listen to the world go dull and far away. You have not touched the hearing organ at all. You have only blocked the funnel. It is a reminder of how much of hearing is simply getting the ripple delivered to the right place.

So, the third part. Where does the stapes push? It pushes on a small, flexible window into a structure called the cochlea. You say it cock-lee-uh. The cochlea is about the size of a pea, it is coiled round like a snail shell, and it is full of liquid. The name even comes from the old word for a snail. The cochlea. The snail shell. Hold on to that picture, because we are going inside it.

Imagine uncoiling the snail shell and laying it out flat, like unrolling a party blower. Running along its whole length is a thin, springy strip of tissue called the basilar membrane. Basilar just means at the base. The basilar membrane is the thing that matters most today, because it is where the sorting happens.

Here is the clever part. The basilar membrane is not the same all the way along. At the entrance end, near where the stapes pushes, it is narrow and stiff. At the far end, deep in the centre of the coil, it is wider and floppier. Because of that, different parts of it answer to different sounds. When a push comes into the liquid, it sets off a wave that rolls along the membrane, and each wave swells and peaks at one particular place. High sounds peak near the entrance, where the membrane is stiff. Low sounds travel further in, and peak deep in the coil, where it is loose.

So here is the image to keep. The cochlea is a piano keyboard, rolled up inside a snail shell. On a piano, the high notes are at one end and the low notes are at the other. Inside your ear it is the same, except that the keyboard is coiled, the high notes are by the door, and the low notes are in the middle of the spiral. Scientists call this arrangement tonotopy, which simply means the tones are laid out in places. Tonotopy. A map of pitch, written along a strip of tissue.

But a wave on a membrane is still not a sound you hear. Something has to notice where the wave peaked, and tell the brain. That job belongs to hair cells. They are not hairs like the hair on your head. Each hair cell has a tiny tuft on top, a bundle of stiff bristles called stereocilia, lined up from shortest to tallest like a little set of organ pipes. There are thousands of hair cells in each ear, sitting in rows along the basilar membrane, like piano keys waiting to be pressed.

When the membrane beneath them moves, the tufts tip over, only very slightly. The tips of the bristles are joined by the finest of threads, and as a tuft tips, those threads tug open tiny gates in the cell. Charged particles rush in, and the hair cell turns the movement into an electrical signal. That signal passes to the hearing nerve, and the nerve carries it to the brain. Because each hair cell sits at its own place on the keyboard, the brain can tell which notes are playing from which cells are talking.

One more surprise, and then we will stop. Some of the hair cells do not only listen. They move. When they are stirred, they stretch and shrink, and that tiny dance pumps a little extra energy back into the wave. It sharpens the peak, and it makes quiet sounds easier to pick out. This little amplifier is so busy that an ear can give off its own very faint sounds, far too quiet for you to notice. That is not a figure of speech. It can be measured, and it is part of how the NHS checks the hearing of newborn babies. A small, soft earpiece plays gentle clicks, and the test listens for the ear's own quiet answer.

While we are here, one practical thing, said calmly. The NHS says that if you ever notice hearing loss that comes on suddenly, in one ear or both, it is worth asking for an urgent GP appointment or calling NHS one one one. Often it turns out to be nothing serious. It is only that some causes are best looked at quickly.

So, to gather that together. Sound is a ripple in the air. The outer ear funnels it to the eardrum, which shivers. Three tiny bones, the hammer, the anvil and the stirrup, focus that shiver onto the liquid inside the cochlea, the snail shell. Inside the snail, the basilar membrane is laid out like a piano keyboard, high notes by the door and low notes in the middle. And rows of hair cells, with their little tufts of stereocilia, turn each ripple into an electrical signal for the brain.

Next time, we will get much closer to those hair cells. We will look at how delicate the tufts are, why the ear guards them so carefully, and what happens when some of the keys on the keyboard go quiet. Until then, the next time someone says your name across a room, you will know about the snail shell in your head that heard it first.
`;

const snailShell: LessonDraft = {
  id: "hb-1-1",
  slug: "the-snail-shell-that-hears",
  title: "The snail shell that hears",
  summary:
    "How a ripple in the air reaches the inner ear, and how the cochlea sorts it into high notes and low notes.",
  script_text: SNAIL_SHELL_SCRIPT.trim(),
  pronunciation_guide: [
    { term: "cochlea", guide: "COCK-lee-uh", spoken: "cock-lee-uh" },
    { term: "malleus", guide: "MAL-ee-us", spoken: "mal-ee-us" },
    { term: "incus", guide: "ING-kus", spoken: "ing-kus" },
    { term: "stapes", guide: "STAY-peez", spoken: "stay-peez" },
    { term: "basilar", guide: "BAZ-ih-lar", spoken: "baz-ih-lar" },
    { term: "tonotopy", guide: "toe-NOT-oh-pee", spoken: "toe-not-oh-pee" },
    { term: "stereocilia", guide: "STEER-ee-oh-SIL-ee-uh", spoken: "steer-ee-oh-sil-ee-uh" },
  ],
  sources: [
    {
      publisher: "National Institute on Deafness and Other Communication Disorders",
      title: "How do we hear?",
      url: "https://www.nidcd.nih.gov/health/how-do-we-hear",
      supports:
        "The route from ear canal to cochlea, the middle ear bones, the travelling wave on the basilar membrane, high pitches near the wide end, and stereocilia opening channels.",
    },
    {
      publisher: "NHS",
      title: "Newborn hearing screening",
      url: "https://www.nhs.uk/conditions/baby/newborn-screening/hearing-test/",
      supports: "The newborn hearing check, which plays gentle clicks through a small soft earpiece.",
    },
    {
      publisher: "NHS",
      title: "Hearing loss",
      url: "https://www.nhs.uk/conditions/hearing-loss/",
      supports: "Sudden hearing loss in one or both ears: ask for an urgent GP appointment or contact NHS 111.",
    },
  ],
  source_paper_ids: [],
};

interface ModuleDraft {
  title: string;
  summary: string;
  lessons: LessonDraft[];
}

const MODULES: ModuleDraft[] = [
  {
    title: "How a sound gets in",
    summary: "From a ripple in the air to a signal in a nerve.",
    lessons: [
      snailShell,
      outline("hb-1-2", "the-keys-on-the-keyboard", "The keys on the keyboard",
        "A closer look at hair cells: how delicate they are, and what happens when some of them go quiet."),
      outline("hb-1-3", "the-ear-that-makes-sound", "The ear that makes its own sound",
        "The hair cells that move, and how a newborn hearing check listens for them."),
    ],
  },
  {
    title: "From ear to brain",
    summary: "How the brain turns electrical signals into sounds you recognise.",
    lessons: [
      outline("hb-2-1", "the-hearing-nerve", "The hearing nerve and the brainstem",
        "The route a signal takes from the cochlea into the brain, and the relay stations on the way."),
      outline("hb-2-2", "choosing-what-to-hear", "How the brain chooses what to hear",
        "Why you can follow one voice in a noisy café, and what the brain does with everything else."),
      outline("hb-2-3", "a-sound-that-is-not-there", "A sound that is not there",
        "Ringing and buzzing in the ears: what is known about where it comes from, and how doctors think about it."),
    ],
  },
  {
    title: "The balance organ next door",
    summary: "The inner ear's other job: knowing which way is up.",
    lessons: [
      outline("hb-3-1", "three-loops-of-fluid", "Three loops of fluid",
        "The semicircular canals, and how they feel your head turn."),
      outline("hb-3-2", "stones-that-feel-gravity", "The tiny stones that feel gravity",
        "The crystals in the inner ear that tell you when you are tilting or moving in a straight line."),
      outline("hb-3-3", "when-the-inner-ear-is-inflamed", "When the inner ear is inflamed",
        "Labyrinthitis and its neighbours: how doctors think about spinning dizziness, and the signs the NHS says to get checked."),
    ],
  },
  {
    title: "Neighbours of the ear",
    summary: "Why the jaw and the teeth can be felt in the ear.",
    lessons: [
      outline("hb-4-1", "the-joint-in-front-of-your-ear", "The joint in front of your ear",
        "The jaw joint, which sits so close to the ear canal that you can feel it move with a fingertip."),
      outline("hb-4-2", "one-nerve-many-places", "One nerve, many places",
        "The trigeminal nerve, and why the brain sometimes places pain in the wrong spot."),
      outline("hb-4-3", "questions-worth-asking", "Questions worth asking",
        "How to describe what you notice to a GP or a dentist, so the conversation starts in the right place."),
    ],
  },
  {
    title: "Hearing at night",
    summary: "The ears never close. What the brain does about that.",
    lessons: [
      outline("hb-5-1", "ears-that-never-close", "Ears that never close",
        "Why hearing keeps working while you sleep, and why that once kept people alive."),
      outline("hb-5-2", "turning-down-the-world", "Turning down the world",
        "How the sleeping brain decides which sounds are worth waking for."),
      outline("hb-5-3", "sound-in-a-quiet-room", "Sound in a quiet room",
        "Why some sounds seem louder in the dark, and what is known about it."),
    ],
  },
];

function buildModules(): CourseModule[] {
  return MODULES.map((draft, moduleIndex) => {
    const moduleId = `${COURSE_ID}-m${moduleIndex + 1}`;
    return {
      id: moduleId,
      course_id: COURSE_ID,
      order: moduleIndex + 1,
      title: draft.title,
      summary: draft.summary,
      lessons: draft.lessons.map((lesson, lessonIndex) => ({
        ...lesson,
        module_id: moduleId,
        order: lessonIndex + 1,
        audio_url: null,
        audio_status: lesson.script_text ? "not-voiced" : "not-written",
        duration_sec: null,
      })),
    };
  });
}

export const HEARING_AND_BALANCE: Course = {
  id: COURSE_ID,
  slug: "hearing-and-balance",
  title: "Hearing and balance",
  summary:
    "A tour of the inner ear and its neighbours: how you hear, how you keep your balance, and why the jaw and teeth can be felt in the ear.",
  topics: ["hearing", "ringing in the ears", "dizziness and balance", "the jaw and teeth", "sound and sleep"],
  body_systems: ["nervous", "skeletal"],
  structures: [
    { name: "Eardrum and middle ear bones", system: "skeletal", about: "A thin skin and three tiny bones that carry sound inwards.", lesson_ids: ["hb-1-1"] },
    { name: "Cochlea", system: "nervous", about: "The coiled, fluid-filled organ that sorts sound by pitch.", lesson_ids: ["hb-1-1", "hb-1-2", "hb-1-3"] },
    { name: "Hearing nerve and brainstem", system: "nervous", about: "The route from the ear into the brain.", lesson_ids: ["hb-2-1", "hb-2-2", "hb-2-3"] },
    { name: "Balance organs", system: "nervous", about: "Loops and crystals in the inner ear that sense movement.", lesson_ids: ["hb-3-1", "hb-3-2", "hb-3-3"] },
    { name: "Jaw joint", system: "skeletal", about: "The hinge just in front of the ear canal.", lesson_ids: ["hb-4-1", "hb-4-3"] },
    { name: "Trigeminal nerve", system: "nervous", about: "The nerve that carries feeling from the face, jaw and teeth.", lesson_ids: ["hb-4-2", "hb-4-3"] },
    { name: "Sleep and arousal in the brain", system: "nervous", about: "How the sleeping brain listens without waking.", lesson_ids: ["hb-5-1", "hb-5-2", "hb-5-3"] },
  ],
  modules: buildModules(),
  created_at: "2026-09-25",
};
