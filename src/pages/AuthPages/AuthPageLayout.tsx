import React from "react";
// import { Link } from "react-router-dom";

// export default function AuthLayout({ children }: { children: React.ReactNode }) {
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-white dark:bg-gray-900">
      <div className="flex h-screen w-full z-100">
        {/* Left Panel with Video */}
        <div className="hidden lg:flex w-6/10 items-center justify-center relative overflow-hidden">
          {/* Video Background */}
          <video
            className="absolute inset-0 w-full h-full  z-0"
            autoPlay
            loop
            muted
            playsInline
          >
            <source src="/videos/login/login2.mp4" type="video/mp4" />
          </video>

          {/* Glassy Overlay */}
          <div className="absolute inset-0 z-10 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-br from-[#3392741a] via-[#00d4ff1a] to-[#a3cd391a]" />
          </div>
        </div>

        {/* Right Panel (Auth Content) */}
        <div className="w-full lg:w-4/10 flex items-center justify-center bg-white dark:bg-gray-900 z-10">
          {children}
        </div>
      </div>
    </div>
  );
}

