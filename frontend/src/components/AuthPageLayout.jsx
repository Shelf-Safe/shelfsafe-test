import React from "react";
import { ShelfSafeLogo } from "./ShelfSafeLogo";

export function AuthPageLayout({ children }) {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6 py-12">
      {}
      <div className="w-full max-w-[680px]">
        <div className="flex justify-center">
          <ShelfSafeLogo className="select-none" />
        </div>

        <div className="mt-10 sm:mt-12">{children}</div>
      </div>
    </div>
  );
}
