import type { Regulator } from "../src/generated/prisma";

/**
 * Real UK charities, one or more for every condition on the site.
 *
 * **Every one of these is imported unverified.** The registered numbers were checked on
 * 2026-09-26 against the findthatcharity.uk mirror of the Charity Commission and OSCR
 * registers, and against each charity's own website — but that is not an editor checking the
 * official register, and only an editor may record that (D-005, rule 4). Until one does, from
 * the charity admin, none of these appears on any public page.
 *
 * Where the name on the register differs from the name the public knows, the public name is
 * used and the registered one is noted beside it, so the editor is not surprised.
 *
 * Descriptions are in our own words. They say what the charity does, never how good it is,
 * and never that a charity specialises in a condition when it covers many.
 */
export interface ConditionCharity {
  name: string;
  slug: string;
  registeredNumber: string;
  regulator: Regulator;
  websiteUrl: string;
  donationUrl: string;
  description: string;
  conditions: string[];
}

export const CONDITION_CHARITIES: ConditionCharity[] = [
  {
    name: "Changing Faces",
    slug: "changing-faces",
    registeredNumber: "1011222",
    regulator: "CCEW",
    websiteUrl: "https://www.changingfaces.org.uk",
    donationUrl: "https://www.changingfaces.org.uk/donate/",
    description:
      "Supports people of any age who have a scar, mark or condition that changes how they look. It offers someone to talk to, practical advice, and campaigns against the way people with a visible difference are treated.",
    conditions: ["acid-and-chemical-burns"],
  },
  {
    name: "Katie Piper Foundation",
    slug: "katie-piper-foundation",
    registeredNumber: "1133313",
    regulator: "CCEW",
    websiteUrl: "https://katiepiperfoundation.org.uk",
    donationUrl: "https://link.justgiving.com/v1/charity/donate/charityId/187739?start",
    description:
      "Runs rehabilitation for adults who have survived burns or live with severe scarring. It looks after both the body and the mind in the months and years after the injury.",
    conditions: ["acid-and-chemical-burns"],
  },
  {
    name: "ADHD Foundation",
    slug: "adhd-foundation",
    registeredNumber: "1120898",
    regulator: "CCEW",
    websiteUrl: "https://www.adhdfoundation.org.uk",
    donationUrl: "https://www.adhdfoundation.org.uk/donate",
    description:
      "A neurodiversity charity based in Liverpool. It gives information and support to adults, young people and families living with ADHD, and trains teachers and health workers.",
    conditions: ["adhd"],
  },
  {
    name: "ADHD UK",
    slug: "adhd-uk",
    registeredNumber: "1188365",
    regulator: "CCEW",
    websiteUrl: "https://adhduk.co.uk",
    donationUrl: "https://adhduk.co.uk/donate-to-adhd-uk/",
    description:
      "A national charity set up in 2020 by people with ADHD. It gives information and support to people with ADHD and those close to them, campaigns for better access to assessment, and funds research.",
    conditions: ["adhd"],
  },
  {
    // Registered as Alcohol Research UK.
    name: "Alcohol Change UK",
    slug: "alcohol-change-uk",
    registeredNumber: "1140287",
    regulator: "CCEW",
    websiteUrl: "https://alcoholchange.org.uk",
    donationUrl: "https://alcoholchange.org.uk/get-involved/donate",
    description:
      "Works to reduce the harm alcohol does in the UK. It funds research, pushes for better treatment and policy, and has information for anyone worried about their own drinking or someone else's.",
    conditions: ["alcohol-use-disorder"],
  },
  {
    // Registered as Adfam National.
    name: "Adfam",
    slug: "adfam",
    registeredNumber: "1067428",
    regulator: "CCEW",
    websiteUrl: "https://adfam.org.uk",
    donationUrl: "https://cafdonate.cafonline.org/393",
    description:
      "Supports the families of people who use drugs or alcohol, or who gamble. It is for the people around the person — parents, partners, children — who often have nowhere else to turn.",
    conditions: ["alcohol-use-disorder", "drug-addiction"],
  },
  {
    name: "Survivors of Bereavement by Suicide",
    slug: "survivors-of-bereavement-by-suicide",
    registeredNumber: "1098815",
    regulator: "CCEW",
    websiteUrl: "https://uksobs.com",
    donationUrl: "https://www.justgiving.com/sobs",
    description:
      "Runs support groups, a helpline and an online forum for adults who have lost someone to suicide. The groups are run by volunteers who have been bereaved in the same way.",
    conditions: ["bereavement-by-suicide"],
  },
  {
    name: "Samaritans",
    slug: "samaritans",
    registeredNumber: "219432",
    regulator: "CCEW",
    websiteUrl: "https://www.samaritans.org",
    donationUrl: "https://www.samaritans.org/donate-now/",
    description:
      "Listens to anyone who is struggling, at any time of day or night, by phone, email or in person. You do not have to be thinking about suicide to call them.",
    conditions: ["bereavement-by-suicide"],
  },
  {
    name: "Beat",
    slug: "beat",
    registeredNumber: "801343",
    regulator: "CCEW",
    websiteUrl: "https://www.beateatingdisorders.org.uk",
    donationUrl: "https://www.beateatingdisorders.org.uk/support-our-work/donate-to-beat/ways-to-give/",
    description:
      "The UK's eating disorder charity. It runs helplines and online support groups for people with any eating disorder and for the people who care about them, and campaigns for better care.",
    conditions: ["binge-eating-disorder", "bulimia"],
  },
  {
    name: "Brain & Spine Foundation",
    slug: "brain-and-spine-foundation",
    registeredNumber: "1098528",
    regulator: "CCEW",
    websiteUrl: "https://www.brainandspine.org.uk",
    donationUrl: "https://www.brainandspine.org.uk/get-involved/donate/",
    description:
      "Runs a helpline staffed by nurses who specialise in the brain and nervous system, and publishes plain-English booklets. It covers a wide range of neurological conditions, including rare ones.",
    conditions: ["brain-aneurysm", "colloid-cyst", "stiff-person-syndrome"],
  },
  {
    name: "Headway",
    slug: "headway",
    registeredNumber: "1025852",
    regulator: "CCEW",
    websiteUrl: "https://www.headway.org.uk",
    donationUrl: "https://www.headway.org.uk/donate/",
    description:
      "Supports people living with a brain injury, and their families and carers. It has a helpline, information, and local groups across the UK. Brain injury here includes injury from illness, not only accidents.",
    conditions: ["brain-aneurysm", "encephalitis"],
  },
  {
    name: "The Brain Tumour Charity",
    slug: "the-brain-tumour-charity",
    registeredNumber: "1150054",
    regulator: "CCEW",
    websiteUrl: "https://www.thebraintumourcharity.org",
    donationUrl: "https://www.thebraintumourcharity.org/donate/",
    description:
      "Funds research into brain tumours and runs support and information services for people with a brain tumour and their families.",
    conditions: ["brain-tumour"],
  },
  {
    name: "Brain Tumour Research",
    slug: "brain-tumour-research",
    registeredNumber: "1153487",
    regulator: "CCEW",
    websiteUrl: "https://braintumourresearch.org",
    donationUrl: "https://donate.braintumourresearch.org/page/donate-now",
    description:
      "Funds long-term research at dedicated brain tumour research centres in the UK, and campaigns for more national funding for that research.",
    conditions: ["brain-tumour"],
  },
  {
    name: "Breast Cancer Now",
    slug: "breast-cancer-now",
    registeredNumber: "1160558",
    regulator: "CCEW",
    websiteUrl: "https://breastcancernow.org",
    donationUrl: "https://breastcancernow.org/get-involved/donate",
    description:
      "Funds breast cancer research and runs a helpline with specialist nurses. It also has information for people who carry a gene change that raises their risk.",
    conditions: ["breast-cancer", "brca1-gene-change"],
  },
  {
    name: "Target Ovarian Cancer",
    slug: "target-ovarian-cancer",
    registeredNumber: "1125038",
    regulator: "CCEW",
    websiteUrl: "https://targetovariancancer.org.uk",
    donationUrl: "https://www.targetovariancancer.org.uk/get-involved/make-a-donation",
    description:
      "Works for earlier diagnosis of ovarian cancer, funds research, and supports people affected by it, including people who have learned they carry a BRCA gene change.",
    conditions: ["brca1-gene-change"],
  },
  {
    name: "Macmillan Cancer Support",
    slug: "macmillan-cancer-support",
    registeredNumber: "261017",
    regulator: "CCEW",
    websiteUrl: "https://www.macmillan.org.uk",
    donationUrl: "https://www.macmillan.org.uk/donate",
    description:
      "Gives practical, emotional and money support to people with any kind of cancer, and to the people close to them. It has a support line, information, and nurses and advisers across the UK.",
    conditions: ["breast-cancer", "brain-tumour", "hodgkin-lymphoma", "laryngeal-cancer"],
  },
  {
    // Registered as The National Association for Mental Health.
    name: "Mind",
    slug: "mind",
    registeredNumber: "219830",
    regulator: "CCEW",
    websiteUrl: "https://www.mind.org.uk",
    donationUrl: "https://www.mind.org.uk/donate/",
    description:
      "A mental health charity for England and Wales. It has information and an advice line, local Minds that run services in their own areas, and campaigns for better mental health care.",
    conditions: ["depression", "ptsd", "postnatal-depression"],
  },
  {
    name: "Rethink Mental Illness",
    slug: "rethink-mental-illness",
    registeredNumber: "271028",
    regulator: "CCEW",
    websiteUrl: "https://www.rethink.org",
    donationUrl:
      "https://www.rethink.org/get-involved/ways-to-give/ways-to-donate/make-a-donation-today/",
    description:
      "Gives advice, information and support to people living with mental illness and to those who care for them, and campaigns for change.",
    conditions: ["depression"],
  },
  {
    // Registered as Release Legal Emergency and Drugs Service Ltd.
    name: "Release",
    slug: "release",
    registeredNumber: "801118",
    regulator: "CCEW",
    websiteUrl: "https://www.release.org.uk",
    donationUrl: "https://www.release.org.uk/donate",
    description:
      "Runs a free, confidential helpline on drugs and the law, for people who use drugs and the people around them. It also works on drug policy.",
    conditions: ["drug-addiction"],
  },
  {
    // Formerly the Encephalitis Society.
    name: "Encephalitis International",
    slug: "encephalitis-international",
    registeredNumber: "1087843",
    regulator: "CCEW",
    websiteUrl: "https://www.encephalitis.info",
    donationUrl: "https://www.encephalitis.info/donate/",
    description:
      "Supports people affected by encephalitis and their families, and publishes information about it. It also works to make the condition better known among the public and health workers.",
    conditions: ["encephalitis"],
  },
  {
    name: "Endometriosis UK",
    slug: "endometriosis-uk",
    registeredNumber: "1035810",
    regulator: "CCEW",
    websiteUrl: "https://www.endometriosis-uk.org",
    donationUrl: "https://www.endometriosis-uk.org/donate",
    description:
      "Runs a helpline, support groups and online information for people with endometriosis, and campaigns for faster diagnosis.",
    conditions: ["endometriosis"],
  },
  {
    name: "Fibromyalgia Action UK",
    slug: "fibromyalgia-action-uk",
    registeredNumber: "1042582",
    regulator: "CCEW",
    websiteUrl: "https://www.fmauk.org",
    donationUrl: "https://www.fmauk.org/donate",
    description:
      "Gives information and support to people living with fibromyalgia, and works to make the condition better understood by doctors and the public.",
    conditions: ["fibromyalgia"],
  },
  {
    name: "Dementia UK",
    slug: "dementia-uk",
    registeredNumber: "1039404",
    regulator: "CCEW",
    websiteUrl: "https://www.dementiauk.org",
    donationUrl: "https://www.dementiauk.org/donate/",
    description:
      "Provides specialist dementia nurses, called Admiral Nurses, who support whole families living with any kind of dementia. It also runs a free helpline.",
    conditions: ["frontotemporal-dementia"],
  },
  {
    name: "Alzheimer's Society",
    slug: "alzheimers-society",
    registeredNumber: "296645",
    regulator: "CCEW",
    websiteUrl: "https://www.alzheimers.org.uk",
    donationUrl: "https://www.alzheimers.org.uk/get-involved/donate",
    description:
      "Supports people affected by any form of dementia in England, Wales and Northern Ireland, not only Alzheimer's disease. It runs a support line and local services, and funds research.",
    conditions: ["frontotemporal-dementia"],
  },
  {
    name: "Terrence Higgins Trust",
    slug: "terrence-higgins-trust",
    registeredNumber: "288527",
    regulator: "CCEW",
    websiteUrl: "https://tht.org.uk",
    donationUrl: "https://tht.org.uk/support-us/how-donate",
    description:
      "An HIV and sexual health charity. It supports people living with HIV, offers testing and advice, and campaigns against the stigma that still comes with it.",
    conditions: ["hiv"],
  },
  {
    name: "National AIDS Trust",
    slug: "national-aids-trust",
    registeredNumber: "297977",
    regulator: "CCEW",
    websiteUrl: "https://nat.org.uk",
    donationUrl: "https://nat.org.uk/donate/",
    description:
      "Works on the rights of people living with HIV. It challenges discrimination and pushes for better prevention and fair access to care.",
    conditions: ["hiv"],
  },
  {
    name: "Lymphoma Action",
    slug: "lymphoma-action",
    registeredNumber: "1068395",
    regulator: "CCEW",
    websiteUrl: "https://lymphoma-action.org.uk",
    donationUrl: "https://lymphoma-action.org.uk/donate",
    description:
      "Gives information and support to anyone affected by lymphoma, including Hodgkin lymphoma, through a helpline, support groups and plain-English guides.",
    conditions: ["hodgkin-lymphoma"],
  },
  {
    // Registered as Blood Cancer UK Research.
    name: "Blood Cancer UK",
    slug: "blood-cancer-uk",
    registeredNumber: "216032",
    regulator: "CCEW",
    websiteUrl: "https://bloodcancer.org.uk",
    donationUrl: "https://donate.bloodcancer.org.uk/",
    description:
      "Funds research into all blood cancers, lymphoma among them, and gives support and information to people living with one.",
    conditions: ["hodgkin-lymphoma"],
  },
  {
    // Registered as The British Kidney Patient Association.
    name: "Kidney Care UK",
    slug: "kidney-care-uk",
    registeredNumber: "270288",
    regulator: "CCEW",
    websiteUrl: "https://kidneycareuk.org",
    donationUrl: "https://kidneycareuk.org/get-involved/make-a-donation/",
    description:
      "Gives practical, emotional and money support to people with kidney disease, including people waiting for or living with a transplant. It also gives grants to hospital kidney units.",
    conditions: ["kidney-transplant"],
  },
  {
    name: "Kidney Research UK",
    slug: "kidney-research-uk",
    registeredNumber: "252892",
    regulator: "CCEW",
    websiteUrl: "https://www.kidneyresearchuk.org",
    donationUrl: "https://www.kidneyresearchuk.org/support/donate/",
    description:
      "Funds research into kidney disease, including transplantation, and works to make people more aware of kidney health.",
    conditions: ["kidney-transplant"],
  },
  {
    name: "The Swallows Head & Neck Cancer Support Group",
    slug: "the-swallows",
    registeredNumber: "1149794",
    regulator: "CCEW",
    websiteUrl: "https://theswallows.org.uk",
    donationUrl: "https://theswallows.org.uk/about-us/fundraising/",
    description:
      "Run by people who have had head and neck cancer themselves. It offers support by phone at any hour, groups that meet in person, and an online meeting each month.",
    conditions: ["laryngeal-cancer"],
  },
  {
    name: "LUPUS UK",
    slug: "lupus-uk",
    // Re-registered as a CIO. The old number, 1051610, is no longer active.
    registeredNumber: "1200671",
    regulator: "CCEW",
    websiteUrl: "https://lupusuk.org.uk",
    donationUrl: "https://lupusuk.org.uk/donating-to-lupus-uk/",
    description:
      "Supports people living with lupus through local groups and information, and works to make the condition better known.",
    conditions: ["lupus"],
  },
  {
    name: "Lyme Disease UK",
    slug: "lyme-disease-uk",
    registeredNumber: "1182212",
    regulator: "CCEW",
    websiteUrl: "https://lymediseaseuk.com",
    donationUrl: "https://lymediseaseuk.com/donate/",
    description:
      "Supports people with Lyme disease, mostly through online groups and information, and works to make it better known.",
    conditions: ["lyme-disease"],
  },
  {
    name: "Lyme Disease Action",
    slug: "lyme-disease-action",
    registeredNumber: "1100448",
    regulator: "CCEW",
    websiteUrl: "https://www.lymediseaseaction.org.uk",
    donationUrl: "https://www.lymediseaseaction.org.uk/what-you-can-do/donation/",
    description:
      "Publishes information about Lyme disease and campaigns on how it is prevented, diagnosed and treated.",
    conditions: ["lyme-disease"],
  },
  {
    name: "The Menopause Charity",
    slug: "the-menopause-charity",
    registeredNumber: "1191332",
    regulator: "CCEW",
    websiteUrl: "https://themenopausecharity.org",
    donationUrl: "https://themenopausecharity.org/support-us/donate/",
    description:
      "Publishes information about perimenopause and menopause, written with doctors, and works to make sure people are not left to manage it alone.",
    conditions: ["menopause"],
  },
  {
    name: "MND Association",
    slug: "mnd-association",
    registeredNumber: "294354",
    regulator: "CCEW",
    websiteUrl: "https://www.mndassociation.org",
    donationUrl: "https://www.mndassociation.org/get-involved/donate-mnd-association-today",
    description:
      "Supports people living with motor neurone disease, and their families, in England, Wales and Northern Ireland. It funds research and campaigns for better care.",
    conditions: ["motor-neurone-disease"],
  },
  {
    name: "MS Society",
    slug: "ms-society",
    registeredNumber: "1139257",
    regulator: "CCEW",
    websiteUrl: "https://www.mssociety.org.uk",
    donationUrl: "https://www.mssociety.org.uk/get-involved/donate",
    description:
      "Supports people living with multiple sclerosis through a helpline and local groups, and funds research into MS.",
    conditions: ["multiple-sclerosis"],
  },
  {
    name: "MS Trust",
    slug: "ms-trust",
    registeredNumber: "1088353",
    regulator: "CCEW",
    websiteUrl: "https://mstrust.org.uk",
    donationUrl: "https://mstrust.org.uk/get-involved/donate",
    description:
      "Gives information and support to people with multiple sclerosis and their families, and trains the nurses and therapists who look after them.",
    conditions: ["multiple-sclerosis"],
  },
  {
    name: "Parkinson's UK",
    slug: "parkinsons-uk",
    registeredNumber: "258197",
    regulator: "CCEW",
    websiteUrl: "https://www.parkinsons.org.uk",
    donationUrl: "https://www.parkinsons.org.uk/donate",
    description:
      "Supports people with Parkinson's and their families through a helpline, local groups and information, and funds research.",
    conditions: ["parkinsons-disease"],
  },
  {
    name: "Cure Parkinson's",
    slug: "cure-parkinsons",
    registeredNumber: "1111816",
    regulator: "CCEW",
    websiteUrl: "https://cureparkinsons.org.uk",
    donationUrl: "https://cureparkinsons.org.uk/get-involved/donate/",
    description: "A research charity. It finds and funds research into Parkinson's.",
    conditions: ["parkinsons-disease"],
  },
  {
    name: "PANDAS Foundation",
    slug: "pandas-foundation",
    registeredNumber: "1149485",
    regulator: "CCEW",
    websiteUrl: "https://pandasfoundation.org.uk",
    donationUrl: "https://pandasfoundation.org.uk/how-you-can-help-us/donate/",
    description:
      "Offers peer support to parents and families affected by mental illness during pregnancy or after a baby is born, including postnatal depression.",
    conditions: ["postnatal-depression"],
  },
  {
    name: "Action on Postpartum Psychosis",
    slug: "action-on-postpartum-psychosis",
    registeredNumber: "1139925",
    regulator: "CCEW",
    websiteUrl: "https://www.app-network.org",
    donationUrl: "https://www.app-network.org/get-involved-with-app/donate-2/",
    description:
      "Offers peer support and information to women who have had postpartum psychosis, a rarer and more severe illness after birth, and to their families.",
    conditions: ["postnatal-depression"],
  },
  {
    name: "POTS UK",
    slug: "pots-uk",
    registeredNumber: "1159813",
    regulator: "CCEW",
    websiteUrl: "https://www.potsuk.org",
    donationUrl: "https://www.potsuk.org/donate/",
    description:
      "Publishes information about PoTS for patients and health workers, runs support meetings, and backs research.",
    conditions: ["pots"],
  },
  {
    name: "Action on Pre-eclampsia",
    slug: "action-on-pre-eclampsia",
    registeredNumber: "1013557",
    regulator: "CCEW",
    websiteUrl: "https://action-on-pre-eclampsia.org.uk",
    donationUrl: "https://action-on-pre-eclampsia.org.uk/support-us/make-a-donation/",
    description:
      "Runs a helpline and gives information to people who have had pre-eclampsia or are at risk of it, and teaches health workers about it.",
    conditions: ["pre-eclampsia"],
  },
  {
    name: "Tommy's",
    slug: "tommys",
    registeredNumber: "1060508",
    regulator: "CCEW",
    websiteUrl: "https://www.tommys.org",
    donationUrl: "https://www.tommys.org/donate",
    description:
      "Funds research into things that go wrong in pregnancy, and gives information and support to parents through a team of midwives.",
    conditions: ["pre-eclampsia"],
  },
  {
    name: "PTSD UK",
    slug: "ptsd-uk",
    // Registered in Scotland only.
    registeredNumber: "SC045995",
    regulator: "OSCR",
    websiteUrl: "https://www.ptsduk.org",
    donationUrl: "https://www.ptsduk.org/get-involved/donate-to-ptsd-uk/",
    description:
      "Works to make post-traumatic stress disorder better understood, whatever caused it, and publishes information for people living with it.",
    conditions: ["ptsd"],
  },
  {
    name: "Rape Crisis England & Wales",
    slug: "rape-crisis-england-and-wales",
    registeredNumber: "1155140",
    regulator: "CCEW",
    websiteUrl: "https://rapecrisis.org.uk",
    donationUrl: "https://rapecrisis.org.uk/donate/",
    description:
      "The national body for local Rape Crisis centres. Its support line is open at any hour, and it does not matter how long ago the abuse happened.",
    conditions: ["sexual-abuse"],
  },
  {
    // Registered as National Association for People Abused in Childhood.
    name: "NAPAC",
    slug: "napac",
    registeredNumber: "1069802",
    regulator: "CCEW",
    websiteUrl: "https://napac.org.uk",
    donationUrl: "https://napac.org.uk/donate/",
    description:
      "Supports adults who were abused as children, in any way. It runs a national support line and other services.",
    conditions: ["sexual-abuse"],
  },
  {
    name: "The Survivors Trust",
    slug: "the-survivors-trust",
    registeredNumber: "1169999",
    regulator: "CCEW",
    websiteUrl: "https://thesurvivorstrust.org",
    donationUrl: "https://thesurvivorstrust.org/donate/",
    description:
      "Brings together specialist services for people who have experienced rape or sexual abuse, and runs its own helpline.",
    conditions: ["sexual-abuse"],
  },
  {
    name: "Sickle Cell Society",
    slug: "sickle-cell-society",
    registeredNumber: "1046631",
    regulator: "CCEW",
    websiteUrl: "https://www.sicklecellsociety.org",
    donationUrl: "https://www.sicklecellsociety.org/donate-to-support-our-work/",
    description:
      "Gives information, counselling and practical support to people with sickle cell disorder and their families, and speaks up for them.",
    conditions: ["sickle-cell-disease"],
  },
  {
    // Registered as British Sjogrens Syndrome Association. The old number, 803002, is inactive.
    name: "Sjögren's UK",
    slug: "sjogrens-uk",
    registeredNumber: "1101571",
    regulator: "CCEW",
    websiteUrl: "https://sjogrensuk.org",
    donationUrl: "https://sjogrensuk.org/fundraising/",
    description:
      "Supports people living with Sjögren's and those who care for them, publishes information about it, and funds research.",
    conditions: ["sjogrens-syndrome"],
  },
  {
    name: "Spinal Injuries Association",
    slug: "spinal-injuries-association",
    registeredNumber: "1054097",
    regulator: "CCEW",
    websiteUrl: "https://www.spinal.co.uk",
    donationUrl: "https://www.spinal.co.uk/donate/",
    description:
      "Run by and for people with a spinal cord injury. It gives support and advice, and campaigns on the things that make life harder after one.",
    conditions: ["spinal-cord-injury"],
  },
  {
    // Registered as The Back-Up Trust.
    name: "Back Up",
    slug: "back-up",
    registeredNumber: "1072216",
    regulator: "CCEW",
    websiteUrl: "https://www.backuptrust.org.uk",
    donationUrl: "https://www.backuptrust.org.uk/get-involved/donate-to-us/make-a-donation",
    description:
      "Runs courses and mentoring for people learning to live with a spinal cord injury. Much of it is run by people who have one themselves.",
    conditions: ["spinal-cord-injury"],
  },
  {
    name: "Arrhythmia Alliance",
    slug: "arrhythmia-alliance",
    registeredNumber: "1107496",
    regulator: "CCEW",
    websiteUrl: "https://heartrhythmalliance.org/aa/uk",
    donationUrl: "https://www.justgiving.com/charity/arrhythmia",
    description:
      "Gives information and support to people affected by problems with their heart rhythm, and works to make them better known.",
    conditions: ["svt"],
  },
  {
    name: "British Heart Foundation",
    slug: "british-heart-foundation",
    registeredNumber: "225971",
    regulator: "CCEW",
    websiteUrl: "https://www.bhf.org.uk",
    donationUrl: "https://www.bhf.org.uk/how-you-can-help/donate",
    description:
      "Funds research into conditions of the heart and circulation, and gives information and support to people living with one.",
    conditions: ["svt"],
  },
  {
    name: "Tinnitus UK",
    slug: "tinnitus-uk",
    registeredNumber: "1011145",
    regulator: "CCEW",
    websiteUrl: "https://tinnitus.org.uk",
    donationUrl: "https://tinnitus.org.uk/join-the-cause/donate/",
    description:
      "Supports people living with tinnitus and those close to them, teaches the public and health workers about it, and funds research.",
    conditions: ["tinnitus"],
  },
  {
    // Registered as The Royal National Institute for Deaf People.
    name: "RNID",
    slug: "rnid",
    registeredNumber: "207720",
    regulator: "CCEW",
    websiteUrl: "https://rnid.org.uk",
    donationUrl: "https://rnid.org.uk/get-involved/donate/",
    description:
      "Supports people who are deaf, have hearing loss or live with tinnitus, and funds research into hearing.",
    conditions: ["tinnitus"],
  },
  {
    // Registered as The British Diabetic Association.
    name: "Diabetes UK",
    slug: "diabetes-uk",
    registeredNumber: "215199",
    regulator: "CCEW",
    websiteUrl: "https://www.diabetes.org.uk",
    donationUrl: "https://www.diabetes.org.uk/support-us",
    description:
      "Gives information and support to people living with any kind of diabetes, campaigns for good care, and funds research.",
    conditions: ["type-2-diabetes"],
  },
];
