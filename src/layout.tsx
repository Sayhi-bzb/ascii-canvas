import React from "react";

interface AppLayoutProps {
  toolbar: React.ReactNode;
  actionBar: React.ReactNode;
  statusBar: React.ReactNode;
  canvas: React.ReactNode;
}

export const AppLayout = ({
  toolbar,
  actionBar,
  statusBar,
  canvas,
}: AppLayoutProps) => {
  return (
    <div className="w-screen h-screen flex flex-col bg-gray-50 relative overflow-hidden">
      <header className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
        {toolbar}
      </header>

      <aside className="absolute top-4 right-4 z-20">{actionBar}</aside>

      <main className="flex-1 relative z-0">{canvas}</main>

      <footer className="absolute bottom-4 left-4 z-10">{statusBar}</footer>
    </div>
  );
};
