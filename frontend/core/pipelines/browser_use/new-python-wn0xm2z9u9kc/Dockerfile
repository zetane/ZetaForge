FROM python:3.12

WORKDIR /app

COPY . .

# Install Python dependencies
RUN pip install --no-cache-dir browser-use==0.1.36 playwright==1.50.0 langchain_openai python-dotenv

# Install Playwright dependencies and browser binaries
RUN playwright install --with-deps

# Install required system libraries for Playwright
RUN apt-get update && apt-get install -y \
    xvfb \
    xauth \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libxcomposite1 \
    libxrandr2 \
    libxdamage1 \
    libgbm1 \
    libasound2 \
    libpangocairo-1.0-0 \
    libgtk-3-0 \
    libx11-xcb1 \
    && rm -rf /var/lib/apt/lists/*

# Set environment variables
ENV DISPLAY=:99
ENV PLAYWRIGHT_BROWSERS_PATH=/root/.cache/ms-playwright
ENV BROWSER_USE_HEADLESS=true

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY computations.py .

# Run the script with xvfb for virtual display support
ENTRYPOINT ["xvfb-run", "--auto-servernum", "--server-args=-screen 0 1920x1080x24", "python", "computations.py"]
