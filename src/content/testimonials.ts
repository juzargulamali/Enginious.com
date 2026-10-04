// Testimonials. NOTHING here is published. The entries below are FICTIONAL SAMPLES for layout testing only:
// they name a made-up organisation and person, are never attributed to a real client, and are shown only on
// non-production previews when the URL contains ?samples=1 (clearly marked "Sample"). A real testimonial is added in the CMS with
// confirmed wording, speaker, role, organisation and permission, then `published` is set to true.

export interface Testimonial {
  id: string;
  quote: string;
  name: string;
  role: string;
  organisation: string;
  /** Optional links into confirmed data. */
  clientId?: string;
  projectSlug?: string;
  published: boolean;
  /** Fictional sample for layout testing. Never published. */
  sample?: boolean;
  order: number;
}

export const TESTIMONIALS: Testimonial[] = [
  { id: "sample-1", sample: true, published: false, order: 1, name: "Alex Sample", role: "Head of Events", organisation: "Sample Organisation (fictional)", projectSlug: "whx", quote: "Sample text for layout testing: the installation stopped people in the aisle and gave our team a clear story to tell." },
  { id: "sample-2", sample: true, published: false, order: 2, name: "Jordan Example", role: "Marketing Director", organisation: "Example Company (fictional)", projectSlug: "cityscape", quote: "Sample text for layout testing: one team handled the content, the software and the hardware, so nothing was lost between them." },
  { id: "sample-3", sample: true, published: false, order: 3, name: "Sam Placeholder", role: "Programme Lead", organisation: "Placeholder Group (fictional)", projectSlug: "global-health-exhibition", quote: "Sample text for layout testing: the experience worked on the first day and kept working to the last." },
];

export const publishedTestimonials = () => TESTIMONIALS.filter((t) => t.published && !t.sample).sort((a, b) => a.order - b.order);
export const sampleTestimonials = () => TESTIMONIALS.filter((t) => t.sample).sort((a, b) => a.order - b.order);
