class DotPrinter {
  constructor(maxDots = 4, intervalTime = 600) {
    this.maxDots = maxDots;
    this.intervalTime = intervalTime;
    this.dotCount = 0;
    this.interval = null;
  }

  start() {
    this.interval = setInterval(() => {
      process.stdout.write('. '); 

      this.dotCount++;

      if (this.dotCount >= this.maxDots) {
        this.dotCount = 0;
        process.stdout.write('\b\b\b\b\b\b\b\b        \b\b\b\b\b\b\b\b');
      }
    }, this.intervalTime);
  }


  stop() {
    clearInterval(this.interval);
    process.stdout.write('\n');
  }
}

module.exports = DotPrinter