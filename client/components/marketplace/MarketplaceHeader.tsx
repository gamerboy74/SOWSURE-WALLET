import React, { useEffect, useRef } from "react";

interface MarketplaceHeaderProps {
  page: number;
  siteName: string;
}

const MarketplaceHeader: React.FC<MarketplaceHeaderProps> = ({ page, siteName }) => {
  const mountCount = useRef(0);
  const renderCount = useRef(0);

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

  return (
    <div className="flex justify-between items-center mb-8">
      <h1 className="text-2xl font-bold text-gray-900">
        <span className="text-emerald-600">{siteName}</span> Marketplace
      </h1>
    </div>
  );
};

export default React.memo(MarketplaceHeader);