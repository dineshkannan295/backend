import express from "express";
import multer from "multer";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import XLSX from "xlsx";
import OpenAI from "openai";
import { DocumentProcessorServiceClient } from "@google-cloud/documentai";

dotenv.config();

const app = express();
app.use(cors());

const upload = multer({ storage: multer.memoryStorage() });

// Init Document AI client
const keyFile = process.env.GOOGLE_KEY_FILE || "./google-key.json";
const client = new DocumentProcessorServiceClient({
  keyFilename: keyFile
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_MODEL || "gpt-5.1";

app.post("/process", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "file required" });

    const name = `projects/${process.env.PROJECT_ID}/locations/${process.env.LOCATION}/processors/${process.env.PROCESSOR_ID}`;

    const request = {
      name,
      rawDocument: {
        content: req.file.buffer.toString("base64"),
        mimeType: req.file.mimetype || "application/pdf"
      }
    };

    const [result] = await client.processDocument(request);
    const doc = result.document || result;

    // minimal entity -> table conversion
    const tableData = [];

    if (doc.entities && doc.entities.length > 0) {
      doc.entities.forEach((e) => {
        tableData.push({
          field: e.type || "",
          value: e.mentionText || e.textAnchor?.content || ""
        });
      });
    } else {
      // Fallback: send full text to OpenAI for extraction
      const fullText = doc.text || "";
      const prompt = `You are an invoice extraction engine. Extract invoice fields into JSON array of key/value rows. Return only JSON array like [{ "Field": "...", "Value":"..." }]\n\n${fullText}`;

      const aiResp = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: "You extract invoice fields into key/value rows." },
          { role: "user", content: prompt }
        ],
        temperature: 0.0,
        max_tokens: 2000
      });

      let text = aiResp.choices?.[0]?.message?.content || "";
      try {
        const parsed = JSON.parse(text);
        parsed.forEach((r) => tableData.push(r));
      } catch (e) {
        // best-effort fallback: wrap text
        tableData.push({ Field: "extracted_text", Value: text.substring(0, 3000) });
      }
    }

    res.json({ success: true, data: tableData });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "processing error", details: err });
  }
});

app.get("/", (req, res) => res.send("DocAI backend running"));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
