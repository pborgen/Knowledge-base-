import { config } from "./config.js";
import { createHttpApp } from "./http-app.js";

const app = createHttpApp();

app.listen(config.appPort, () => {
  console.log(`HTTP app running on http://localhost:${config.appPort}`);
});
