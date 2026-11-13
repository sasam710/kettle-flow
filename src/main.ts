import "./style.css";
import { App } from "./app.ts";
import { mountGallery } from "./gallery.ts";
import type { Store } from "./progress.ts";

const root = document.querySelector<HTMLElement>("#app");
if (!root) throw new Error("Missing #app");

const params = new URLSearchParams(location.search);
if (params.has("gallery")) mountGallery(root);
else new App(root, browserStore());

function browserStore(): Store {
  try {
    const probe = "__kb_probe__";
    localStorage.setItem(probe, "1");
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    const mem = new Map<string, string>();
    return {
      getItem: (key) => mem.get(key) ?? null,
      setItem: (key, value) => {
        mem.set(key, value);
      },
    };
  }
}
