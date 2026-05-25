export interface Dictionary {
  nav: {
    me: string;
    skills: string;
    projects: string;
    contact: string;
    technical: string;
  };
  hero: {
    greeting: string;
    name: string;
    tagline: string;
    scroll: string;
  };
  about: {
    label: string;
    title: string;
    bio: string[];
    columns: { title: string; items: string[] }[];
  };
  skills: {
    label: string;
    title: string;
    subtitle: string;
    hint: string;
  };
  projects: {
    label: string;
    title: string;
    subtitle: string;
    viewCode: string;
  };
  contact: {
    label: string;
    title: string;
    subtitle: string;
    name: string;
    namePlaceholder: string;
    email: string;
    emailPlaceholder: string;
    message: string;
    messagePlaceholder: string;
    send: string;
    sending: string;
    success: string;
    error: string;
    invalid: string;
  };
  footer: {
    thanks: string;
    note: string;
    rights: string;
    builtWith: string;
    backToTop: string;
  };
  menu: {
    open: string;
    close: string;
    theme: string;
    language: string;
  };
}
