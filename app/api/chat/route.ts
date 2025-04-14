// app/api/chat/route.ts

import { openai } from "@ai-sdk/openai";
import {
  streamText,
  StreamData,
  tool,
  createDataStreamResponse,
  CoreMessage,
} from "ai";
import { z } from "zod";
import {
  getConversationHistory,
  saveConversationHistory,
} from "@/lib/conversation-storage";

export const maxDuration = 30;

type ChatState = {
  messages: CoreMessage[];
};

const tools = {
  weather: tool({
    description: "Get the weather in a location (fahrenheit)",
    parameters: z.object({
      location: z.string().describe("The location to get the weather for"),
    }),
    execute: async ({ location }) => {
      const temperature = Math.round(Math.random() * (90 - 32) + 32);
      return {
        location,
        temperature,
      };
    },
  }),
  convertFahrenheitToCelsius: tool({
    description: "Convert a temperature in fahrenheit to celsius",
    parameters: z.object({
      temperature: z
        .number()
        .describe("The temperature in fahrenheit to convert"),
    }),
    execute: async ({ temperature }) => {
      const celsius = Math.round((temperature - 32) * (5 / 9));
      return {
        celsius,
      };
    },
  }),
};

export async function POST(req: Request) {
  const { messages, conversationId } = await req.json();

  if (!conversationId || !Array.isArray(messages)) {
    return createDataStreamResponse({
      status: 400,
      execute: async (stream) => {
        await stream.write(`0:Missing or invalid payload\n`);
      },
    });
  }

  if (!conversationId) {
    return createDataStreamResponse({
      status: 400,
      execute: async (stream) => {
        // This is the correct chunk format: prefix with "0:" and end with newline
        await stream.write(`0:Missing conversationId\n`);
      },
    });
  }

  const previousMessages: CoreMessage[] = await getConversationHistory(
    conversationId
  );

  console.error("previousMessages", JSON.stringify(previousMessages, null, 2));

  const allMessages: CoreMessage[] = [...previousMessages, ...messages];
  const result = await streamText({
    model: openai("o3-mini"),
    messages: allMessages,
    tools,
    async onFinish(result: any) {
      const finalMessages = result.response?.messages;

      if (finalMessages && Array.isArray(finalMessages)) {
        const assistantMessages: CoreMessage[] = finalMessages.map(
          (msg: any) => ({
            role: msg.role,
            content:
              typeof msg.content === "string"
                ? msg.content
                : msg.content.map((c: { text: string }) => c.text).join(""),
          })
        );

        const userMessages: CoreMessage[] = messages.map((m: any) => ({
          role: m.role,
          content: m.content,
        }));

        const lastUserMessage = messages[messages.length - 1];
        const assistantMessage = finalMessages[0]; // usually just one assistant message

        const updatedHistory = [
          ...previousMessages,
          {
            role: lastUserMessage.role,
            content: lastUserMessage.content,
          },
          {
            role: assistantMessage.role,
            content: Array.isArray(assistantMessage.content)
              ? assistantMessage.content.map((c) => c.text).join("")
              : assistantMessage.content,
          },
        ];

        console.error(
          "✅ Saving full conversation:",
          JSON.stringify(updatedHistory, null, 2)
        );

        await saveConversationHistory(conversationId, updatedHistory);
      } else {
        console.warn(
          "⚠️ No assistant messages found in result.response.messages"
        );
      }
    },
  });

  return result.toDataStreamResponse();
}
