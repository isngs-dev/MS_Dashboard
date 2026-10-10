/**
 * All marketing copy lives here, verbatim from the brief.
 * Components import from this file so wording is edited in exactly one place.
 */

export const BRAND = {
  product: "MS Dashboard",
  company: "iSN",
  tagline: "Built by iSN. Built for Mystery Shopping.",
} as const;

export const NAV = {
  cta: "Build Your Dashboard",
} as const;

export const HERO = {
  headline: "Turn Your MS Data Into Clear Insights",
  headlineHighlight: ["Clear", "Insights"],
  subheadline:
    "One simple dashboard to organize, analyze, and report your MS project data.",
  cta: "Build Your Dashboard",
} as const;

export const VALUE = {
  headline: "Your Projects. Your Data. One Clear View.",
  headlineHighlight: ["One", "Clear", "View."],
  body: "MS Dashboard brings your Mystery Shopping project data together in one organized platform, making it easier to view results, track performance, analyze trends, and create reports based on exactly what your clients need.",
  closing: [
    "No more digging through spreadsheets.",
    "No more scattered reports.",
    "Just clear, actionable data.",
  ],
} as const;

export const FEATURES = {
  headline: "Everything You Need to Make Your Data Work Smarter",
  headlineHighlight: ["Work", "Smarter"],
  intro:
    "MS Dashboard is built specifically around the way Mystery Shopping companies work, giving your team a simpler way to manage and understand project data.",
  items: [
    {
      n: "01",
      title: "All Project Data in One Place",
      body: "Keep your Mystery Shopping project results organized and easy to access. View data across projects without jumping between multiple files or systems.",
    },
    {
      n: "02",
      title: "Custom Dashboards",
      body: "Create dashboards around the metrics that matter to your business and your clients. Choose what you want to see and how you want to see it.",
    },
    {
      n: "03",
      title: "Analytical Reports",
      body: "Turn raw shopping data into meaningful insights. Analyze performance, identify trends, compare results, and understand what the numbers are telling you.",
    },
    {
      n: "04",
      title: "Quantitative Reporting",
      body: "Get clear, data-driven reports based on the specific requirements of each project. Make large volumes of shopping data easier to understand and present.",
    },
    {
      n: "05",
      title: "Client-Ready Reports",
      body: "Create clean and organized reports that are easier to share with your clients. Present project results in a format that makes the key findings easy to understand.",
    },
    {
      n: "06",
      title: "Project Performance Tracking",
      body: "Monitor project results and performance from a single view. Quickly identify areas that are performing well and those that need attention.",
    },
    {
      n: "07",
      title: "Filter & Compare Data",
      body: "Drill down into your data using project, location, shopper, question, date, score, or other relevant parameters. Compare results to uncover useful patterns.",
    },
    {
      n: "08",
      title: "Real-Time Data Visibility",
      body: "Get a clearer view of project data as results come in, helping your team stay informed without waiting for manual reports to be prepared.",
    },
    {
      n: "09",
      title: "Simplified Data Visualization",
      body: "Turn complex project data into easy-to-read charts, graphs, tables, and summaries so your team and clients can understand results faster.",
    },
    {
      n: "10",
      title: "Built Around Your Requirements",
      body: "Every Mystery Shopping company works differently. MS Dashboard can be structured around your reporting requirements, project workflows, and the information your clients care about most.",
    },
  ],
} as const;

export const ABOUT = {
  headline: "25+ Years of Understanding the Mystery Shopping Industry",
  headlineHighlight: ["25+", "Years"],
  paragraphs: [
    "For over 25 years, iSN has worked alongside leading Mystery Shopping companies, helping them improve operations, generate business, manage data, and streamline their technology needs.",
    "With MS Dashboard, iSN brings that industry experience into a simpler, smarter platform built specifically to help Mystery Shopping companies organize their data, understand their results, and deliver better reporting.",
  ],
  tagline: "Built by iSN. Built for Mystery Shopping.",
} as const;

export const FORM = {
  headline: "Build a Dashboard Around Your Business",
  headlineHighlight: ["Dashboard", "Around", "Your", "Business"],
  body: "Tell us a little about your company and let's explore how MS Dashboard can simplify the way you manage and report your Mystery Shopping data.",
  submit: "Build My Dashboard",
  fields: {
    name: "Name",
    company: "Company Name",
    phone: "Phone",
    email: "Email",
  },
  success: {
    title: "Thank you!",
    body: "Your details are in and a confirmation email is on its way. The iSN team will be in touch shortly to explore how MS Dashboard can fit your business.",
    bookedTitle: "You're booked!",
    bookedBody: "We've emailed the meeting link and a calendar invite to {email}. See you on {when}.",
  },
  error: "Something went wrong sending your details. Please try again.",
} as const;

/** The "Schedule a Meet" pop-up shown after the contact form is submitted. */
export const SCHEDULE = {
  title: "Schedule a Meet",
  body: "Pick a date and time that suits you and we'll email you the meeting link.",
  date: "Date",
  time: "Time",
  timezone: "Time zone",
  timezoneName: "Eastern Time (ET)",
  pickDate: "Pick a date to see the times that are free.",
  checking: "Checking availability",
  noSlots: "No free times on this day. Please pick another date.",
  loadFailed: "We couldn't load the available times.",
  retry: "Try again",
  legendFree: "Available",
  legendBusy: "Unavailable",
  book: "Book my meeting",
  booking: "Booking your meeting",
  skip: "No, thanks, just email me",
  sending: "Sending your email",
  unavailable: "That time isn't available. Please choose another time.",
  bookFailed: "We couldn't book that time just now. Please try again, or choose “No, thanks, just email me”.",
  back: "Back to the form",
} as const;

export const FOOTER = {
  tagline: "Built by iSN. Built for Mystery Shopping.",
  rights: "All rights reserved.",
} as const;
