import React from 'react';
import { Star, MapPin, MessageCircle } from 'lucide-react';

interface ProfileHeaderProps {
  user: {
    id: string;
    name: string;
    type: string;
    image: string;
    location: string;
    rating: number;
    about: string;
  };
  onContact: () => void;
}

function ProfileHeader({ user, onContact }: ProfileHeaderProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-6">
          <img
            src={user.image}
            alt={user.name}
            className="h-24 w-24 rounded-full object-cover"
          />
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
              <div className="flex items-center text-yellow-400">
                <Star className="h-5 w-5 fill-current" />
                <span className="ml-1 text-gray-900">{user.rating}</span>
              </div>
            </div>
            <div className="flex items-center text-gray-500 mt-1">
              <MapPin className="h-4 w-4 mr-1" />
              <span>{user.location}</span>
            </div>
            <p className="mt-2 text-gray-600 max-w-2xl">{user.about}</p>
          </div>
        </div>
        <button 
          onClick={onContact}
          className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 flex items-center"
        >
          <MessageCircle className="h-5 w-5 mr-2" />
          Contact
        </button>
      </div>
    </div>
  );
}

export default ProfileHeader;