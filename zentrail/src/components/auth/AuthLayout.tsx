import React from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      {/* Left Column - Static Background Image */}
      <div
        className="relative w-full md:w-1/2 h-64 sm:h-80 md:h-auto bg-[url('https://images.unsplash.com/photo-1507041957456-9c397ce39c97?auto=format&fit=crop&q=80&w=1920')] bg-cover bg-center bg-no-repeat"
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/40 z-10" />

        {/* Text Content */}
        <div className="relative z-20 flex flex-col justify-center h-full bg-gradient-to-r from-black/60 to-transparent p-6 sm:p-8 md:p-10 lg:p-16">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-cinzel font-bold text-white mb-4 sm:mb-6 md:mb-8 tracking-wide leading-none drop-shadow-2xl">
            Zentrail
          </h1>
          <div className="overflow-hidden">
            <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-cormorant italic text-white/95 max-w-xl leading-relaxed tracking-wide">
              Let nature lead,
            </p>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl font-tenor tracking-widest text-white/90 mt-1 md:mt-2">
              we'll guide the way.
            </p>
          </div>
        </div>
      </div>

      {/* Right Column - Auth Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center bg-light-primary p-4 sm:p-6 md:p-8 lg:p-12">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout; 