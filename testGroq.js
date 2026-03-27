import Groq from 'groq-sdk';
import 'dotenv/config';

const groq = new Groq({ 
  apiKey: process.env.VITE_GROQ_API_KEY || ''
});

async function main() {
  try {
    const base64Pixel = "R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==";
    const formattedImage = `data:image/jpeg;base64,${base64Pixel}`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Return the word banana as JSON: { \"word\": \"banana\" }" },
            {
              type: "image_url",
              image_url: {
                url: formattedImage,
              }
            }
          ],
        },
      ],
      model: "llama-3.2-11b-vision-preview",
      temperature: 0.2
    });

    console.log(completion.choices[0]?.message?.content);
  } catch (err) {
    console.error("ERROR:");
    console.error(err);
  }
}
main();
