import { CoreMessage } from "ai";
import { redis } from "./redis";

export async function getConversationHistory(
  conversationId: string,
): Promise<CoreMessage[]> {
  const history = await redis.get(conversationId);
  return Array.isArray(history) && history.every(isCoreMessage) ? history : [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isCoreMessage(msg: any): msg is CoreMessage {
  return (
    typeof msg === "object" &&
    (msg.role === "user" || msg.role === "assistant") &&
    typeof msg.content === "string"
  );
}

export async function saveConversationHistory(
  conversationId: string,
  messages: CoreMessage[],
) {
  await redis.set(conversationId, messages);
}
