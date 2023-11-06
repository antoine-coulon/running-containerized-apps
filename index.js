import { setTimeout } from "node:timers/promises";

console.log(`Running on PID ${process.pid}`);

// Just to keep the process alive
const timerId = setInterval(() => {
  console.log("Running in the background");
}, 10_000);

// Be sure that this never throws otherwise the process will exit
async function cleanup() {
  console.log("Start cleanup");
  await setTimeout(1000);
  clearInterval(timerId);
}

process.on("SIGTERM", () => {
  console.log("SIGTERM received");

  // Exit with a non-zero exit code so that the process manager knows
  process.exitCode = 143;

  // Do whatever async stuff you need to do before exiting
  cleanup().finally(() => {
    // Since our cleanup function gets rid of all running resources,
    // Node.js will exit automatically after that.
    console.log("Exiting now that all resources have been cleaned up");
  });
});
