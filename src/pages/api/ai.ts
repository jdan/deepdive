// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

type Data = {
  query: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const messages = [];

  const numMessages = Object.keys(req.query).length / 2;
  for (let i = 0; i < numMessages; i++) {
    messages.push({
      role: req.query[`transcript[${i}][role]`],
      content: req.query[`transcript[${i}][content]`],
    });
  }

  const completion = await openai.createChatCompletion(
    {
      model: "gpt-3.5-turbo",
      messages,
      stream: true,
    },
    { responseType: "stream" }
  );

  completion.data.pipe(res);
}
