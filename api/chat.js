// api/chat.js

import { GoogleGenAI } from "@google/genai";
import Busboy from "busboy";


// ===============================
// GEMINI
// ===============================

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});


// ===============================
// DISABLE DEFAULT BODY PARSER
// ===============================

export const config = {
    api: {
        bodyParser: false
    }
};


// ===============================
// READ MULTIPART FORM
// ===============================

function parseForm(req) {

    return new Promise((resolve, reject) => {

        const busboy =
            Busboy({
                headers: req.headers
            });


        let message = "";

        let imageBuffer = null;

        let imageMimeType = null;


        busboy.on(
            "field",
            (name, value) => {

                if (name === "message") {

                    message = value;
                }
            }
        );


        busboy.on(
            "file",
            (name, file, info) => {

                const chunks = [];

                imageMimeType =
                    info.mimeType;


                file.on(
                    "data",
                    chunk => {

                        chunks.push(chunk);
                    }
                );


                file.on(
                    "end",
                    () => {

                        imageBuffer =
                            Buffer.concat(chunks);
                    }
                );

            }
        );


        busboy.on(
            "finish",
            () => {

                resolve({
                    message,
                    imageBuffer,
                    imageMimeType
                });

            }
        );


        busboy.on(
            "error",
            reject
        );


        req.pipe(busboy);
    });
}


// ===============================
// API
// ===============================

export default async function handler(req, res) {

    // Only POST

    if (req.method !== "POST") {

        return res.status(405).json({
            error: "Only POST requests are allowed."
        });
    }


    try {

        // READ DATA

        const {
            message,
            imageBuffer,
            imageMimeType
        } = await parseForm(req);


        if (!message && !imageBuffer) {

            return res.status(400).json({
                error:
                    "Message অথবা image দিতে হবে।"
            });
        }


        // =========================
        // GEMINI CONTENT
        // =========================

        const parts = [];


        // TEXT

        if (message) {

            parts.push({
                text: message
            });

        } else {

            parts.push({
                text:
                    "এই ছবিটি দেখে বিস্তারিত উত্তর দিন।"
            });
        }


        // IMAGE

        if (imageBuffer) {

            parts.push({

                inlineData: {

                    mimeType:
                        imageMimeType ||
                        "image/jpeg",

                    data:
                        imageBuffer.toString(
                            "base64"
                        )
                }

            });

        }


        // =========================
        // GEMINI REQUEST
        // =========================

        const result =
            await ai.models.generateContent({

                model:
                    "gemini-2.5-flash",

                contents: [
                    {
                        role: "user",
                        parts: parts
                    }
                ]

            });


        const reply =
            result.text ||
            "Gemini কোনো উত্তর দেয়নি।";


        // =========================
        // RESPONSE
        // =========================

        return res.status(200).json({

            reply: reply

        });


    } catch (error) {

        console.error(
            "Gemini Error:",
            error
        );


        return res.status(500).json({

            error:
                "Gemini API-তে সমস্যা হয়েছে।"

        });
    }
            }
