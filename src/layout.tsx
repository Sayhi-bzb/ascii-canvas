import React from "react";

interface AppLayoutProps {
  statusBar: React.ReactNode;
  canvas: React.ReactNode;
  children: React.ReactNode;
}

export const AppLayout = ({ statusBar, canvas, children }: AppLayoutProps) => {
  return (
    <div className="w-screen h-screen flex flex-col bg-gray-50 relative overflow-hidden">
      <main className="flex-1 relative z-0">{canvas}</main>

      <footer className="absolute bottom-4 left-4 z-10">{statusBar}</footer>

      {/* This will hold the floating toolbar */}
      {children}
    </div>
  );
};
