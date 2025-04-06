import express from "express";
import { launch } from "chrome-launcher";
import lighthouse from "lighthouse";
import cors from "cors";

const app = express();
const PORT = 3003;

app.use(cors());

app.get("/lighthouse", async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "Missing URL parameter." });
  }

  let chrome;
  try {
    console.log(`Running Lighthouse audit for: ${url}`);

    // Launch Chrome in headless mode
    chrome = await launch({ chromeFlags: ["--headless"] });
    const options = { port: chrome.port, output: "json", logLevel: "info" };

    // Run Lighthouse audit
    const { lhr } = await lighthouse(url, options);
    await chrome.kill(); // Close Chrome after audit is done

    // Process meaningful insights
    const result = {
      url: lhr.finalUrl,
      fetchTime: lhr.fetchTime,
      performance: {
        score: (lhr.categories.performance.score * 100).toFixed(0) + "%",
        firstContentfulPaint: formatMetric(
          lhr.audits["first-contentful-paint"]
        ),
        largestContentfulPaint: formatMetric(
          lhr.audits["largest-contentful-paint"]
        ),
        totalBlockingTime: formatMetric(lhr.audits["total-blocking-time"]),
        cumulativeLayoutShift: formatMetric(
          lhr.audits["cumulative-layout-shift"]
        ),
      },
      accessibility: {
        score: (lhr.categories.accessibility.score * 100).toFixed(0) + "%",
        issues: extractIssues(lhr.audits),
      },
      seo: {
        score: (lhr.categories.seo.score * 100).toFixed(0) + "%",
        mobileFriendly: lhr.audits["viewport"].score === 1 ? "Yes" : "No",
        metaTags:
          lhr.audits["meta-description"].score === 1 ? "Present" : "Missing",
      },
      bestPractices: {
        score: (lhr.categories["best-practices"].score * 100).toFixed(0) + "%",
        securityIssues:
          lhr.audits["is-on-https"].score === 1 ? "None" : "Not Secure",
      },
    };

    res.json(result);
  } catch (error) {
    console.error("Error running Lighthouse audit:", error.message);
    if (chrome) await chrome.kill();
    res.status(500).json({ error: "Failed to run Lighthouse audit." });
  }
});

// Format audit metric values
function formatMetric(audit) {
  return audit ? `${(audit.numericValue / 1000).toFixed(2)} sec` : "N/A";
}

// Extract accessibility issues
function extractIssues(audits) {
  const issues = [];
  for (const key in audits) {
    if (audits[key].score === 0) {
      issues.push(audits[key].title);
    }
  }
  return issues.length > 0 ? issues : "No major issues found";
}

app.listen(PORT, () => {
  console.log(`Lighthouse API running on http://localhost:${PORT}`);
});
