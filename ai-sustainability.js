import express from "express";
import axios from "axios";
import { co2 } from "@tgwf/co2";
import OpenAI from "openai";
import cors from "cors";

const app = express();
const PORT = 3002;
app.use(cors());

const co2Calculator = new co2({ model: "swd" });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); // Set your OpenAI API key

app.get("/ai-sustainability", async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: "Missing URL parameter." });
  }

  try {
    console.log(`Analyzing: ${url}`);
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
      },
      maxRedirects: 5,
      timeout: 10000,
    });

    const resourceSize = (response.data.length / 1024).toFixed(2);
    const co2Emissions = co2Calculator
      .perByte(response.data.length, { model: "swd" })
      .toFixed(4);

    const prompt = `Analyze the following website's CO2 emissions and provide sustainability recommendations. 
    Website: ${url}
    Data: 
    - Resource Size: ${resourceSize} KB
    - CO2 Emissions: ${co2Emissions} g
    
    Provide 5 personalized recommendations to reduce emissions while maintaining user experience.`;

    const aiResponse = await openai.completions.create({
      model: "gpt-4",
      prompt,
      max_tokens: 150,
    });

    const recommendations = aiResponse.choices[0].text.trim();

    res.json({
      url,
      resourceSize: `${resourceSize} KB`,
      co2Emissions: `${co2Emissions} g`,
      recommendations,
    });
  } catch (error) {
    console.error("Error fetching data:", error.message);
    res.status(500).json({
      error: "Failed to analyze sustainability.",
      details: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`AI Sustainability API running on http://localhost:${PORT}`);
});
