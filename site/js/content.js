/**
 * Birthday Love Letter Template — editable content
 *
 * Change the values below, save the file, and refresh the page.
 * Keep photo and music paths relative to site/index.html. User-provided text is
 * inserted with textContent by main.js; HTML in these strings is not interpreted.
 */
window.SITE_CONTENT = {
  pageTitle: "A Birthday Letter for Your Person",
  description: "A customizable floral birthday greeting, photo gallery, and heartfelt letter template.",

  occasion: "Happy Birthday",
  recipientName: "Your Person",
  heroEyebrow: "A little celebration, made with love",
  heroSubtitle: "Replace this line with a short wish for someone special.",

  galleryEyebrow: "A few favorite moments",
  galleryHeading: "Our little gallery",
  photos: [
    {
      src: "assets/placeholders/photo-1.svg",
      alt: "Floral placeholder labeled Add photo 1",
      caption: "Add your caption",
      date: "Add a date or memory"
    },
    {
      src: "assets/placeholders/photo-2.svg",
      alt: "Floral placeholder labeled Add photo 2",
      caption: "Add your caption",
      date: "Add a date or memory"
    },
    {
      src: "assets/placeholders/photo-3.svg",
      alt: "Floral placeholder labeled Add photo 3",
      caption: "Add your caption",
      date: "Add a date or memory"
    },
    {
      src: "assets/placeholders/photo-4.svg",
      alt: "Floral placeholder labeled Add photo 4",
      caption: "Add your caption",
      date: "Add a date or memory"
    }
  ],

  letterDate: "Month Day, Year",
  salutation: "My dearest [name],",
  letterParagraphs: [
    "Write your message here.",
    "Add another memory, wish, or reason this person matters to you.",
    "Keep writing until the letter sounds unmistakably like you."
  ],
  signature: "With love, [your name]",
  footerText: "Made with care — customize every word and memory.",

  petals: {
    enabled: true,
    count: 24,
    colors: ["#ed9fb1", "#f5bdc9", "#df879d", "#f8d7de"]
  },
  confetti: {
    enabled: true,
    count: 90,
    colors: ["#bc6f83", "#d99856", "#f0b6c3", "#7f9b76", "#f4d7a7"]
  },

  // Music stays off until enabled and given a file. Only publish audio you are licensed to share.
  music: {
    enabled: false,
    file: "",
    title: "Your licensed song",
    delayedPlayback: {
      enabled: true,
      delayMs: 3000
    }
  }
};
