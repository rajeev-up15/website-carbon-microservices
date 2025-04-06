const express = require("express");
const axios = require("axios");
const { co2 } = require("@tgwf/co2");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

const co2Calculator = new co2({ model: "swd" });

app.get("/co2", async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "Missing URL parameter." });
  }

  try {
    console.log(`Fetching: ${url}`);
    const startTime = performance.now();
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
      },
      maxRedirects: 5,
      timeout: 10000,
    });
    const endTime = performance.now();

    // Convert response size to KB
    const resourceSizeKB = (response.data.length / 1024).toFixed(2);

    // Calculate CO2 emissions
    const co2Emissions = co2Calculator.perByte(response.data.length, true);

    // Estimated energy consumption (gCO2 → kWh)
    const energyConsumption = (co2Emissions * 0.0003).toFixed(6);

    // Estimated annual CO2 emissions (assuming 1000 visits/day)
    const annualCo2Emissions = (co2Emissions * 1000 * 365).toFixed(2);

    // Impact comparison: Equivalent to car emissions per km driven (Avg: 120g CO2/km)
    const carKmEquivalent = (co2Emissions / 120).toFixed(2);

    // Impact comparison: Trees needed to offset emissions (1 tree absorbs ~21kg CO2/year)
    const treesRequired = (annualCo2Emissions / 21000).toFixed(4);

    // Efficiency rating based on CO2 emissions per page load
    let efficiencyScore;
    if (co2Emissions < 0.5) {
      efficiencyScore = "Average (Could Improve)";
    } else if (co2Emissions < 1.0) {
      efficiencyScore = "Below average (Must Improve)";
    } else if (co2Emissions < 2.0) {
      efficiencyScore = "Poor (High Emissions)";
    } else {
      efficiencyScore = "Very Poor (Very High Emissions)";
    }

    // Reduction Recommendations
    const recommendations = [
      "Optimize images using modern formats like WebP and AVIF.",
      "Minimize JavaScript and CSS files by reducing unused code.",
      "Enable browser caching to reduce redundant network requests.",
      "Use a content delivery network (CDN) for faster loading.",
      "Host your website on a green energy-powered server.",
      "Avoid autoplaying videos and large media files when unnecessary.",
      "Implement lazy loading for images and videos.",
      "Reduce third-party scripts and use asynchronous loading where possible.",
      "Use static site generation (SSG) or server-side rendering (SSR) for efficiency.",
      "Minimize HTTP requests by combining files and reducing dependencies.",
      "Implement dark mode where appropriate (OLED screens use less energy).",
      "Use efficient fonts and limit the number of font files loaded.",
      "Remove unnecessary tracking scripts and analytics where possible.",
      "Enable Gzip or Brotli compression to reduce file sizes.",
      "Use efficient database queries and optimize backend processing.",
      "Regularly audit your website performance using Lighthouse or WebPageTest.",
      "Educate users and developers on sustainable web design principles.",
    ];

    res.json({
      url,
      resourceSize: `${resourceSizeKB} KB`,
      pageLoadTime: `${((endTime - startTime) / 1000).toFixed(2)} sec`,
      co2Emissions: `${co2Emissions.toFixed(4)} g`,
      energyConsumption: `${energyConsumption} kWh`,
      estimatedAnnualCO2: `${annualCo2Emissions} g`,
      impactComparison: {
        carKmEquivalent: `${carKmEquivalent} km driven`,
        treesRequired: `${treesRequired} trees/year to offset`,
      },
      efficiencyScore,
      recommendations,
    });
  } catch (error) {
    console.error("Error fetching URL:", error.message);
    res
      .status(500)
      .json({ error: "Failed to fetch the website or calculate CO2." });
  }
});

app.listen(PORT, () => {
  console.log(`CO2 microservice listening on port ${PORT}`);
});
