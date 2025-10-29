'use client';

import React, { useState, useEffect, useRef } from 'react';
import LatexRenderer from './LatexRenderer';
import ConversationSidebar from './ConversationSidebar';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface ChatWithHistoryProps {
  userId: string;
}

export default function ChatWithHistory({ userId }: ChatWithHistoryProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFileInfo, setUploadedFileInfo] = useState<{name: string; id: string} | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load chat history when conversation changes
  // BUT NOT when we just created a new conversation while sending a message
  useEffect(() => {
    console.log('[ChatWithHistory] useEffect triggered:', { currentConversationId, isLoading });
    if (currentConversationId && !isLoading) {
      console.log('[ChatWithHistory] Loading history for conversation:', currentConversationId);
      loadChatHistory(currentConversationId);
    } else if (!currentConversationId) {
      console.log('[ChatWithHistory] No conversation ID, clearing messages');
      setMessages([]);
    } else {
      console.log('[ChatWithHistory] Skipped loading - isLoading is true');
    }
  }, [currentConversationId]);

  const loadChatHistory = async (conversationId: string) => {
    try {
      console.log('[ChatWithHistory] Fetching history for conversation:', conversationId);
      const response = await fetch(`/api/chat-history?userId=${userId}&conversationId=${conversationId}`);
      const data = await response.json();
      console.log('[ChatWithHistory] Received data:', data);
      if (data.history) {
        console.log('[ChatWithHistory] Setting messages:', data.history.length, 'messages');
        setMessages(data.history.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.message,
          created_at: msg.created_at
        })));
      } else {
        console.log('[ChatWithHistory] No history in response');
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

  const handleNewConversation = () => {
    setCurrentConversationId(null);
    setMessages([]);
    setInput('');
  };

  const handleSelectConversation = (conversationId: string) => {
    console.log('[ChatWithHistory] Conversation selected:', conversationId);
    setCurrentConversationId(conversationId);
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);

      // Upload file immediately
      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          throw new Error('Failed to upload file');
        }

        const data = await response.json();
        setUploadedFileInfo({ name: file.name, id: data.fileId });
        console.log('[File Upload] File uploaded successfully:', data);
      } catch (error) {
        console.error('[File Upload] Error:', error);
        alert('Failed to upload file. Please try again.');
        setSelectedFile(null);
      }

      // Reset the input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    const fileInfo = uploadedFileInfo;

    setInput('');
    setUploadedFileInfo(null);
    setSelectedFile(null);
    setIsLoading(true);

    // Prepare the display message (include file info if present)
    let displayMessage = userMessage;
    if (fileInfo) {
      displayMessage = `${userMessage}\n\n📎 Attached: ${fileInfo.name}`;
    }

    // Add user message to UI immediately
    const tempUserMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: displayMessage,
      created_at: new Date().toISOString()
    };
    console.log('[UI] Adding user message to UI:', tempUserMessage);
    setMessages(prev => {
      const newMessages = [...prev, tempUserMessage];
      console.log('[UI] Updated messages array:', newMessages);
      return newMessages;
    });

    try {

      let conversationId = currentConversationId;

      // If no conversation exists, create one with the first message as title
      if (!conversationId) {
        const createResponse = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userId,
            title: userMessage.length > 60 ? userMessage.substring(0, 60) + '...' : userMessage
          })
        });

        const createData = await createResponse.json();
        if (createData.conversation) {
          conversationId = createData.conversation.id;
          setCurrentConversationId(conversationId);
        } else {
          throw new Error('Failed to create conversation');
        }
      }

      // Create a temporary assistant message for streaming
      const assistantMessageId = (Date.now() + 1).toString();
      const tempAssistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, tempAssistantMessage]);

      // Send message to API with file IDs if present
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          userId: userId,
          conversationId: conversationId,
          fileIds: fileInfo ? [fileInfo.id] : undefined
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'text') {
                accumulatedContent += data.content;
                // Update the assistant message with accumulated content
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: accumulatedContent }
                      : msg
                  )
                );
              } else if (data.type === 'done') {
                // Final message - ensure it's set
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: data.message }
                      : msg
                  )
                );
              } else if (data.type === 'error') {
                throw new Error(data.message);
              }
            } catch (parseError) {
              console.error('Error parsing SSE data:', parseError);
            }
          }
        }
      }

    } catch (error) {
      console.error('Error sending message:', error);
      // Update the assistant message with error (if it was created)
      const assistantMessageId = (Date.now() + 1).toString();
      setMessages(prev =>
        prev.map(msg =>
          msg.role === 'assistant' && msg.content === ''
            ? { ...msg, content: 'Sorry, I encountered an error processing your request. Please try again.' }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar with conversation history */}
      <ConversationSidebar
        userId={userId}
        currentConversationId={currentConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b-4 border-mathtai-tan p-4 shadow-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/mathtai-logo.png" alt="MATH TAi" className="h-12 w-auto" />
            <h1 className="text-2xl font-bold text-mathtai-chalkboard">MATH TAi</h1>
          </div>
          <button
            onClick={() => {
              // Logout logic
              window.location.href = '/login';
            }}
            className="bg-mathtai-red hover:bg-mathtai-red/90 text-white px-4 py-2 rounded-lg transition font-medium"
          >
            Logout
          </button>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-lg font-medium">How can I help you today?</p>
                <p className="text-sm mt-2">Ask me anything about MATH 1228!</p>
              </div>
            </div>
          )}

          {messages.map((message) => {
            // Skip rendering assistant messages with no content (they're being streamed)
            if (message.role === 'assistant' && !message.content.trim()) {
              return null;
            }

            return (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-4 ${
                    message.role === 'user'
                      ? 'bg-mathtai-chalkboard text-white'
                      : 'bg-mathtai-tan/20 border-2 border-mathtai-tan text-gray-900'
                  }`}
                >
                  {message.role === 'user' ? (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  ) : (
                    <LatexRenderer content={message.content} />
                  )}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg p-4 max-w-[80%]">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <div className="border-t-2 border-mathtai-tan p-4 bg-white">
          {uploadedFileInfo && (
            <div className="mb-3 flex items-center gap-2 bg-mathtai-tan/20 border-2 border-mathtai-tan rounded-lg px-3 py-2">
              <svg className="w-5 h-5 text-mathtai-chalkboard" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              <span className="text-sm text-mathtai-chalkboard font-medium flex-1">{uploadedFileInfo.name}</span>
              <button
                type="button"
                onClick={() => {
                  setUploadedFileInfo(null);
                  setSelectedFile(null);
                }}
                className="text-mathtai-red hover:text-mathtai-red/70 transition"
                title="Remove file"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          <form onSubmit={sendMessage} className="flex space-x-3">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
            />
            <button
              type="button"
              onClick={handleFileUpload}
              className="p-3 text-mathtai-chalkboard hover:text-mathtai-green hover:bg-mathtai-tan/10 rounded-lg transition"
              title="Attach file"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about MATH 1228..."
              className="flex-1 border-2 border-mathtai-tan rounded-lg px-4 py-3 focus:outline-none focus:border-mathtai-green focus:ring-2 focus:ring-mathtai-green/20 text-gray-900"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-mathtai-chalkboard text-white px-6 py-3 rounded-lg hover:bg-mathtai-green focus:outline-none focus:ring-2 focus:ring-mathtai-green focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
