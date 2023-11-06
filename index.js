console.log(`Running on PID ${process.pid}`);

// Just to keep the process alive
const timerId = setInterval(() => {
  console.log("Running in the background");
}, 10_000);

// Be sure that this never throws otherwise the process will exit
function cleanup(finalize) {
  console.log("Start cleanup");
  
  setTimeout(() => {
    clearInterval(timerId);
    finalize();
  }, 1000);
}

process.on("SIGTERM", () => {
  console.log("SIGTERM received");

  // Exit with a non-zero exit code so that the process manager knows
  process.exitCode = 143;

  // Do whatever async stuff you need to do before exiting
  cleanup(() => {
    // Since our cleanup function gets rid of all running resources,
    // Node.js will exit automatically after that.
    console.log("Exiting now that all resources have been cleaned up");
  });
});
