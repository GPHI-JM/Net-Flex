import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import { initFB } from "./fb-sdk";
import "./styles.css";

// Keep a global promise so scenes can react when FB init completes.
window.__fbInitPromise = initFB().catch((err) => {
  console.error("FB init failed:", err);
});

const app = createApp(App);
app.use(createPinia());
app.mount("#app");
