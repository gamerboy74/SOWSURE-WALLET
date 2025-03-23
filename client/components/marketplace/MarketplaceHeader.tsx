import React, { useEffect, useRef, useCallback, useState } from "react";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface MarketplaceHeaderProps {
  onNewListing: () => void;
  page: number;
}

const customStyles = `
  .button-transition {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }
  .button-transition::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(45deg, transparent 0%, rgba(255,255,255,0.1) 100%);
    transform: translateX(-100%);
    transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .button-transition:hover::after {
    transform: translateX(0);
  }
`;

const MarketplaceHeader: React.FC<MarketplaceHeaderProps> = ({
  onNewListing,
  page,
}) => {
  const mountCount = useRef(0);
  const renderCount = useRef(0);
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    mountCount.current += 1;
    console.log(
      `MarketplaceHeader.tsx:57 MarketplaceHeader mounted, mount count: ${mountCount.current}`
    );
    return () => {
      console.log(
        `MarketplaceHeader.tsx:59 MarketplaceHeader unmounted, mount count: ${mountCount.current}`
      );
    };
  }, []);

  useEffect(() => {
    renderCount.current += 1;
    console.log(
      `MarketplaceHeader.tsx:150 MarketplaceHeader rendered, render count: ${renderCount.current}, page: ${page}`
    );
  }, [page]);

  const handleClick = useCallback(async () => {
    setIsLoading(true);
    try {
      await onNewListing();
      navigate("/create-listing"); // Adjust the route as needed
    } finally {
      setIsLoading(false);
    }
  }, [onNewListing, navigate]);

  return (
    <div className="flex justify-between items-center mb-8">
      <style>{customStyles}</style>
      <h1 className="text-2xl font-bold text-gray-900">
        <span className="text-emerald-600">Farm</span>Connect Marketplace
      </h1>
      <button
        onClick={handleClick}
        disabled={isLoading}
        className="button-transition bg-emerald-600 text-white px-6 py-2.5 rounded-lg hover:bg-emerald-500 
                 active:bg-emerald-700 transition-all duration-200 transform hover:scale-[1.02] 
                 active:scale-[0.98] shadow-sm hover:shadow-md font-medium 
                 flex items-center space-x-2 disabled:opacity-50"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <span>Post New Listing</span>
            <span className="text-emerald-200">+</span>
          </>
        )}
      </button>
    </div>
  );
};

export default React.memo(MarketplaceHeader);