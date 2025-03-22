import React, { useState } from 'react';
import { Search, Star, User } from 'lucide-react';
import ChatWindow from '../../components/chat/ChatWindow';

const mockChats = [
  {
    id: '1',
    user: {
      id: '101',
      name: 'John Smith',
      type: 'Buyer',
      image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=100',
      lastSeen: '2 mins ago'
    },
    lastMessage: {
      content: 'Hello, I\'m interested in your organic wheat listing.',
      timestamp: '2025-03-20T10:30:00Z',
      unread: true
    }
  },
  {
    id: '2',
    user: {
      id: '102',
      name: 'Alice Johnson',
      type: 'Farmer',
      image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100',
      lastSeen: 'online'
    },
    lastMessage: {
      content: 'The shipment will arrive tomorrow.',
      timestamp: '2025-03-20T09:15:00Z',
      unread: false
    }
  }
];

function Messages() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const currentUserId = '123'; // This would come from auth context

  const handleChatSelect = (chatId: string) => {
    setSelectedChat(chatId);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Chat List */}
      <div className="w-80 border-r bg-white">
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search messages..."
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-y-auto h-full">
          {mockChats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => handleChatSelect(chat.id)}
              className={`w-full p-4 flex items-start space-x-3 hover:bg-gray-50 ${
                selectedChat === chat.id ? 'bg-gray-50' : ''
              }`}
            >
              {chat.user.image ? (
                <img
                  src={chat.user.image}
                  alt={chat.user.name}
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="h-6 w-6 text-gray-500" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <h3 className="text-sm font-medium text-gray-900 truncate">
                    {chat.user.name}
                  </h3>
                  <span className="text-xs text-gray-500">
                    {new Date(chat.lastMessage.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                <p className="text-sm text-gray-500 truncate">{chat.lastMessage.content}</p>
                <div className="flex items-center mt-1">
                  <span className={`text-xs ${
                    chat.user.lastSeen === 'online' ? 'text-green-500' : 'text-gray-500'
                  }`}>
                    {chat.user.lastSeen}
                  </span>
                  {chat.lastMessage.unread && (
                    <span className="ml-2 h-2 w-2 bg-emerald-500 rounded-full"></span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Window or Empty State */}
      <div className="flex-1 bg-gray-50">
        {selectedChat ? (
          <ChatWindow
            chatId={selectedChat}
            currentUserId={currentUserId}
            otherUser={mockChats.find(chat => chat.id === selectedChat)!.user}
            onClose={() => setSelectedChat(null)}
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <User className="h-12 w-12 text-gray-400 mx-auto" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No chat selected</h3>
              <p className="mt-1 text-sm text-gray-500">
                Choose a conversation from the list to start messaging
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Messages;