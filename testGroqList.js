import Groq from 'groq-sdk';
import 'dotenv/config';

const groq = new Groq({ 
  apiKey: process.env.VITE_GROQ_API_KEY || ''
});

async function main() {
  try {
    const list = await groq.models.list();
    // print all models containing 'vision'
    const visionModels = list.data.filter(m => m.id.includes('llama') && m.id.includes('v'));
    console.log("VISION MODELS:", visionModels.map(m => m.id));
    console.log("ALL MODELS:", list.data.map(m => m.id));
  } catch (err) {
    console.error("ERROR:");
    console.error(err);
  }
}
main();
