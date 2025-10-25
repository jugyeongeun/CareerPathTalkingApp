
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import type { Message } from './types';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';

const App: React.FC = () => {
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const GEMINI_SYSTEM_INSTRUCTION = `너는 나의 진로를 상담해주는 선생님이야. 나는 대한민국 마산 성지여자고등학교에 다니는 고등학교 2학년 여학생이야. 내가 말하는 모든 맥락을 기억해야해. 친절하고 따뜻한 말투를 사용하고, 항상 이모지를 사용해서 답변을 더 부드럽게 만들어줘.`;

  useEffect(() => {
    const initChat = async () => {
      try {
        if (!process.env.API_KEY) {
          throw new Error("API_KEY is not set in environment variables.");
        }
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const chatSession = ai.chats.create({
          model: 'gemini-2.5-flash',
          config: {
            systemInstruction: GEMINI_SYSTEM_INSTRUCTION,
          },
        });
        setChat(chatSession);

        setMessages([
          {
            role: 'model',
            content: '안녕하세요, 성지여자고등학교 학생. 만나서 반가워요! 저는 학생의 진로 고민을 함께 나누고 도와줄 진로 상담 선생님이에요. 어떤 이야기든 편하게 들려주세요. 😊',
          },
        ]);
      } catch (error) {
        console.error("Chat initialization failed:", error);
        setMessages([
          {
            role: 'model',
            content: '오류가 발생했어요. API 키 설정을 확인해주세요. 😥',
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    initChat();
  }, []);

  useEffect(() => {
    chatContainerRef.current?.scrollTo({
      top: chatContainerRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleShare = async () => {
    const chatHistory = messages.slice(1);

    if (chatHistory.length === 0) {
      showToast('공유할 대화 내용이 없습니다.');
      return;
    }

    const formattedChat = chatHistory
      .map(msg => {
        const prefix = msg.role === 'user' ? '나' : 'AI 선생님';
        return `${prefix}: ${msg.content}`;
      })
      .join('\n\n');

    const shareData = {
      title: 'AI 진로 상담 선생님과의 대화',
      text: formattedChat,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.error("Share failed:", error);
      }
    } else {
      try {
        await navigator.clipboard.writeText(formattedChat);
        showToast('대화 내용이 클립보드에 복사되었습니다.');
      } catch (err) {
        console.error("Failed to copy:", err);
        showToast('복사에 실패했습니다.');
      }
    }
  };

  const handleSendMessage = async (userInput: string) => {
    if (!chat) return;

    const userMessage: Message = { role: 'user', content: userInput };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setIsLoading(true);

    try {
      const response = await chat.sendMessage({ message: userInput });
      const modelMessage: Message = { role: 'model', content: response.text };
      setMessages((prevMessages) => [...prevMessages, modelMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: Message = {
        role: 'model',
        content: '메시지를 보내는 중 문제가 발생했어요. 잠시 후 다시 시도해주세요. 😟',
      };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans">
      <header className="bg-indigo-600 text-white p-4 shadow-md sticky top-0 z-10">
        <div className="relative max-w-4xl mx-auto flex justify-center items-center">
          <h1 className="text-xl md:text-2xl font-bold text-center">AI 진로 상담 선생님 🎓</h1>
          <button
            onClick={handleShare}
            className="absolute right-0 p-2 rounded-full hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-indigo-600 focus:ring-white"
            aria-label="대화 내용 공유하기"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.368a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
            </svg>
          </button>
        </div>
      </header>
      
      <main ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          {messages.map((msg, index) => (
            <ChatMessage key={index} message={msg} />
          ))}
          {isLoading && messages.length > 1 && (
            <ChatMessage message={{ role: 'model', content: '입력 중...' }} />
          )}
        </div>
      </main>

      <footer className="sticky bottom-0">
        <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      </footer>

      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-full shadow-lg z-20">
          {toastMessage}
        </div>
      )}
    </div>
  );
};

export default App;
