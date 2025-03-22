import React, { useEffect, useRef, useCallback } from "react";

interface MarketplaceHeaderProps {
  onNewListing: () => void;
  page: number;
}

const MarketplaceHeader: React.FC<MarketplaceHeaderProps> = ({
  onNewListing,
  page,
}) => {
  const mountCount = useRef(0);
  const renderCount = useRef(0);

  useEffect(() => {
    mountCount.current += 1;
    console.log(
      `MarketplaceHeader.tsx:57 Marketplace mounted, mount count: ${mountCount.current}`
    );
    return () => {
      console.log(
        `MarketplaceHeader.tsx:59 Marketplace unmounted, mount count: ${mountCount.current}`
      );
    };
  }, []);

  useEffect(() => {
    renderCount.current += 1;
    console.log(
      `MarketplaceHeader.tsx:150 Marketplace rendered, render count: ${renderCount.current}, page: ${page}`
    );
  }, [page]);

  const handleClick = useCallback(() => {
    onNewListing();
  }, [onNewListing]);

  return (
    <div className="flex justify-between items-center mb-8">
      <h1 className="text-2xl font-bold text-gray-900">
        <span className="text-emerald-600">Farm</span>Connect Marketplace
      </h1>
      <button
        onClick={onNewListing}
        className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg hover:bg-emerald-500 
                 active:bg-emerald-700 transition-all duration-200 transform hover:scale-[1.02] 
                 active:scale-[0.98] shadow-sm hover:shadow-md font-medium 
                 flex items-center space-x-2"
      >
        <span>Post New Listing</span>
        <span className="text-emerald-200">+</span>
      </button>
    </div>
  );
};

export default React.memo(MarketplaceHeader);
