import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Star, User } from 'lucide-react';

interface UserCardProps {
  id: string;
  name: string;
  type: 'Farmer' | 'Buyer';
  image?: string;
  location: string;
  rating: number;
  description: string;
  stats: {
    label: string;
    value: string;
  }[];
}

function UserCard({ id, name, type, image, location, rating, description, stats }: UserCardProps) {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      <div className="p-6">
        <div className="flex items-center space-x-4">
          {image ? (
            <img
              src={image}
              alt={name}
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <User className="h-8 w-8 text-emerald-600" />
            </div>
          )}
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                type === 'Farmer' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {type}
              </span>
            </div>
            <div className="flex items-center mt-1 space-x-4">
              <div className="flex items-center text-gray-600">
                <MapPin className="h-4 w-4 mr-1" />
                <span className="text-sm">{location}</span>
              </div>
              <div className="flex items-center text-yellow-500">
                <Star className="h-4 w-4 fill-current" />
                <span className="ml-1 text-sm text-gray-600">{rating}</span>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-4 text-gray-600 text-sm line-clamp-2">{description}</p>

        <div className="mt-6 grid grid-cols-3 gap-4 py-4 border-t border-b">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <p className="text-lg font-semibold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <button
            onClick={() => navigate(`/profile/${type.toLowerCase()}/${id}`)}
            className="w-full bg-emerald-600 text-white py-2 px-4 rounded-md hover:bg-emerald-700 transition-colors"
          >
            View Profile
          </button>
        </div>
      </div>
    </div>
  );
}

export default UserCard;