import { useChat } from '@ai-sdk/react';
import { v4 as uuidv4 } from 'uuid';
import { useEffect, useRef } from 'react';

export default function Chat() {
  const conversationIdRef = useRef<string>('');

  // Create a stable conversationId once per component mount
  useEffect(() => {
    conversationIdRef.current = uuidv4();
  }, []);

  const { messages, input, handleInputChange, handleSubmit } = useChat({
    maxSteps: 5,
    body: {
      conversationId: conversationIdRef.current,
    },
  });

  return (
    <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch">
      {messages.map((message) => (
        <div key={message.id} className="whitespace-pre-wrap">
          {message.role === 'user' ? 'User: ' : 'AI: '}
          {message.parts.map((part, i) => {
            if (part.type === 'text') {
              return <div key={`${message.id}-${i}`}>{part.text}</div>;
            } else if (part.type === 'tool-invocation') {
              return (
                <pre key={`${message.id}-${i}`}>
                  {JSON.stringify(part.toolInvocation, null, 2)}
                </pre>
              );
            }
          })}
        </div>
      ))}

      <form onSubmit={handleSubmit}>
        <input
          className="fixed dark:bg-zinc-900 bottom-0 w-full max-w-md p-2 mb-8 border border-zinc-300 dark:border-zinc-800 rounded shadow-xl"
          value={input}
          placeholder="Say something..."
          onChange={handleInputChange}
        />
      </form>
    </div>
  );
}
